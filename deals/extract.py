"""Find the deals hiding in a pile of headlines.

The model reads each headline and says which company is buying which. A model
this small will sometimes invent or swap names, so the code does not take its
word: every name has to actually appear in the headline text. The surviving
records are then grouped, so five headlines about one takeover become one deal.
"""
import re
from collections import Counter

import llm

STAGES = ["Rumored", "Announced", "Pending approval", "Completed", "Terminated"]
BATCH = 10   # headlines per model call

SYSTEM = """You read M&A news headlines and pull out the deal each one reports.

Rules:
- Only include a headline if it names a buyer and a target company, in the headline or its snippet.
- Copy company names exactly as the headline writes them. Never guess or add a name.
- "stage" is one of: Rumored (talks, an approach, reported interest), Announced (a signed agreement or a formal offer), Pending approval (waiting on regulators or shareholders), Completed (closed), Terminated (called off, blocked or withdrawn).
- "value" is the deal value if the headline states one, written the way the headline writes it, otherwise an empty string.
- Skip headlines that are not about a specific deal between two named companies.

Reply in JSON as {"deals": [...]} with one item per headline that reports a deal. Each item has "n" (the headline number), "acquirer", "target", "stage" and "value"."""

SCHEMA = {
    "type": "object",
    "properties": {
        "deals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "n": {"type": "integer"},
                    "acquirer": {"type": "string"},
                    "target": {"type": "string"},
                    "stage": {"type": "string", "enum": STAGES},
                    "value": {"type": "string"},
                },
                "required": ["n", "acquirer", "target", "stage", "value"],
            },
        },
    },
    "required": ["deals"],
}

# Words that don't help tell two companies apart
_SKIP = {"inc", "incorporated", "corp", "corporation", "co", "company", "ltd", "limited", "llc", "plc",
         "sa", "nv", "ag", "se", "group", "holdings", "holding", "the", "and", "of", "de", "lp", "llp"}


def tokens(name):
    """The words of a company name that matter, lowercase, without legal suffixes."""
    return [w for w in re.findall(r"[a-z0-9]+", (name or "").lower()) if w not in _SKIP]


def appears(name, text):
    """True if the name is really in the text. Long names may be shortened in a headline."""
    toks = tokens(name)
    if not toks:
        return False
    words = set(re.findall(r"[a-z0-9]+", text.lower()))
    need = len(toks) if len(toks) <= 2 else (len(toks) + 1) // 2
    return sum(1 for t in toks if t in words) >= need


def same_party(a, b):
    """Do two spellings name the same company? One has to be the start of the other.

    "Warner Bros" matches "Warner Bros. Discovery", but "United Airlines" does
    not match "United Parcel Service".
    """
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return False
    short, long_ = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    return long_[:len(short)] == short


def valid_record(rec, text):
    acq, tgt = (rec.get("acquirer") or "").strip(), (rec.get("target") or "").strip()
    if not acq or not tgt or same_party(acq, tgt):
        return False
    return appears(acq, text) and appears(tgt, text)


def _line(n, h):
    line = f"[{n}] {h['source']}: {h['title']}"
    return line + (f"\n    {h['snippet']}" if h.get("snippet") else "")


def extract_deals(headlines, batch=BATCH):
    """One model call per batch of headlines.

    Returns (records, calls). Each record is a dict with idx (position in
    headlines), acquirer, target, stage and value, and has passed the name check.
    """
    records, calls = [], 0
    for start in range(0, len(headlines), batch):
        chunk = headlines[start:start + batch]
        prompt = ("Headlines:\n" + "\n".join(_line(start + k + 1, h) for k, h in enumerate(chunk)) +
                  "\n\nList the deals.")
        try:
            out = llm.generate(SYSTEM, prompt, schema=SCHEMA)
            calls += 1
        except Exception as e:  # a bad batch should not sink the whole run
            print(f"Extraction failed for headlines {start + 1}-{start + len(chunk)}: {e}")
            continue
        seen = set()
        for rec in (out or {}).get("deals", []):
            n = rec.get("n")
            if not isinstance(n, int) or not (start < n <= start + len(chunk)) or n in seen:
                continue
            h = headlines[n - 1]
            if not valid_record(rec, h["title"] + " " + h.get("snippet", "")):
                continue
            seen.add(n)
            records.append({
                "idx": n - 1,
                "acquirer": rec["acquirer"].strip(),
                "target": rec["target"].strip(),
                "stage": rec["stage"] if rec.get("stage") in STAGES else "Announced",
                "value": (rec.get("value") or "").strip(),
            })
    return records, calls


def _match(g, rec):
    """0 = different deal, 1 = same deal, 2 = same deal with buyer and target the other way round."""
    if same_party(g["acquirer"], rec["acquirer"]) and same_party(g["target"], rec["target"]):
        return 1
    if same_party(g["acquirer"], rec["target"]) and same_party(g["target"], rec["acquirer"]):
        return 2
    return 0


def group_deals(records, headlines, seeds=None):
    """Group records about the same deal. Seeds are pinned deals that always get a group."""
    groups = [dict(s, records=[], flips=0) for s in (seeds or [])]
    # Newest first, so ties in spelling and stage go to the most recent headline
    for rec in sorted(records, key=lambda r: headlines[r["idx"]]["published"], reverse=True):
        flipped = False
        for g in groups:
            m = _match(g, rec)
            if m:
                flipped = m == 2
                break
        else:
            g = {"acquirer": rec["acquirer"], "target": rec["target"], "pinned": False, "records": [], "flips": 0}
            groups.append(g)
        if flipped:
            rec = dict(rec, acquirer=rec["target"], target=rec["acquirer"])
            g["flips"] += 1
        g["records"].append(rec)

    out = []
    for g in groups:
        recs = g["records"]
        acquirer, target = g["acquirer"], g["target"]
        if recs:
            if not g.get("pinned"):
                # A small model sometimes gets buyer and target the wrong way round.
                # Go with whichever way most of the headlines put them.
                if g["flips"] > len(recs) / 2:
                    acquirer, target = target, acquirer
                    recs = [dict(r, acquirer=r["target"], target=r["acquirer"]) for r in recs]
                acquirer = Counter(r["acquirer"] for r in recs).most_common(1)[0][0]
                target = Counter(r["target"] for r in recs).most_common(1)[0][0]
            values = [r["value"] for r in recs if r["value"]]
            value = Counter(values).most_common(1)[0][0] if values else ""
            stage = recs[0]["stage"]
        else:
            value, stage = "", "No recent news"
        idxs = sorted({r["idx"] for r in recs})   # newest headlines have the lowest index
        out.append({
            "acquirer": acquirer, "target": target, "stage": stage, "value": value,
            "pinned": bool(g.get("pinned")),
            "idxs": idxs,
            "outlets": len({headlines[i]["source"] for i in idxs}),
            "latest": max((headlines[i]["published"] for i in idxs), default=None),
            "records": recs,
        })
    return out


def rank_deals(groups, limit):
    """Pinned deals first, then the best covered of the rest."""
    pinned = [g for g in groups if g["pinned"]]
    rest = [g for g in groups if not g["pinned"] and g["idxs"]]
    rest.sort(key=lambda g: (g["outlets"], len(g["idxs"]), g["latest"]), reverse=True)
    return pinned + rest[:max(limit - len(pinned), 0)]
