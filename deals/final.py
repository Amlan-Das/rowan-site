"""Deals aggregator, built as a small RAG pipeline.

1. Ingest    pull fresh M&A headlines (Google News RSS)
2. Index     embed each headline and store it in a local vector DB (Chroma)
3. Detect    the model pulls buyer and target out of each headline; code checks the names
             and the deal value are really in the text, groups headlines about the same
             deal and decides its stage from the words the headlines use
4. Retrieve  for each deal, search the DB for more coverage of it, back up to a month
5. Augment   build one prompt per deal with only that deal's numbered headlines
6. Generate  a local LLM (Ollama) writes a short update per deal as JSON, then a one
             sentence summary of the day and a few other stories worth knowing

To always include a deal, put it in watchlist.json:
    {"pinned": [{"acquirer": "Buyer Corp", "target": "Target Inc"}]}
Pinned deals show up even on days with no new headlines about them.

Output goes to deals.json: the deals, the sources, and everything needed to show
how it was made (queries, similarity scores, citations).
"""
import json
import os
import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import extract
import llm
import store
from headlines import get_headlines

MARKET_TZ = ZoneInfo("America/New_York")
OUTPUT_PATH = os.environ.get("DEALS_OUT", "output/deals.json")
PIN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "watchlist.json")
RETRIEVE_DAYS = 30    # how far back the retriever can look
TOP_K = 6             # headlines retrieved per deal
MAX_PROMPT = 8        # most headlines put in one deal's prompt
MAX_DEALS = 8         # deals shown on the page
MAX_GENERAL = 8       # extra fresh headlines offered for "also worth knowing"
MAX_READ = 100        # most headlines the model reads for deals in one run (newest first)

DEAL_SYSTEM = """You are an M&A news writer giving a finance student the latest on one deal.

Rules:
- Use only the numbered headlines you are given. Do not add facts, numbers, names, dates or deal values that are not in them.
- Some headlines may be about other deals involving the same companies. Ignore those.
- Write two to four short sentences. For each one, list the numbers of the headlines that say it. Use only the numbers you are given.
- The "Stage" line says where the deal stands. Write so that your text agrees with it.
- Say what the deal is, where it stands, and what happens next if the headlines say so. Plain language, no hype.
- If the headlines say nothing new, say that.

Reply in JSON with:
"headline": a subheading of at most 8 words, no brackets
"sentences": a list of {"text": one sentence, "sources": [headline numbers that say it]}"""

DEAL_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "sentences": {
            "type": "array", "minItems": 2, "maxItems": 4,
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "sources": {"type": "array", "items": {"type": "integer"}, "minItems": 1, "maxItems": 3},
                },
                "required": ["text", "sources"],
            },
        },
    },
    "required": ["headline", "sentences"],
}

OVERVIEW_SYSTEM = """You write the top of a daily M&A note.

Rules:
- "lede": one sentence of at most 35 words that sums up today's deal news, based only on the deal summaries given. No brackets.
- "also": pick up to three of the numbered extra headlines that report a deal between two companies. For each, give its number as "n" and one sentence on what it says, using only what the headline says, ending with its citation like [7].

Reply in JSON."""

OVERVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "lede": {"type": "string"},
        "also": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"n": {"type": "integer"}, "note": {"type": "string"}},
                "required": ["n", "note"],
            },
        },
    },
    "required": ["lede", "also"],
}


def load_pins(path=None):
    try:
        with open(path or PIN_FILE, encoding="utf-8") as f:
            pins = json.load(f).get("pinned", [])
    except (OSError, ValueError):
        return []
    return [{"acquirer": p["acquirer"].strip(), "target": p["target"].strip(), "pinned": True}
            for p in pins if p.get("acquirer") and p.get("target")]


def iso(value):
    return value if isinstance(value, str) else value.isoformat()


# ---------- 4. Retrieve ----------

