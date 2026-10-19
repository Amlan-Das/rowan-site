"""Keeps deals-history.json: how many deals the page has covered each day since it launched, and the value of the
deals whose headlines quote a dollar figure.

    python history.py backfill   rebuild everything from the git history of deals.json (run once)
    python history.py update     add today's deals.json to the file (the daily job runs this)

One entry per deal (buyer + target), so a deal that stays on the page for a week is counted once. A deal's value is
whatever its headlines quote, so it is rough: only figures in US dollars are added up, and a figure with no
unit ("$30") is skipped because it cannot be read reliably.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEALS = os.environ.get("DEALS_OUT", os.path.join(ROOT, "deals.json"))
OUT = os.environ.get("DEALS_HISTORY", os.path.join(ROOT, "deals-history.json"))

UNITS = {"billion": 1e9, "bn": 1e9, "bln": 1e9, "b": 1e9, "million": 1e6, "mn": 1e6, "m": 1e6}


def usd(raw):
    """'$3.4 Billion' -> 3.4e9. None for other currencies or figures with no unit."""
    if not raw or "$" not in raw or any(c in raw for c in "£€"):
        return None
    m = re.search(r"\$\s*([\d,]+(?:\.\d+)?)\s*(billion|bln|bn|b|million|mn|m)\b", raw, re.I)
    return float(m.group(1).replace(",", "")) * UNITS[m.group(2).lower()] if m else None


def key(d):
    norm = lambda s: re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()
    return norm(d.get("acquirer")) + "|" + norm(d.get("target"))


def day_of(iso):
    return iso[:10]


def empty():
    return {"since": None, "days": [], "deals": {}}


def add(hist, snap):
    day = day_of(snap.get("generated_at") or "")
    if not day:
        return
    shown = snap.get("deals") or []
    new = 0
    for d in shown:
        k = key(d)
        if not k.strip("|"):
            continue
        rec = hist["deals"].get(k)
        if rec is None:
            new += 1
            rec = hist["deals"][k] = {"acquirer": d.get("acquirer"), "target": d.get("target"), "first_seen": day}
        rec["last_seen"] = day
        rec["stage"] = d.get("stage")
        if d.get("value"):
            rec["value"] = d["value"]
            rec["usd"] = usd(d["value"])
    entry = {"date": day, "shown": len(shown), "found": (snap.get("stats") or {}).get("deals_found"), "new": new}
    hist["days"] = [x for x in hist["days"] if x["date"] != day] + [entry]
    hist["days"].sort(key=lambda x: x["date"])
    hist["since"] = hist["days"][0]["date"]


STOP = {"inc", "corp", "co", "plc", "ltd", "llc", "group", "holdings", "the", "and", "energy", "oil", "gas"}


def first(name):
    words = [w for w in re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).split() if w not in STOP]
    return words[0] if words else ""


def same_deal(a, b):
    """The same deal can come through under two spellings ('Paramount / Warner Bros' and 'Paramount / WBD'), so records are
    merged when their buyer and target start with the same word, or when they share a buyer or a target and quote about the same value."""
    fa, ft = first(a.get("acquirer")), first(a.get("target"))
    ga, gt = first(b.get("acquirer")), first(b.get("target"))
    if {fa, ft} == {ga, gt}:
        return True
    va, vb = a.get("usd"), b.get("usd")
    close = bool(va and vb and abs(va - vb) <= 0.03 * max(va, vb))
    return close and (fa == ga or ft == gt)


def summary(hist):
    recs = sorted(hist["deals"].values(), key=lambda r: r["first_seen"])
    groups = []
    for r in recs:
        for g in groups:
            if any(same_deal(r, m) for m in g):
                g.append(r)
                break
        else:
            groups.append([r])
    vals = [max((m["usd"] for m in g if m.get("usd")), default=None) for g in groups]
    firsts = [min(m["first_seen"] for m in g) for g in groups]
    for d in hist["days"]:
        d["cumulative"] = sum(1 for f in firsts if f <= d["date"])
    hist["totals"] = {"deals": len(groups), "with_usd_value": sum(1 for v in vals if v), "usd": sum(v for v in vals if v)}


def backfill():
    log = subprocess.run(["git", "log", "--reverse", "--format=%H", "--", "deals.json"], cwd=ROOT, capture_output=True, text=True).stdout.split()
    hist, last_of_day = empty(), {}
    for h in log:
        raw = subprocess.run(["git", "show", h + ":deals.json"], cwd=ROOT, capture_output=True, text=True).stdout
        try:
            snap = json.loads(raw)
        except ValueError:
            continue
        if snap.get("generated_at"):
            last_of_day[day_of(snap["generated_at"])] = snap   # the last update of a day is the one kept
    for day in sorted(last_of_day):
        add(hist, last_of_day[day])
    return hist


def update():
    hist = json.load(open(OUT)) if os.path.exists(OUT) else backfill()
    add(hist, json.load(open(DEALS)))
    return hist


if __name__ == "__main__":
    hist = backfill() if sys.argv[1:] == ["backfill"] else update()
    summary(hist)
    with open(OUT, "w") as f:
        json.dump(hist, f, indent=1)
    print("days:", len(hist["days"]), "deals:", hist["totals"]["deals"], "usd:", round(hist["totals"]["usd"] / 1e9, 1), "bn")
