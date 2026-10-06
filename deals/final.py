"""Deals aggregator, built as a small RAG pipeline.

1. Ingest    pull fresh M&A headlines (Google News RSS)
2. Index     embed each headline and store it in a local vector DB (Chroma)
3. Detect    the model pulls buyer, target and stage out of each headline; code checks
             the names are really in the text and groups headlines about the same deal
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

DEAL_SYSTEM = """You are an M&A news writer giving a finance student the latest on one deal.

Rules:
- Use only the numbered headlines you are given. Do not add facts, numbers, names or dates that are not in them.
- Some headlines may be about other deals involving the same companies. Ignore those.
- Put the headline number in square brackets after each claim, like [3].
- Say what the deal is, where it stands, and what happens next if the headlines say so. Plain language, no hype.
- "stage" must reflect the newest headlines.
- If the headlines say nothing new, say that.

Reply in JSON with:
"headline": a subheading of at most 8 words, no brackets
"stage": one of Rumored, Announced, Pending approval, Completed, Terminated
"body": two or three sentences with citations"""

DEAL_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "stage": {"type": "string", "enum": extract.STAGES},
        "body": {"type": "string"},
    },
    "required": ["headline", "stage", "body"],
}

OVERVIEW_SYSTEM = """You write the top of a daily M&A note.

Rules:
- "lede": one sentence of at most 35 words that sums up today's deal news, based only on the deal summaries given. No brackets.
- "also": pick up to three of the numbered extra headlines that report a deal not covered above. For each, give its number as "n" and one sentence on what it says, using only what the headline says, ending with its citation like [7].

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
    # keep only the ones that actually name one of the two companies
    hits = [h for h in hits
            if extract.appears(deal["acquirer"], h["title"] + " " + h["snippet"])
            or extract.appears(deal["target"], h["title"] + " " + h["snippet"])]
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


def _fmt_time(value):
    return datetime.fromisoformat(iso(value)).astimezone(MARKET_TZ).strftime("%b %d %I:%M %p ET")


def _source_line(s):
    line = f"[{s['n']}] {s['source']}, {_fmt_time(s['published'])}: {s['title']}"
    return line + (f"\n    {s['snippet']}" if s.get("snippet") else "")


def deal_prompt(deal, sources):
    return (f"Deal: {deal['acquirer']} and {deal['target']}.\n\n"
            "Headlines:\n" + "\n".join(_source_line(s) for s in sources) +
            "\n\nWrite the subheading, stage and body.")


# ---------- 6. Generate ----------

def write_deal(deal, by_n, numbers):
    """One focused LLM call per deal, with only the headlines gathered for it."""
    out = {
        "acquirer": deal["acquirer"], "target": deal["target"], "value": deal["value"],
        "pinned": deal["pinned"], "stage": deal["stage"],
        "articles": len(deal["idxs"]), "outlets": deal["outlets"],
        "latest": iso(deal["latest"]) if deal["latest"] else None,
        "sources": numbers,
    }
    if not numbers:
        out.update(headline="No recent coverage",
                   body="None of the stored headlines mention this deal, so there is nothing new to report.")
        return out
    reply = llm.generate(DEAL_SYSTEM, deal_prompt(deal, [by_n[n] for n in numbers]), schema=DEAL_SCHEMA)
    out["headline"] = reply["headline"].strip().rstrip(".")
    out["body"] = reply["body"].strip()
    if reply.get("stage") in extract.STAGES:
        out["stage"] = reply["stage"]
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
    also = [{"n": a["n"], "note": a["note"].strip()} for a in out.get("also", []) if a.get("n") in valid][:3]
    return out["lede"].strip(), also


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
    records, extraction_calls = extract.extract_deals(fresh)
    groups = extract.group_deals(records, fresh, load_pins())
    deals = extract.rank_deals(groups, MAX_DEALS)

    # 4. Retrieve, and 5. Augment
    numberer = Numberer()
    retrieval, prompt_numbers = [], []
    for d in deals:
        query, hits = retrieve_for_deal(d)
        docs = prompt_docs(d, fresh, hits)
        numbers = [numberer.add(doc) for doc in docs]
        for h in hits:
            numberer.add(h)
        retrieval.append({
            "deal": f"{d['acquirer']} / {d['target']}", "query": query,
            "hits": [{"n": numberer.index[h["id"]], "similarity": h["similarity"]} for h in hits],
        })
        prompt_numbers.append(numbers)
    # A few fresh headlines that weren't used for any deal, for "also worth knowing"
    general = []
    for h in fresh:
        if len(general) >= MAX_GENERAL:
            break
        if h["id"] not in numberer.index:
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
