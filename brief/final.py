"""Morning market brief, built as a small RAG pipeline.

1. Ingest    pull overnight moves (yfinance) and fresh headlines (Google News RSS)
2. Index     embed each headline and store it in a local vector DB (Chroma)
3. Retrieve  for each market move, search the DB for headlines that could explain it
4. Augment   put the moves and the retrieved headlines, numbered, into the prompt
5. Generate  a local LLM (Ollama) writes the brief and cites sources by number

Output goes to brief.json: the brief itself plus everything needed to show
how it was made (queries, retrieved sources, similarity scores, citations).
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
MAX_GENERAL = 6       # extra fresh headlines added as general context

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

SYSTEM_PROMPT = """You write a short morning market brief for finance students.

Rules:
- Use only the market data and numbered news sources you are given.
- When you say why something moved, cite the source number in square brackets, like [3].
- If none of the sources explain a move, say there was no clear catalyst in the news. Do not guess.
- Never invent numbers, events, people or quotes.
- Plain text. No markdown headings, no bold, no bullet symbols other than "-"."""


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


def build_prompt(moves, retrieval_log, sources, today):
    move_lines = []
    for entry in retrieval_log:
        m = moves[entry["move"]]
        sign = "+" if m["pct"] >= 0 else ""
        refs = ", ".join(f"[{h['n']}]" for h in entry["hits"]) or "none"
        move_lines.append(f"- {entry['move']}: {sign}{m['pct']}% to {m['last']} "
                          f"(possibly related sources: {refs})")

    source_lines = [f"[{s['n']}] {_fmt_time(s['published'])} | {s['source']} | {s['title']}"
                    for s in sources]

    return f"""Date: {today}

Overnight market moves:
{chr(10).join(move_lines) or "- No market data available."}

News sources:
{chr(10).join(source_lines) or "- No sources retrieved."}

Write the brief in three parts:
1. One or two sentences on the overall tone of markets.
2. One line per instrument: what it did and, only if a source supports it, why.
3. Up to three other headlines worth knowing, with citations.
Keep it under 250 words."""


# ---------- 5. Generate + check ----------

def check_citations(text, n_sources):
    """Which sources did the model actually cite, and did it cite any that don't exist?"""
    cited = set()
    for group in re.findall(r"\[(\d+(?:\s*,\s*\d+)*)\]", text):
        cited.update(int(x) for x in group.split(","))
    valid = sorted(n for n in cited if 1 <= n <= n_sources)
    invalid = sorted(n for n in cited if not 1 <= n <= n_sources)
    return valid, invalid


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
    prompt = build_prompt(moves, retrieval_log, sources, today)

    # 5. Generate
    text = llm.generate(SYSTEM_PROMPT, prompt)
    cited, invalid = check_citations(text, len(sources))

    return {
        "date": today,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": llm.LLM_MODEL,
        "embed_model": llm.EMBED_MODEL,
        "brief": text,
        "moves": moves,
        "sources": sources,
        "cited": cited,
        "invalid_citations": invalid,
        "retrieval": [
            {"move": e["move"], "query": e["query"],
             "hits": [{"n": h["n"], "similarity": h["similarity"]} for h in e["hits"]]}
            for e in retrieval_log
        ],
        "stats": {
            "headlines_fetched": len(fresh),
            "headlines_new": added,
            "index_size": store.count(),
        },
    }


def print_report(result):
    by_n = {s["n"]: s for s in result["sources"]}
    print(f"\n=== Morning Market Brief: {result['date']} ===\n")
    print(result["brief"])
    print("\n--- How it was made ---")
    st = result["stats"]
    print(f"Fetched {st['headlines_fetched']} headlines ({st['headlines_new']} new), "
          f"index now holds {st['index_size']}.")
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
