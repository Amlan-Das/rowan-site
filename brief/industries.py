"""The industry desks under the morning brief.

Each desk gets its own price moves, its own Google News feeds, a search per
instrument against the shared headline store, and one short note written
from only the headlines those searches return.

To add a desk, copy one block below and give it a new slug. Then add the same
slug to INDUSTRIES in data.js so the page shows it, and create
primers/<slug>.md for the hand-written primer.
"""

INDUSTRIES = [
    {
        "slug": "agriculture",
        "name": "Agriculture",
        # Google News searches added to the morning's headline pull
        "feeds": ["corn wheat soybean futures", "agriculture fertilizer farm"],
        # What the desk tracks. hint is the search text, in the words a headline would use
        "instruments": [
            {"name": "Corn", "ticker": "ZC=F", "unit": "cents/bu", "hint": "corn futures crop prices"},
            {"name": "Wheat", "ticker": "ZW=F", "unit": "cents/bu", "hint": "wheat futures grain prices"},
            {"name": "Soybeans", "ticker": "ZS=F", "unit": "cents/bu", "hint": "soybean futures exports"},
        ],
    },
    {
        "slug": "mining",
        "name": "Mining",
        "feeds": ["copper prices mining", "mining stocks miners"],
        "instruments": [
            {"name": "Copper", "ticker": "HG=F", "unit": "$/lb", "hint": "copper prices mining supply"},
            {"name": "Silver", "ticker": "SI=F", "unit": "$/oz", "hint": "silver prices precious metals"},
            {"name": "Gold miners", "ticker": "GDX", "unit": "GDX ETF", "hint": "gold mining stocks miners"},
        ],
    },
    {
        "slug": "natural-resources",
        "name": "Natural resources",
        "feeds": ["natural gas prices", "lumber prices", "uranium"],
        "instruments": [
            {"name": "Natural gas", "ticker": "NG=F", "unit": "$/MMBtu", "hint": "natural gas prices LNG"},
            {"name": "Lumber", "ticker": "LBR=F", "unit": "$/1,000 bd ft", "hint": "lumber prices sawmills housing"},
            {"name": "Uranium", "ticker": "URA", "unit": "URA ETF", "hint": "uranium nuclear power"},
        ],
    },
]


def feeds():
    """Every desk's Google News searches, in order."""
    return [q for ind in INDUSTRIES for q in ind["feeds"]]


def watchlist(ind):
    """name -> ticker, the shape get_moves expects."""
    return {i["name"]: i["ticker"] for i in ind["instruments"]}
