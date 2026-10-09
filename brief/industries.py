"""The industry desks under the morning brief.

Each desk gets its own price moves, its own Google News feeds, a search per
instrument against the shared headline store, and one short note written
from only the headlines those searches return.

To add a desk, copy one block below and give it a new slug. Then add the same
slug to INDUSTRIES in data.js so the page shows it, and create
primers/<slug>.md for the hand-written primer.
"""
import re

INDUSTRIES = [
    {
        "slug": "agriculture",
        "name": "Agriculture",
        # Google News searches added to the morning's headline pull. One topic each:
        # Google wants every word in a result, so a long search finds almost nothing.
        "feeds": ["corn futures", "wheat futures", "soybean futures", "fertilizer farm"],
        # What the desk tracks.
        #   hint      the search text, in the words a headline would use
        #   keywords  a headline only counts for this instrument if it contains one of these,
        #             so a story about stock futures can't stand in for corn
        "instruments": [
            {"name": "Corn", "ticker": "ZC=F", "unit": "cents/bu", "hint": "corn prices crop harvest",
             "keywords": ["corn", "maize", "ethanol", "grain", "crop"]},
            {"name": "Wheat", "ticker": "ZW=F", "unit": "cents/bu", "hint": "wheat prices grain harvest",
             "keywords": ["wheat", "grain", "crop", "flour"]},
            {"name": "Soybeans", "ticker": "ZS=F", "unit": "cents/bu", "hint": "soybean prices exports China",
             "keywords": ["soy", "oilseed", "crush"]},
        ],
    },
    {
        "slug": "mining",
        "name": "Mining",
        "feeds": ["copper prices", "silver prices", "mining stocks", "gold miners"],
        "instruments": [
            {"name": "Copper", "ticker": "HG=F", "unit": "$/lb", "hint": "copper prices mine supply",
             "keywords": ["copper"]},
            {"name": "Silver", "ticker": "SI=F", "unit": "$/oz", "hint": "silver prices precious metals",
             "keywords": ["silver"]},
            {"name": "Gold miners", "ticker": "GDX", "unit": "GDX ETF", "hint": "gold mining stocks miners",
             "keywords": ["miner", "mining", "mine", "mines", "gdx", "barrick", "newmont", "agnico"]},
        ],
    },
    {
        "slug": "natural-resources",
        "name": "Natural resources",
        "feeds": ["natural gas prices", "lumber prices", "uranium prices"],
        "instruments": [
            {"name": "Natural gas", "ticker": "NG=F", "unit": "$/MMBtu", "hint": "natural gas prices LNG",
             "keywords": ["natural gas", "lng", "henry hub", "gas prices"]},
            {"name": "Lumber", "ticker": "LBR=F", "unit": "$/1,000 bd ft", "hint": "lumber prices sawmills",
             "keywords": ["lumber", "timber", "sawmill", "softwood", "forestry", "wood"]},
            {"name": "Uranium", "ticker": "URA", "unit": "URA ETF", "hint": "uranium prices nuclear power",
             "keywords": ["uranium", "nuclear"]},
        ],
    },
]


def feeds():
    """Every desk's Google News searches, in order."""
    return [q for ind in INDUSTRIES for q in ind["feeds"]]


def watchlist(ind):
    """name -> ticker, the shape get_moves expects."""
    return {i["name"]: i["ticker"] for i in ind["instruments"]}


def on_topic(inst, text):
    """Does this headline name the instrument's topic? Words match at their start, so soy matches soybeans."""
    return any(re.search(r"\b" + re.escape(k), text, re.I) for k in inst["keywords"])
