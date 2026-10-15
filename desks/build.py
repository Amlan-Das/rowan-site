"""Industry desks, run on their own schedule so they can read a lot more news than the morning brief.

For each desk in topics.py:
1. Search    each topic runs several Google News searches over the last week
2. Filter    a headline stays only if it names the topic, and each story is kept once per desk
3. Write     a local LLM (Ollama) writes two or three sentences per topic from only those headlines
4. Check     a sentence is dropped unless it cites real headlines, its numbers appear in them and
            most of its words do too

Output goes to industries.json, which brief.html shows as one dropdown per topic under each desk.
The morning brief (brief/) is untouched and still writes the short note at the top of each desk.

    python build.py              all desks
    python build.py --desk mining
    python build.py --no-llm     headlines only, no summaries
"""
import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "brief"))  # reuse the brief's Google News and Ollama helpers

import industries  # noqa: E402  (brief/industries.py, for the desk names)
import llm  # noqa: E402
from headlines import fetch_headlines  # noqa: E402
from topics import TOPICS  # noqa: E402

OUT = Path(os.environ.get("DESKS_OUT", HERE.parent / "industries.json"))
LOOKBACK_DAYS = 7
PER_QUERY = 12    # headlines read from each search
PER_TOPIC = 8     # headlines kept per topic
PER_NOTE = 6      # most headlines one summary is written from
PAUSE = 0.4       # seconds between searches, to be polite to Google

SYSTEM = """You are a markets writer covering {industry} for finance students. The topic is: {topic}.

Rules:
- Use only the numbered headlines you are given. Restate what they say. Do not explain causes, effects or background unless a headline says it.
- Do not add facts, numbers, names or dates that are not in them. No guessing, and no filler like "closely watched" or "significant impact".
- Draw on at least two different headlines when they cover different points.
- Ignore any headline that is not about {topic} in {industry}.
- Do not quote prices or percentage moves.

Reply in JSON with:
"headline": a subheading of at most 8 words about the topic as a whole, not about one company
"sentences": two or three sentences. For each one, "text" is the sentence with no brackets, and "sources" lists the numbers of the headlines it comes from."""

SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "sentences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"text": {"type": "string"},
                               "sources": {"type": "array", "items": {"type": "integer"}}},
                "required": ["text", "sources"],
            },
        },
    },
    "required": ["headline", "sentences"],
}


def norm(title):
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def on_topic(keywords, text):
    return any(re.search(r"\b" + re.escape(k), text, re.I) for k in keywords)


def collect(topics):
    """Search every topic and return its headlines, numbered across the whole desk."""
    seen, n, out = set(), 0, []
    for t in topics:
        found = []
        for q in t["queries"]:
            try:
                found += fetch_headlines(f"{q} when:{LOOKBACK_DAYS}d", limit=PER_QUERY,
                                         lookback_hours=24 * LOOKBACK_DAYS)
            except Exception as e:  # one bad search should not sink the desk
                print(f"  search failed for '{q}': {e}", file=sys.stderr)
            time.sleep(PAUSE)
        found.sort(key=lambda h: h["published"], reverse=True)
        items = []
        for h in found:
            key = norm(h["title"])
            if key in seen or not on_topic(t["keywords"], h["title"] + " " + h.get("snippet", "")):
                continue
            seen.add(key)
            n += 1
            items.append({
                "n": n,
                "title": h["title"],
                "source": h["source"],
                "link": h["link"],
                "published": h["published"].astimezone(timezone.utc).isoformat(timespec="seconds"),
                "snippet": h.get("snippet", ""),
            })
            if len(items) >= PER_TOPIC:
                break
        out.append({"label": t["label"], "items": items, "summary": None})
    return out


def numbers(text):
    return set(re.findall(r"\d[\d,.]*\d|\d", text))


STOP = {"that", "this", "with", "from", "have", "been", "were", "will", "their", "which", "about", "into",
        "more", "than", "also", "such", "some", "when", "while", "other", "being", "could", "would", "there"}


def grounded(text, titles, floor=0.7):
    """Most of a sentence's content words must appear (by their first five letters) in the headlines it cites."""
    stems = lambda t: {w[:5] for w in re.findall(r"[a-z]{4,}", t.lower()) if w not in STOP}
    mine = stems(text)
    return not mine or len(mine & stems(titles)) / len(mine) >= floor


def summarize(industry, topic):
    """A short cited note for one topic, or None when the headlines cannot support one."""
    items = topic["items"][:PER_NOTE]
    if len(items) < 2:
        return None
    by_n = {i["n"]: i for i in items}
    lines = []
    for i in items:
        day = datetime.fromisoformat(i["published"]).strftime("%b %d")
        lines.append(f"[{i['n']}] {i['source']}, {day}: {i['title']}")
    res = llm.generate(SYSTEM.replace("{industry}", industry).replace("{topic}", topic["label"]),
                       "Headlines:\n" + "\n".join(lines), SCHEMA)
    sentences = []
    for s in (res or {}).get("sentences", []):
        text = re.sub(r"\s*\[\d+\]", "", s.get("text", "")).strip()
        cited = sorted({k for k in s.get("sources", []) if k in by_n})
        if not text or not cited:
            continue
        # Its numbers and most of its words must come from the headlines it cites
        titles = " ".join(by_n[k]["title"] for k in cited)
        if numbers(text) - numbers(titles) or not grounded(text, titles):
            continue
        sentences.append({"text": text, "sources": cited})
    if not sentences:
        return None
    return {"headline": (res.get("headline") or "").strip()[:90], "sentences": sentences}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desk", help="build one desk by slug")
    ap.add_argument("--no-llm", action="store_true", help="headlines only, no summaries")
    args = ap.parse_args()

    names = {i["slug"]: i["name"] for i in industries.INDUSTRIES}
    use_llm = not args.no_llm
    desks, total = {}, 0
    for slug, topics in TOPICS.items():
        if args.desk and slug != args.desk:
            continue
        name = names.get(slug, slug.title())
        print(f"{name}")
        built = collect(topics)
        for t in built:
            if use_llm:
                try:
                    t["summary"] = summarize(name, t)
                except (Exception, SystemExit) as e:  # keep the headlines if the model is not there
                    print(f"  no summary for {t['label']}: {e}", file=sys.stderr)
                    if isinstance(e, SystemExit):
                        use_llm = False
            # snippets were only for topic matching and the prompt; the page does not need them
            for i in t["items"]:
                i.pop("snippet", None)
            total += len(t["items"])
            print(f"  {t['label']}: {len(t['items'])} headlines" + (", summary" if t["summary"] else ""))
        desks[slug] = {"name": name, "topics": built, "count": sum(len(t["items"]) for t in built)}

    if not total:
        print("No headlines found, keeping the last industries.json.", file=sys.stderr)
        return 1
    if args.desk and OUT.exists():  # a one-desk run updates just that desk
        old = json.loads(OUT.read_text())
        old["desks"].update(desks)
        desks = old["desks"]
    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": None if args.no_llm else llm.LLM_MODEL,
        "lookback_days": LOOKBACK_DAYS,
        "desks": desks,
    }, indent=1, allow_nan=False) + "\n")
    print(f"Wrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
