"""Morning market brief, built as a small RAG pipeline.

1. Ingest    pull overnight moves (yfinance) and fresh headlines (Google News RSS)
2. Index     embed each headline and store it in a local vector DB (Chroma)
3. Retrieve  for each market move, search the DB for headlines that could explain it
4. Augment   build one prompt per move with only that move's numbered headlines
5. Generate  a local LLM (Ollama) writes a subheaded section per move as JSON,
             then a headline sentence and a few other stories worth knowing

Output goes to brief.json: the sections, the sources, and everything needed to
show how it was made (queries, similarity scores, citations).
"""
import json
import os
import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import llm
import store
from headlines import get_headlines
from moves import get_moves

MARKET_TZ = ZoneInfo("America/New_York")
OUTPUT_PATH = os.environ.get("BRIEF_OUT", "output/brief.json")
RETRIEVE_DAYS = 3     # how far back the retriever can look
TOP_K = 4             # headlines retrieved per move
MAX_GENERAL = 8       # extra fresh headlines offered for "also worth knowing"

# Plain-English search text for each instrument. "Crude Oil fell" alone is a
# weak query; the words a news headline would actually use retrieve better.
SEARCH_HINTS = {
    "S&P 500": "S&P 500 US stocks Wall Street",
    "Nasdaq": "Nasdaq tech stocks",
    "10-Year Yield": "Treasury yields bond market",
    "USD/JPY": "yen dollar Bank of Japan",
    "Crude Oil": "oil prices crude OPEC",
    "Gold": "gold prices",
}

SECTION_SYSTEM = """You are a markets writer explaining one overnight market move to finance students.

Rules:
- Use only the numbered headlines you are given. Do not add facts, numbers, names or dates that are not in them.
- Put the headline number in square brackets after each claim, like [3].
- Do not repeat the price or the percentage move. The page already shows them.
- Explain why it moved and what traders are watching, in plain language.
- If none of the headlines explain the move, say that no clear catalyst appeared in the news.

Reply in JSON with:
"headline": a subheading of at most 8 words, no brackets
"body": two or three sentences with citations"""

SECTION_SCHEMA = {
    "type": "object",
    "properties": {"headline": {"type": "string"}, "body": {"type": "string"}},
    "required": ["headline", "body"],
}

OVERVIEW_SYSTEM = """You write the top of a morning markets note.

Rules:
- "lede": one sentence of at most 35 words that sums up the session, based only on the section summaries given. No brackets.
- "also": pick up to three of the numbered extra headlines that matter to markets and were not covered above. For each, give its number as "n" and one sentence on why it matters, using only what the headline says, ending with its citation like [7].

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


# ---------- 3. Retrieve ----------

def retrieve_for_moves(moves):
    log = []
    for name, m in moves.items():
        direction = "rise" if m["pct"] > 0 else "fall" if m["pct"] < 0 else "hold steady"
        query = f"Why did {SEARCH_HINTS.get(name, name)} {direction}"
        hits = store.search(query, k=TOP_K, days=RETRIEVE_DAYS)
        log.append({"move": name, "query": query, "hits": hits})
    return log


# ---------- 4. Augment ----------

def number_sources(retrieval_log, fresh_headlines):
    """Give every unique source one number, shared across all moves."""
    sources, index = [], {}

    def add(doc):
        if doc["id"] not in index:
            index[doc["id"]] = len(sources) + 1
            sources.append({
                "n": index[doc["id"]],
                "title": doc["title"],
                "source": doc["source"],
                "link": doc["link"],
                "snippet": doc.get("snippet", ""),
                "published": doc["published"] if isinstance(doc["published"], str)
                             else doc["published"].isoformat(),
            })
        return index[doc["id"]]

    for entry in retrieval_log:
        for hit in entry["hits"]:
            hit["n"] = add(hit)
    for h in fresh_headlines[:MAX_GENERAL]:
        add(h)
    return sources


def _fmt_time(iso):
    return datetime.fromisoformat(iso).astimezone(MARKET_TZ).strftime("%b %d %I:%M %p ET")


def _source_line(s):
    line = f"[{s['n']}] {s['source']}, {_fmt_time(s['published'])}: {s['title']}"
    return line + (f"\n    {s['snippet']}" if s.get("snippet") else "")


def section_prompt(name, m, sources):
    verb = "rose" if m["pct"] > 0 else "fell" if m["pct"] < 0 else "was flat"
    return (f"Move: {name} {verb} {abs(m['pct'])}% to {m['last']}.\n\n"
            "Headlines:\n" + "\n".join(_source_line(s) for s in sources) +
            "\n\nWrite the subheading and body.")


# ---------- 5. Generate ----------

def write_section(entry, m, by_n):
    """One focused LLM call per move, with only the headlines retrieved for it."""
    section = {"move": entry["move"], "pct": m["pct"], "last": m["last"], "change": m["change"],
               "sources": [h["n"] for h in entry["hits"]]}
    if not entry["hits"]:
        # Nothing passed the similarity cutoff, so don't ask the model to guess
        section.update(headline="No clear catalyst in the news",
                       body="None of the stored headlines were close enough to this move to explain it.")
        return section
    out = llm.generate(SECTION_SYSTEM, section_prompt(entry["move"], m, [by_n[n] for n in section["sources"]]),
                       schema=SECTION_SCHEMA)
    section["headline"] = out["headline"].strip().rstrip(".")
    section["body"] = out["body"].strip()
    return section


def write_overview(sections, sources):
    covered = {n for s in sections for n in s["sources"]}
    extras = [s for s in sources if s["n"] not in covered] or sources
    prompt = ("Section summaries:\n" +
              "\n".join(f"- {s['move']} ({'+' if s['pct'] >= 0 else ''}{s['pct']}%): {s['headline']}. {s['body']}"
                        for s in sections) +
              "\n\nExtra headlines:\n" + "\n".join(_source_line(s) for s in extras))
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


def as_text(lede, sections, also):
    """Plain-text version, used by the site's terminal and the console report."""
    parts = [lede, ""]
    for s in sections:
        sign = "+" if s["pct"] >= 0 else ""
        parts.append(f"{s['move']} ({sign}{s['pct']}% to {s['last']}): {s['headline']}. {s['body']}")
    if also:
        parts += ["", "Also worth knowing:"] + [f"- {a['note']}" for a in also]
    return "\n".join(parts)


