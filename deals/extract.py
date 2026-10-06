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
- Skip headlines that are not about a specific deal between two named companies. Funding rounds, investments, IPOs and bond sales are not deals.

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
    """The words of a company name that matter, lowercase, without legal suffixes or 's."""
    name = re.sub(r"['\u2019]s\b", "", (name or "").lower())
    return [w for w in re.findall(r"[a-z0-9]+", name) if w not in _SKIP]


def mentions(name, text):
    """Looser than appears(): does the text use the company's most distinctive word?"""
    toks = tokens(name)
    if not toks:
        return False
    words = set(re.findall(r"[a-z0-9]+", re.sub(r"['\u2019]s\b", "", text.lower())))
    return max(toks, key=len) in words


def appears(name, text):
    """True if the name is really in the text. Long names may be shortened in a headline."""
    toks = tokens(name)
    if not toks:
        return False
    words = set(re.findall(r"[a-z0-9]+", re.sub(r"['\u2019]s\b", "", text.lower())))
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


# ---------- Values and stages are checked against the headline text ----------

_NO_VALUE = {"", "null", "none", "n/a", "na", "unknown", "undisclosed", "not disclosed", "-"}
_MONEY = re.compile(r"[$\u00a3\u20ac]\s?\d[\d,]*(?:\.\d+)?\s?(?:billion|million|trillion|bln|mln|trn|bn|mn|m|b)?\b", re.I)


def canon_value(value, text):
    """The deal value as the headline writes it, or "" if the headline doesn't back it up."""
    value = (value or "").strip()
    if value.lower() in _NO_VALUE:
        return ""
    nums = re.findall(r"\d[\d,]*(?:\.\d+)?", value)
    if not nums:
        return ""
    for m in _MONEY.finditer(text):
        if re.match(r"\s*(?:per|a|/)\s*share", text[m.end():m.end() + 12], re.I):
            continue   # "$5 per share" is a price, not the size of the deal
        if nums[0].replace(",", "") in m.group(0).replace(",", ""):
            return m.group(0).strip()
    return ""


_TERMINATED = re.compile(r"\b(terminat\w*|called off|calls? off|scrapp\w*|abandon\w*|walks? away|collaps\w*|blocked|blocks|withdr[ae]w\w*|torpedo\w*|cancel\w*|ditch\w*|shelv\w*|scuttl\w*|pulls? out|axe[sd]?|scraps?\b(?:\s+\w+){0,2}\s+(?:deal|merger|bid|takeover|offer|acquisition|plans?)|drops?\b(?:\s+\S+){0,3}\s+(?:deal|merger|bid|takeover|offer|acquisition|plans?))\b", re.I)
_COMPLETED = re.compile(r"\b(completes|completed|completion of|closes|closed|finalizes|finalized|finalises|finalised|wraps up|wrapped up|has acquired|now owns|done deal)\b", re.I)
_FUTURE = re.compile(r"\b(expected|expects|set|aims?|seeks?|to be|will|would|plans?|could|may|once|after|before|pending|until)\b[^.;]{0,40}\b(complet\w*|clos\w*|finali[sz]\w*)", re.I)
_PENDING = re.compile(r"\b(regulator\w*|antitrust|competition (?:authority|commission|bureau)|CMA\b(?!\s+CGM)|FTC|DOJ|approval|approves?|approved|review|shareholder vote|vote|clearance|cleared|second request|scrutiny|probe)\b", re.I)
_SIGNED = re.compile(r"\b(agrees?|agreed|announces?|announced|acquires|signs?|signed|definitive)\b", re.I)
_ANNOUNCED = re.compile(r"\b(agrees?|agreed|announces?|announced|acquires|to (?:buy|acquire|purchase)|will (?:buy|acquire)|signs?|signed|definitive|offer|bid|launches|sweetens|raises)\b", re.I)
_RUMORED = re.compile(r"\b(in talks|talks|nears?|weighs?|considering|exploring|explores|approach\w*|interest in|people familiar|sources|rumou?r\w*|mulls?|eyes|considers|(?:possible|potential)\s+(?:\S+\s+){0,3}(?:deal|bid|takeover|merger|acquisition|buyer|suitor|offer|sale)|reportedly|according to|reports? of|reports? (?:say|says|that)|(?:reuters|bloomberg|wsj|ft|journal|times)\s+(?:reports?|says?|said))\b|\breports?\s*$", re.I)


def infer_stage(text):
    """What one headline says about where a deal stands, from the words it uses. None if unclear."""
    if _TERMINATED.search(text):
        return "Terminated"
    if _COMPLETED.search(text) and not _FUTURE.search(text):
        return "Completed"
    if _PENDING.search(text):
        return "Pending approval"
    if _RUMORED.search(text) and not _SIGNED.search(text):
        return "Rumored"
    if _ANNOUNCED.search(text):
        return "Announced"
    return None


def decide_stage(texts, fallback):
    """Stage of a deal from its headlines, newest first. The newest headline that is clear wins.

    A small model likes to say "Completed" for everything, so the model's own
    answer only counts when the words back it up; otherwise it is "Announced".
    """
    for t in texts:
        stage = infer_stage(t)
        if stage:
            return stage
    return fallback if fallback in ("Rumored", "Announced", "Pending approval") else "Announced"


_FUNDING = re.compile(r"\b(funding|round|ipo|series [a-f]|raises?|raised|bond|bonds|debt offering|share sale)\b", re.I)
_BUYING = re.compile(r"\b(acqui\w*|buy\w*|bought|takeover|merg\w*|buyout|lbo|purchase\w*|offer|bid)\b", re.I)


def is_funding(text):
    """A funding round or share sale is not a deal between two companies."""
    return bool(_FUNDING.search(text)) and not _BUYING.search(text)


def valid_record(rec, text):
    acq, tgt = (rec.get("acquirer") or "").strip(), (rec.get("target") or "").strip()
    if not acq or not tgt or same_party(acq, tgt) or is_funding(text):
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
                "value": canon_value(rec.get("value"), h["title"] + " " + h.get("snippet", "")),
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
            texts = [headlines[i]["title"] + " " + headlines[i].get("snippet", "") for i in sorted({r["idx"] for r in recs})]
            stage = decide_stage(texts, recs[0]["stage"])
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
    # A second bidder, or an investor taking a stake, for a company that already has
    # a deal on the page would only repeat that story, so each target appears once
    chosen = list(pinned)
    for g in rest:
        if len(chosen) >= limit:
            break
        if any(same_party(g["target"], c["target"]) for c in chosen):
            continue
        chosen.append(g)
    return chosen
