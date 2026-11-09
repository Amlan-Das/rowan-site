"""Build rates.json for privatecredit.html: SOFR, the 10-year Treasury yield and US CPI inflation, monthly since 2018.

Data is from FRED (Federal Reserve Bank of St. Louis), downloaded as CSV with no key:
  SOFR      Secured Overnight Financing Rate, daily, percent (starts April 2018)
  DGS10     10-year Treasury constant-maturity yield, daily, percent
  CPIAUCSL  Consumer price index for all urban consumers, monthly index, seasonally adjusted
Daily series are averaged by month. Inflation is the change in CPI over the previous 12 months.

Canada (same layout) comes from the Bank of Canada Valet API: CORRA (AVG.INTWO), the Government of Canada 10-year benchmark yield
(BD.CDN.10YR.DQ.YLD) and total CPI year-over-year (STATIC_TOTALCPICHANGE).

    python scripts/rates.py
"""
import csv
import io
import json
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "rates.json"
URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={}&cosd=2017-01-01"


def fred(series):
    with urllib.request.urlopen(URL.format(series), timeout=60) as r:
        rows = list(csv.reader(io.StringIO(r.read().decode())))[1:]
    return [(d, float(v)) for d, v in rows if v not in ("", ".")]


def monthly_avg(rows):
    by = defaultdict(list)
    for d, v in rows:
        by[d[:7]].append(v)
    return {m: sum(v) / len(v) for m, v in by.items()}


def valet(series):
    with urllib.request.urlopen(f"https://www.bankofcanada.ca/valet/observations/{series}/json?start_date=2017-01-01", timeout=60) as r:
        obs = json.load(r)["observations"]
    return [(o["d"], float(o[series]["v"])) for o in obs if o.get(series, {}).get("v") not in (None, "")]


def canada():
    corra, y10, cpi = monthly_avg(valet("AVG.INTWO")), monthly_avg(valet("BD.CDN.10YR.DQ.YLD")), {d[:7]: v for d, v in valet("STATIC_TOTALCPICHANGE")}
    series = [{"month": m, "corra": round(corra[m], 2), "ten_year": round(y10[m], 2), "inflation": cpi.get(m)} for m in sorted(corra) if m in y10]
    lc, ly = valet("AVG.INTWO")[-1], valet("BD.CDN.10YR.DQ.YLD")[-1]
    return {"series": series, "latest": {"corra": {"date": lc[0], "value": lc[1]}, "ten_year": {"date": ly[0], "value": ly[1]}},
            "source": "Bank of Canada Valet API: CORRA (AVG.INTWO), 10-year benchmark yield (BD.CDN.10YR.DQ.YLD), total CPI y/y (STATIC_TOTALCPICHANGE)"}


def main():
    sofr, dgs10, cpi = monthly_avg(fred("SOFR")), monthly_avg(fred("DGS10")), {d[:7]: v for d, v in fred("CPIAUCSL")}
    months = sorted(m for m in sofr if m in dgs10)
    out = []
    for m in months:
        y, mo = int(m[:4]), m[5:]
        prev = f"{y - 1}-{mo}"
        infl = round((cpi[m] / cpi[prev] - 1) * 100, 2) if m in cpi and prev in cpi else None
        out.append({"month": m, "sofr": round(sofr[m], 2), "ten_year": round(dgs10[m], 2), "inflation": infl})
    last = fred("SOFR")[-1], fred("DGS10")[-1]
    OUT.write_text(json.dumps({
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "latest": {"sofr": {"date": last[0][0], "value": last[0][1]}, "ten_year": {"date": last[1][0], "value": last[1][1]}},
        "series": out,
        "canada": canada(),
        "source": "FRED, Federal Reserve Bank of St. Louis: SOFR, DGS10, CPIAUCSL",
    }, indent=1))
    print(len(out), "months;", out[-1])


if __name__ == "__main__":
    main()