def retrieve_for_deal(deal):
    """Search the vector store for coverage of one deal, in the words a headline would use."""
    query = f"{deal['acquirer']} {deal['target']} acquisition merger deal"
    hits = store.search(query, k=TOP_K, days=RETRIEVE_DAYS)
    # Any merger headline sounds a bit like this deal to the embedding model, so
    # keep only the ones that actually name the companies. A headline that names
    # both is the same deal; one that names a single company (a common word like
    # "Fathom") may be a different deal, so those only fill in when few name both.
    def names(h, who):
        return extract.appears(deal[who], h["title"] + " " + h["snippet"])
    both = [h for h in hits if names(h, "acquirer") and names(h, "target")]
    hits = both if len(both) >= 2 else [h for h in hits if names(h, "acquirer") or names(h, "target")]
    return query, hits


# ---------- 5. Augment ----------

class Numberer:
    """Give every unique source one number, shared across all deals."""

    def __init__(self):
        self.sources, self.index = [], {}

    def add(self, doc):
        if doc["id"] not in self.index:
            self.index[doc["id"]] = len(self.sources) + 1
            self.sources.append({
                "n": self.index[doc["id"]],
                "title": doc["title"],
                "source": doc["source"],
                "link": doc["link"],
                "snippet": doc.get("snippet", ""),
                "published": iso(doc["published"]),
            })
        return self.index[doc["id"]]


def prompt_docs(deal, headlines, hits):
    """The headlines that go in this deal's prompt: the ones that revealed the deal, then the retrieved ones."""
    docs, seen = [], set()
    for h in [headlines[i] for i in deal["idxs"]] + hits:
        if h["id"] in seen:
            continue
        seen.add(h["id"])
        docs.append(h)
        if len(docs) >= MAX_PROMPT:
            break
    return docs


def deal_stage(docs, fallback):
    """Where the deal stands, from every headline gathered for it, newest first.

    The fresh headlines alone can miss a turn the search found, such as a deal
    that was called off in a story the extraction read as a different pair.
    """
    newest_first = sorted(docs, key=lambda h: datetime.fromisoformat(iso(h["published"])), reverse=True)
    return extract.decide_stage([f"{h['title']} {h.get('snippet', '')}" for h in newest_first], fallback)


def _fmt_time(value):
    return datetime.fromisoformat(iso(value)).astimezone(MARKET_TZ).strftime("%b %d %I:%M %p ET")


def _source_line(s):
    line = f"[{s['n']}] {s['source']}, {_fmt_time(s['published'])}: {s['title']}"
    return line + (f"\n    {s['snippet']}" if s.get("snippet") else "")


def deal_prompt(deal, sources):
    stage = (f"Stage: {deal['stage']}." if deal["stage"] in extract.STAGES else
             "Stage: nothing new in the last three days. Say what the older headlines report, and that there is no fresh news.")
    return (f"Deal: {deal['acquirer']} and {deal['target']}.\n{stage}\n\n"
            "Headlines:\n" + "\n".join(_source_line(s) for s in sources) +
            "\n\nWrite the subheading and sentences.")


# ---------- 6. Generate ----------

def clean_body(body, allowed):
    """Keep only real citations to this deal's own headlines.

    Drops bracketed text that isn't a citation (a small model sometimes writes
    "[missing date]") and citations to headlines that aren't in this deal's
    prompt. Returns the cleaned text and the citation numbers that were removed.
    """
    removed = set()

    def fix(m):
        inner = m.group(1).strip()
        if not re.fullmatch(r"\d+(?:\s*,\s*\d+)*", inner):
            return ""
        nums = [int(x) for x in re.split(r"\s*,\s*", inner)]
        removed.update(n for n in nums if n not in allowed)
        keep = [n for n in nums if n in allowed]
        return "[" + ", ".join(map(str, keep)) + "]" if keep else ""

    body = re.sub(r"\[([^\]]*)\]", fix, body)
    body = re.sub(r"\s+([.,;])", r"\1", body)
    return re.sub(r"\s{2,}", " ", body).strip(), sorted(removed)


