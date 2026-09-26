"""Update pitch-prices.json with the latest close and the closest each stock
has come to its target since the pitch date.

Reads the pitches straight from data.js so there is only one place to edit.
Run by .github/workflows/pitch-prices.yml after each US trading day.
"""

import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "pitch-prices.json"


def read_pitches(text):
    """Pull ticker, date, direction and target for each entry in the PITCHES array."""
    block = text[text.index("const PITCHES"):]
    block = block[: block.index("];")]
    pitches = []
    for chunk in re.split(r"\n\s*\{", block)[1:]:
        def field(name, pat=r'"([^"]*)"'):
            m = re.search(r"\b" + name + r"\s*:\s*" + pat, chunk)
            return m.group(1) if m else None
        target = field("target", r"([0-9.]+|null)")
        pitches.append({
            "ticker": field("ticker"),
            "date": field("date"),
            "direction": field("direction") or "Long",
            "target": float(target) if target not in (None, "null") else None,
        })
    return [p for p in pitches if p["ticker"]]


def summarize(p, rows):
    """rows: list of (date, high, low, close) for trading days after the pitch, oldest first."""
    if not rows:
        return None
    last = rows[-1]
    out = {"current": round(last[3], 2), "currentDate": last[0].isoformat()}
    target = p["target"]
    if target is None:
        return out
    short = p["direction"].lower() == "short"
    # First day the target traded, if it has
    for d, hi, lo, _ in rows:
        if (lo <= target) if short else (hi >= target):
            out["closest"] = {"price": round(target, 2), "date": d.isoformat(), "hit": True}
            return out
    # Otherwise the best print so far: highest high for a long, lowest low for a short
    if short:
        d, _, best, _ = min(rows, key=lambda r: r[2])
    else:
        d, best, _, _ = max(rows, key=lambda r: r[1])
    out["closest"] = {"price": round(best, 2), "date": d.isoformat(), "hit": False}
    return out


def fetch(ticker, start):
    import yfinance as yf
    df = yf.Ticker(ticker).history(start=start.isoformat(), auto_adjust=False)
    return [(idx.date(), float(r["High"]), float(r["Low"]), float(r["Close"]))
            for idx, r in df.iterrows()]


def main():
    pitches = read_pitches(DATA_JS.read_text())
    old = json.loads(OUT.read_text()) if OUT.exists() else {"prices": {}}
    prices = {}
    for p in pitches:
        if not p["date"]:
            continue
        start = date.fromisoformat(p["date"]) + timedelta(days=1)
        try:
            summary = summarize(p, fetch(p["ticker"], start))
        except Exception as e:  # keep yesterday's numbers rather than blanking the page
            print(f"{p['ticker']}: {e}", file=sys.stderr)
            summary = old["prices"].get(p["ticker"])
        if summary:
            prices[p["ticker"]] = summary
            print(p["ticker"], summary)
    OUT.write_text(json.dumps({
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "prices": prices,
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
