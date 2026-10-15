"""What each industry desk covers, as topics.

Every topic is one dropdown on the page. A topic has:
  label     the dropdown's title
  queries   Google News searches. Keep each one short: Google wants every word in a result,
            so a long search finds almost nothing.
  keywords  a headline only counts for the topic if it contains one of these (words match at
            their start, so "acqui" matches acquires and acquisition)

To add a topic, copy a block. To add a desk, add its slug here and to INDUSTRIES in data.js
(and brief/industries.py if you want it in the morning brief too).
"""

TOPICS = {
    "mining": [
        {"label": "Copper",
         "queries": ["copper prices", "copper mine supply", "copper demand China", "copper tariffs"],
         "keywords": ["copper"]},
        {"label": "Gold and silver",
         "queries": ["gold prices", "silver prices", "gold miners earnings", "central bank gold buying"],
         "keywords": ["gold", "silver", "bullion"]},
        {"label": "Battery metals",
         "queries": ["lithium prices", "nickel prices", "cobalt supply", "rare earths mining"],
         "keywords": ["lithium", "nickel", "cobalt", "rare earth", "battery metal", "graphite"]},
        {"label": "Iron ore, steel and coal",
         "queries": ["iron ore prices", "steelmaking coal", "BHP Rio Tinto Vale", "China steel demand"],
         "keywords": ["iron ore", "steel", "coal", "bhp", "rio tinto", "vale", "fortescue"]},
        {"label": "Deals and takeovers",
         "queries": ["mining acquisition", "miner takeover bid", "mining merger", "Anglo American"],
         "keywords": ["acqui", "merger", "takeover", "bid", "buyout", "anglo american", "deal"]},
        {"label": "Mines, labour and policy",
         "queries": ["mine strike", "mining royalties", "critical minerals policy", "mine production guidance"],
         "keywords": ["mine", "mining", "miner", "royalt", "critical mineral", "strike", "production"]},
    ],
    "agriculture": [
        {"label": "Corn",
         "queries": ["corn futures", "corn harvest", "corn exports", "ethanol corn demand"],
         "keywords": ["corn", "maize", "ethanol"]},
        {"label": "Wheat",
         "queries": ["wheat futures", "wheat harvest", "wheat exports Russia", "wheat prices"],
         "keywords": ["wheat", "flour"]},
        {"label": "Soybeans and oilseeds",
         "queries": ["soybean futures", "soybean exports China", "soybean crush", "canola oilseed"],
         "keywords": ["soy", "oilseed", "canola", "crush"]},
        {"label": "Fertilizer and inputs",
         "queries": ["fertilizer prices", "potash nitrogen", "farm input costs", "Nutrien Mosaic"],
         "keywords": ["fertili", "potash", "nitrogen", "phosphate", "nutrien", "mosaic", "input cost"]},
        {"label": "Livestock and food prices",
         "queries": ["cattle prices", "hog futures", "beef prices", "egg prices"],
         "keywords": ["cattle", "hog", "beef", "pork", "egg", "livestock"]},
        {"label": "Weather, USDA and trade",
         "queries": ["USDA crop report", "farm tariffs", "drought crops", "farm bill"],
         "keywords": ["usda", "tariff", "drought", "crop", "farm", "farmer", "acreage"]},
    ],
    "timber": [
        {"label": "Lumber prices",
         "queries": ["lumber prices", "lumber futures", "softwood lumber prices", "plywood OSB prices"],
         "keywords": ["lumber", "softwood", "plywood", "osb"]},
        {"label": "Sawmills and producers",
         "queries": ["sawmill", "West Fraser Canfor", "Interfor", "sawmill closure"],
         "keywords": ["sawmill", "mill", "west fraser", "canfor", "interfor", "weyerhaeuser", "pulp"]},
        {"label": "Timberland and REITs",
         "queries": ["timberland", "Weyerhaeuser", "Rayonier", "timberland investment"],
         "keywords": ["timberland", "weyerhaeuser", "rayonier", "potlatch", "timber reit", "forestland"]},
        {"label": "Housing demand",
         "queries": ["housing starts", "homebuilder lumber", "mortgage rates housing", "new home construction"],
         "keywords": ["housing", "homebuild", "home build", "construction", "starts", "mortgage"]},
        {"label": "Trade, duties and wildfires",
         "queries": ["softwood lumber duties", "lumber tariffs Canada", "wildfire forest", "forestry policy"],
         "keywords": ["duty", "duties", "tariff", "wildfire", "forest", "softwood"]},
    ],
}