def build_brief():
    today = datetime.now(MARKET_TZ).strftime("%A, %B %d")

    # 1. Ingest
    moves = get_moves()
    fresh = get_headlines()

    # 2. Index
    added = store.add_headlines(fresh)
    store.prune()

    # 3. Retrieve
    retrieval_log = retrieve_for_moves(moves)

    # 4. Augment
    sources = number_sources(retrieval_log, fresh)
    by_n = {s["n"]: s for s in sources}

    # 5. Generate: one section per move, then the headline sentence
    sections = []
    for entry in retrieval_log:
        print(f"Writing {entry['move']}...")
        sections.append(write_section(entry, moves[entry["move"]], by_n))
    print("Writing the headline...")
    lede, also = write_overview(sections, sources)

    text = as_text(lede, sections, also)
    cited, invalid = check_citations(text, len(sources))

    return {
        "date": today,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": llm.LLM_MODEL,
        "embed_model": llm.EMBED_MODEL,
        "lede": lede,
        "sections": sections,
        "also": also,
        "brief": text,
        "moves": moves,
        "sources": sources,
        "cited": cited,
        "invalid_citations": invalid,
        "example_prompt": section_prompt(sections[0]["move"], moves[sections[0]["move"]],
                                         [by_n[n] for n in sections[0]["sources"]]) if sections and sections[0]["sources"] else "",
        "retrieval": [
            {"move": e["move"], "query": e["query"],
             "hits": [{"n": h["n"], "similarity": h["similarity"]} for h in e["hits"]]}
            for e in retrieval_log
        ],
        "stats": {
            "headlines_fetched": len(fresh),
            "headlines_new": added,
            "index_size": store.count(),
            "llm_calls": sum(1 for s in sections if s["sources"]) + 1,
        },
    }


def print_report(result):
    by_n = {s["n"]: s for s in result["sources"]}
    print(f"\n=== Morning Market Brief: {result['date']} ===\n")
    print(result["brief"])
    print("\n--- How it was made ---")
    st = result["stats"]
    print(f"Fetched {st['headlines_fetched']} headlines ({st['headlines_new']} new), "
          f"index now holds {st['index_size']}. {st['llm_calls']} LLM calls.")
    for e in result["retrieval"]:
        print(f"\n{e['move']}  query: \"{e['query']}\"")
        if not e["hits"]:
            print("   no relevant headlines found")
        for h in e["hits"]:
            s = by_n[h["n"]]
            print(f"   [{h['n']}] {h['similarity']:.2f}  {s['source']}: {s['title'][:80]}")
    print(f"\nCited: {result['cited'] or 'none'}")
    if result["invalid_citations"]:
        print(f"WARNING: cited sources that don't exist: {result['invalid_citations']}")


if __name__ == "__main__":
    result = build_brief()
    os.makedirs(os.path.dirname(OUTPUT_PATH) or ".", exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print_report(result)
    print(f"\nSaved to {OUTPUT_PATH}")