def assemble_body(sentences, allowed):
    """Turn the model's sentences and their source numbers into text with citations.

    The citations come from the model's list, not from brackets it typed. A
    number that isn't one of this deal's headlines is removed, and a sentence
    left with no valid source is dropped: no source, no claim. Returns the text
    and the numbers that were removed.
    """
    parts, removed = [], set()
    for sent in sentences or []:
        text = re.sub(r"\[[^\]]*\]", "", str(sent.get("text", ""))).strip().rstrip(".!? ")
        nums = []
        for n in sent.get("sources") or []:
            if isinstance(n, int) and n in allowed:
                if n not in nums:
                    nums.append(n)
            elif isinstance(n, int):
                removed.add(n)
        if text and nums:
            parts.append(f"{text} [{', '.join(map(str, nums))}].")
    return " ".join(parts), sorted(removed)


def write_deal(deal, by_n, numbers):
    """One focused LLM call per deal, with only the headlines gathered for it."""
    out = {
        "acquirer": deal["acquirer"], "target": deal["target"], "value": deal["value"],
        "pinned": deal["pinned"], "stage": deal["stage"],
        "articles": len(deal["idxs"]), "outlets": deal["outlets"],
        "latest": iso(deal["latest"]) if deal["latest"] else None,
        "sources": numbers, "stripped": [],
    }
    if not numbers:
        out.update(headline="No recent coverage",
                   body="None of the stored headlines mention this deal, so there is nothing new to report.")
        return out
    reply = llm.generate(DEAL_SYSTEM, deal_prompt(deal, [by_n[n] for n in numbers]), schema=DEAL_SCHEMA)
    out["headline"] = re.sub(r"\[[^\]]*\]", "", reply["headline"]).strip().rstrip(".")
    out["body"], out["stripped"] = assemble_body(reply["sentences"], set(numbers))
    if not out["body"]:
        out["body"] = "The headlines gathered for this deal are listed in the sources, but none of the model's sentences could be traced to them."
    return out


def write_overview(deals, extras):
    if not deals:
        return "No deals could be pulled out of the headlines in this run, so only the stories themselves are listed.", []
    prompt = ("Deal summaries:\n" +
              "\n".join(f"- {d['acquirer']} and {d['target']} ({d['stage']}): {d['headline']}. {d['body']}" for d in deals))
    if extras:
        prompt += "\n\nExtra headlines:\n" + "\n".join(_source_line(s) for s in extras)
    out = llm.generate(OVERVIEW_SYSTEM, prompt, schema=OVERVIEW_SCHEMA)
    valid = {s["n"] for s in extras}
    also = []
    for a in out.get("also", []):
        n, note = a.get("n"), (a.get("note") or "").strip()
        if n not in valid or not note or any(x["n"] == n for x in also):
            continue
        # The sentence has to carry its own citation, whatever the model did
        note, _ = clean_body(note, {n})
        also.append({"n": n, "note": note if f"[{n}]" in note else f"{note.rstrip('.')} [{n}]."})
    return out["lede"].strip(), also[:3]


def check_citations(text, n_sources):
    """Which sources did the model actually cite, and did it cite any that don't exist?"""
    cited = set()
    for group in re.findall(r"\[(\d+(?:\s*,\s*\d+)*)\]", text):
        cited.update(int(x) for x in group.split(","))
    valid = sorted(n for n in cited if 1 <= n <= n_sources)
    invalid = sorted(n for n in cited if not 1 <= n <= n_sources)
    return valid, invalid


def as_text(lede, deals, also):
    """Plain-text version for the console report."""
    parts = [lede, ""]
    for d in deals:
        parts.append(f"{d['acquirer']} / {d['target']} ({d['stage']}): {d['headline']}. {d['body']}")
    if also:
        parts += ["", "Also worth knowing:"] + [f"- {a['note']}" for a in also]
    return "\n".join(parts)


def build_deals():
    today = datetime.now(MARKET_TZ).strftime("%A, %B %d")

    # 1. Ingest
    fresh = get_headlines()
    if not fresh:
        # Don't overwrite yesterday's good page with an empty one
        raise SystemExit("No headlines came back, so the previous deals.json stays as it is.")

    # 2. Index
    added = store.add_headlines(fresh)
    store.prune()

    # 3. Detect
    print(f"Reading {len(fresh)} headlines for deals...")
    records, extraction_calls = extract.extract_deals(fresh[:MAX_READ])
    groups = extract.group_deals(records, fresh, load_pins())
    deals = extract.rank_deals(groups, MAX_DEALS, fresh)

    # 4. Retrieve, and 5. Augment
    numberer = Numberer()
    retrieval, prompt_numbers = [], []
    for d in deals:
        query, hits = retrieve_for_deal(d)
        docs = prompt_docs(d, fresh, hits)
        if d["idxs"]:
            d["stage"] = deal_stage(docs, d["stage"])
        numbers = [numberer.add(doc) for doc in docs]
        for h in hits:
            numberer.add(h)
        retrieval.append({
            "deal": f"{d['acquirer']} / {d['target']}", "query": query,
            "hits": [{"n": numberer.index[h["id"]], "similarity": h["similarity"]} for h in hits],
        })
        prompt_numbers.append(numbers)
    # A few fresh headlines that weren't used for any deal, for "also worth knowing"
    def about_a_shown_deal(h):
        return any(extract.mentions(d["acquirer"], h["title"]) or extract.mentions(d["target"], h["title"]) for d in deals)
    general = []
    for h in fresh:
        if len(general) >= MAX_GENERAL:
            break
        if h["id"] not in numberer.index and not about_a_shown_deal(h):
            general.append(numberer.add(h))
    sources = numberer.sources
    by_n = {s["n"]: s for s in sources}

    # 6. Generate: one section per deal, then the summary sentence
    written = []
    for d, numbers in zip(deals, prompt_numbers):
        print(f"Writing {d['acquirer']} / {d['target']}...")
        w = write_deal(d, by_n, numbers)
        w["found"] = [{"n": numberer.index[fresh[r["idx"]]["id"]], "acquirer": r["acquirer"],
                       "target": r["target"], "stage": r["stage"]}
                      for r in d["records"] if fresh[r["idx"]]["id"] in numberer.index]
        written.append(w)
    print("Writing the summary...")
    lede, also = write_overview(written, [by_n[n] for n in general])

    text = as_text(lede, written, also)
    cited, invalid = check_citations(text, len(sources))
    # Citations the model made to headlines outside the deal's own prompt were removed above; they still count as invented
    invalid = sorted(set(invalid) | {n for w in written for n in w["stripped"]})
    first = next((i for i, n in enumerate(prompt_numbers) if n), None)

    return {
        "date": today,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": llm.LLM_MODEL,
        "embed_model": llm.EMBED_MODEL,
        "lede": lede,
        "deals": written,
        "also": also,
        "brief": text,
        "sources": sources,
        "cited": cited,
        "invalid_citations": invalid,
        "example_prompt": deal_prompt(deals[first], [by_n[n] for n in prompt_numbers[first]]) if first is not None else "",
        "retrieval": retrieval,
        "stats": {
            "headlines_fetched": len(fresh),
            "headlines_new": added,
            "index_size": store.count(),
            "deals_found": len(groups),
            "deals_shown": len(written),
            "extraction_calls": extraction_calls,
            "llm_calls": extraction_calls + sum(1 for n in prompt_numbers if n) + (1 if written else 0),
        },
    }


def print_report(result):
    by_n = {s["n"]: s for s in result["sources"]}
    print(f"\n=== Deals brief: {result['date']} ===\n")
    print(result["brief"])
    print("\n--- How it was made ---")
    st = result["stats"]
    print(f"Fetched {st['headlines_fetched']} headlines ({st['headlines_new']} new), index now holds {st['index_size']}. "
          f"Found {st['deals_found']} deals, showing {st['deals_shown']}. {st['llm_calls']} LLM calls.")
    for e in result["retrieval"]:
        print(f"\n{e['deal']}  query: \"{e['query']}\"")
        if not e["hits"]:
            print("   no relevant headlines found")
        for h in e["hits"]:
            s = by_n[h["n"]]
            print(f"   [{h['n']}] {h['similarity']:.2f}  {s['source']}: {s['title'][:80]}")
    print(f"\nCited: {result['cited'] or 'none'}")
    if result["invalid_citations"]:
        print(f"WARNING: cited sources that don't exist: {result['invalid_citations']}")


if __name__ == "__main__":
    result = build_deals()
    os.makedirs(os.path.dirname(OUTPUT_PATH) or ".", exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print_report(result)
    print(f"\nSaved to {OUTPUT_PATH}")
