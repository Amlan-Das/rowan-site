/* =====================================================
   EDIT HERE. This file is shared by index.html, pitches.html, brief.html
   and deals.html, so anything you change here updates every page at once.
   Do not reformat the PITCHES block: scripts/pitch_prices.py reads
   ticker, date, direction and target from it.
   ===================================================== */

// Your links. The hero and contact section read from here.
const CONTACT = {
  email: "rowanamlan@gmail.com",
  linkedin: "https://www.linkedin.com/in/dasrowan",
  github: "https://github.com/Amlan-Das"
};

// Upload your résumé PDF next to index.html with this exact file name.
const RESUME = "resume.pdf";

// status: "Planned", "In progress" or "Complete"
// result: your finding in 1-2 sentences (leave "" until you have one)
// link:   page, repo or write-up (leave "" until it exists); linkLabel is the button text
const PROJECTS = [
  {
    status: "Complete",
    title: "Morning market brief",
    question: "What moved overnight, and why?",
    approach: "Pulls overnight moves in equity indices, rates, FX and commodities, plus the morning's headlines. Every headline is embedded and stored in a vector database, and for each move the pipeline retrieves the stories most likely to explain it. A local Llama model writes the brief from only those stories and cites each one.",
    stack: "Python, yfinance, Chroma, Ollama",
    result: "Publishes every weekday at 6:30 AM ET, with each claim linked to the headline behind it.",
    link: "brief.html", linkLabel: "Read today's brief"
  },
  {
    status: "Complete",
    title: "Deals aggregator",
    question: "Who is buying whom, and where does each deal stand?",
    approach: "Reads M&A headlines every weekday, uses a local Llama model to pull out the buyer, target and stage of each deal, and groups the headlines about the same deal together. For each deal, the pipeline retrieves earlier coverage from a vector database, so a deal rumored two weeks ago is connected to today's news. The model writes a short update per deal and cites every headline.",
    stack: "Python, Chroma, Ollama",
    result: "Updates every weekday morning, with each deal's stage and a link to every headline behind it.",
    link: "deals.html", linkLabel: "See the deals"
  },
  {
    status: "Planned",
    title: "Earnings call and Fed reader",
    question: "Did the tone change, and did the market care?",
    approach: "Reads earnings call transcripts and FOMC statements, pulls out guidance changes and shifts in tone from the last release, then lines them up against the stock or yield move that followed.",
    stack: "Python, pandas, LLM API",
    result: "", link: "", linkLabel: ""
  },
  {
    status: "Planned",
    title: "Structured note parser",
    question: "What does this note actually pay, and when?",
    approach: "Reads pricing supplements for structured notes filed on SEC EDGAR and pulls the key terms into a table: underlying, barrier, coupon, maturity and call features. Anything unusual gets flagged for a closer read.",
    stack: "Python, SEC EDGAR, LLM API",
    result: "", link: "", linkLabel: ""
  },
  {
    status: "Planned",
    title: "News sentiment vs. price",
    question: "Does the news move the stock, or is it already priced in?",
    approach: "Builds on the deal news aggregator. Scores the sentiment of news on a group of stocks, then tests whether sentiment shifts show up before price moves, or only after.",
    stack: "Python, pandas, LLM API",
    result: "", link: "", linkLabel: ""
  },
  {
    status: "Planned",
    title: "Strategy backtest",
    question: "Would this trade have made money after costs?",
    approach: "Backtests a simple momentum or mean-reversion strategy with transaction costs and no look-ahead bias, and reports the Sharpe ratio and worst drawdown.",
    stack: "Python, pandas, price data",
    result: "", link: "", linkLabel: ""
  }
];

// Industry desks: the tabs under the morning brief on brief.html.
// Each desk shows a daily note from the brief pipeline and a primer you write yourself.
//   slug     must match the slug in brief/industries.py (that file sets the prices and searches)
//   name     the tab label
//   primer   optional: a Markdown file whose text shows inside the primer, e.g. "primers/timber.md".
//            Leave it "" and the primer is just its title and the files below. The comment at the top of each file
//            has a short Markdown guide.
//   updated  when you last revised the primer, e.g. "October 2026" (leave "" to hide)
//   files    optional downloads shown as buttons under the primer title: { label, href }
const INDUSTRIES = [
  {
    slug: "agriculture", name: "Agriculture", primer: "", updated: "October 2026",
    files: [
      { label: "Industry report (PDF)", href: "primers/agriculture/agriculture-industry-review.pdf" },
      { label: "GardenCore LBO model (Excel)", href: "primers/agriculture/gardencore-lbo-model.xlsx" }
    ]
  },
  {
    slug: "mining", name: "Mining", primer: "", updated: "October 2026",
    files: [
      { label: "Mining report (PDF)", href: "primers/mining/mining-industry-review.pdf" }
    ]
  },
  {
    slug: "timber", name: "Timber", primer: "", updated: "October 2026",
    files: [
      { label: "Timber report (PDF)", href: "primers/timber/timber-industry-review.pdf" }
    ]
  }
];

// Pitches: stock calls you've made. Shown on pitches.html.
// Fill in the real numbers as you go — leave a field "" or null if you
// don't have it yet, and the page shows a placeholder instead of breaking.
//   ticker         the symbol, e.g. "V"
//   tvSymbol       exchange:symbol for the live chart, e.g. "NYSE:V"
//   company        full company name
//   direction      "Long" or "Short"
//   date           ISO date you made the call, e.g. "2026-03-06" (leave "" if unsure)
//   dateLabel      how it reads on the page, e.g. "March 6, 2026"
//   horizonMonths  how many months out your call was for
//   thesis         one or two sentences on why (leave "" until you write it)
//   pitchPrice     the share price on the day you pitched it (number or null)
//   target         your target price (number or null)
//   current        leave null: the latest close and the closest the stock has come
//                  to the target fill in by themselves from pitch-prices.json
//                  (updated after every trading day by .github/workflows/pitch-prices.yml)
//   link           link to the full deck or write-up
//   model          optional link to the Excel model behind the call
const PITCHES = [
  {
    ticker: "V", tvSymbol: "NYSE:V", color: "#61C3FF",
    company: "Visa Inc.",
    direction: "Long",
    date: "2026-03-06", dateLabel: "March 6, 2026",
    horizonMonths: 12, // not stated when you gave me this one — change if it wasn't 12 months
    thesis: "Visa's network is already built, so it doesn't need heavy new spending to grow. About 70% of VisaNet's costs are fixed, which means operating costs rise 7–8% a year while revenue grows 10–11%, taking EBIT margin from 68.3% toward 70.6% by FY2030. Client incentives also only come out of service revenue, so as cross-border and data processing grow from ~57% to ~70% of revenue, incentives take a smaller cut of each dollar.",
    pitchPrice: 317.36,
    target: 432.00,
    current: 391.43, currentAsOf: "2026-10-14",
    link: "pitches/visa-v.pdf"
  },
  {
    ticker: "OWL", tvSymbol: "NYSE:OWL", color: "#C26EFF",
    company: "Blue Owl Capital Inc.",
    direction: "Long",
    date: "2026-03-27", dateLabel: "March 27, 2026",
    horizonMonths: 12,
    thesis: "The stock fell 44% between September 2025 and March 2026 because OBDC II, a non-traded BDC, gated about $1.6B of redemptions and was hit with a class action. That vehicle is under 1% of Blue Owl's AUM. The other $307B is mostly permanent capital with no redemption risk, and EBITDA grew 17% to $1.24B over the same stretch. The multiple halved from ~19x to ~10x on redemption fears, not on any problem in the credit book.",
    pitchPrice: 8.84,
    target: 16.00,
    current: 8.79, currentAsOf: "2026-10-14",
    link: "pitches/blue-owl-owl.pdf"
  },
  {
    ticker: "CARR", tvSymbol: "NYSE:CARR", color: "#3CD6A0",
    company: "Carrier Global Corporation",
    direction: "Long",
    date: "2026-09-08", dateLabel: "September 8, 2026",
    horizonMonths: 12, // not stated when you gave me this one — change if it wasn't 12 months
    thesis: "Carrier fell 23% from its high after one soft margin quarter, and the market priced it as a housing-linked HVAC name. The order book points somewhere else: data centre orders quadrupled, backlog passed $8B, and data centre revenue is guided to double to ~$2B this year with the second half already booked. It trades at ~13x EBITDA while Trane, selling into the same data centre build-out, trades at ~20x.",
    pitchPrice: 59.11,
    target: 77.00,
    current: 54.24, currentAsOf: "2026-10-14",
    link: "pitches/carrier-carr-industrials-report.pdf#page=19"
  },
  {
    ticker: "GEV", tvSymbol: "NYSE:GEV", color: "#FF8F42",
    company: "GE Vernova Inc.",
    direction: "Short",
    date: "2026-10-02", dateLabel: "October 2, 2026",
    horizonMonths: 6,
    thesis: "At 42.6x FY26E EBITDA, GE Vernova is priced as if turbine orders and pricing stay at their peak. The 116 GW headline backlog is 53 GW of firm orders and 63 GW of slot reservations, which are non-refundable slot deposits that sit outside RPO and are usually priced at conversion. Most of the FCF guide is customer float: H1 cash from operations was $10.7B, but $13.7B of that was growth in contract liabilities. Our base case assumes no cancellations, only slower conversions and flat orders, and still lands at a 16% FY28E EBITDA margin against the Street's 21.6%. That gives a DCF value of $701 and a six-month target of $860.",
    pitchPrice: 987.45,
    target: 860.00,
    current: 941.78, currentAsOf: "2026-10-14",
    link: "pitches/ge-vernova-gev.pdf",
    model: "pitches/ge-vernova-gev-model.xlsx"
  },
  {
    ticker: "ETN", tvSymbol: "NYSE:ETN", color: "#F2C94C",
    company: "Eaton Corporation plc",
    direction: "Long",
    date: "2026-10-15", dateLabel: "October 15, 2026",
    horizonMonths: 6,
    thesis: "At 22.9x FY26E EBITDA, the market treats Eaton as a data center trade that ends when hyperscaler budgets stop growing. We see a backlog business that pays for its own growth: backlog was $24.1B in June with 71% due within twelve months, Electrical backlog was up 43% year on year, and deferred revenue is under 5% of backlog, so there are no customer deposits flattering the cash flow. The price needs 9.4% annual revenue growth to FY30, close to our base case of 9.5% and well short of the Street's 12.1%. Our base-case DCF gives $454, and the six-month target of $480 is the rounded midpoint of that and our model on Street estimates ($503).",
    pitchPrice: 408.85,
    target: 480.00,
    current: 402.40, currentAsOf: "2026-10-15",
    link: "pitches/eaton-etn.pdf",
    model: "pitches/eaton-etn-model.xlsx"
  }
];

// Toolbox section on the home page.
// Skills: shown as the skill orb and the list beside it on the home page.
// Added from work on this site (check and delete any you don't want to claim):
//   LBO modeling and Industry research (the agriculture and timber reports, GardenCore LBO),
//   Entity reorganizations (PwC), RAG, Vector databases, Local LLMs and GitHub Actions
//   (the brief and deals pipelines), yfinance and TradingView (prices and charts).
const SKILLS = [
  { group: "Valuation and modeling", items: ["DCF", "Comparable companies", "3-statement modeling", "LBO modeling", "Sensitivity tables", "Football field", "Industry research", "Pitch decks"] },
  { group: "Tax and accounting", items: ["ASC 740", "NOLs", "Section 382", "Deferred taxes", "Book-to-tax", "Tax due diligence", "Entity reorganizations", "CPA (in progress)"] },
  { group: "Code and AI", items: ["Python", "RSS pipelines", "LLM workflows", "RAG", "Vector databases", "Local LLMs", "Agentic workflows", "Claude Code", "GitHub Actions", "Excel automation"] },
  { group: "Data and tools", items: ["Excel", "S&P Capital IQ", "PowerPoint", "yfinance", "TradingView"] }
];
// AI news page: the financing network. Each deal is one arrow, drawn from the company the value
// flows FROM to the company it flows TO.
//   type "equity"    value flows from the investor to the company it owns part of
//   type "purchase"  money flows from the buyer to the seller
//   type "collab"    a named technology partnership with no money disclosed (drawn dotted, no arrow)
// A company that is both a buyer and an investor in the same partner makes a two-way pair, which
// the page marks as circular. kind sets the colour: "lab", "chips", "cloud", "dc" (data centers),
// "power" (power generation), "electrical" (electrical equipment) or "finance".
// flag shows a footnote on the deal. Amounts are as announced, and "up to" amounts are ceilings.
const AI_NETWORK = {
  checked: "October 16, 2026",
  nodes: [
    { id: "openai", name: "OpenAI", kind: "lab" },
    { id: "anthropic", name: "Anthropic", kind: "lab" },
    { id: "xai", name: "xAI", kind: "lab" },
    { id: "nvidia", name: "Nvidia", kind: "chips" },
    { id: "amd", name: "AMD", kind: "chips" },
    { id: "microsoft", name: "Microsoft", kind: "cloud" },
    { id: "amazon", name: "Amazon / AWS", kind: "cloud" },
    { id: "google", name: "Google", kind: "cloud" },
    { id: "oracle", name: "Oracle", kind: "cloud" },
    { id: "coreweave", name: "CoreWeave", kind: "cloud" },
    { id: "crusoe", name: "Crusoe", kind: "dc" },
    { id: "vantage", name: "Vantage", kind: "dc" },
    { id: "fluidstack", name: "Fluidstack", kind: "dc" },
    { id: "blueowl", name: "Blue Owl", kind: "finance" },
    { id: "constellation", name: "Constellation", kind: "power" },
    { id: "talen", name: "Talen", kind: "power" },
    { id: "nextera", name: "NextEra", kind: "power" },
    { id: "bloom", name: "Bloom Energy", kind: "power" },
    { id: "gevernova", name: "GE Vernova", kind: "power" },
    { id: "eaton", name: "Eaton", kind: "electrical" },
    { id: "schneider", name: "Schneider Electric", kind: "electrical" }
  ],
  deals: [
    // Equity
    { from: "nvidia", to: "openai", type: "equity", amount: "~$30B",
      what: "Equity in OpenAI's funding round. It replaced a September 2025 letter of intent for up to $100B that Nvidia's CEO has said was never a commitment.",
      flag: "Reported in February 2026. The companies have not confirmed that it closed." },
    { from: "microsoft", to: "openai", type: "equity", amount: "$13B", what: "Microsoft's investment in OpenAI." },
    { from: "amazon", to: "openai", type: "equity", amount: "$50B", what: "Announced February 2026 together with the expanded AWS agreement." },
    { from: "amd", to: "openai", type: "equity", amount: "Warrants, up to ~10% of AMD",
      what: "AMD gave OpenAI warrants for up to 160M AMD shares, vesting as OpenAI deploys 6 GW of AMD chips." },
    { from: "nvidia", to: "xai", type: "equity", amount: "$2B", what: "Nvidia's stake in xAI's financing." },
    { from: "microsoft", to: "anthropic", type: "equity", amount: "Up to $5B", what: "Announced November 2025 with Anthropic's Azure commitment." },
    { from: "nvidia", to: "anthropic", type: "equity", amount: "Up to $10B", what: "Announced November 2025 with Microsoft's investment." },
    { from: "google", to: "anthropic", type: "equity", amount: "Up to $40B", what: "$10B up front and up to $30B more tied to milestones. Announced April 2026." },
    { from: "amazon", to: "anthropic", type: "equity", amount: "Up to $25B", what: "$5B up front and $20B tied to milestones. Announced April 2026." },
    { from: "nvidia", to: "coreweave", type: "equity", amount: "$350M + $2B",
      what: "$350M before the 2025 IPO, then $2B in January 2026 at $87.20 a share. Nvidia holds roughly 7%." },
    { from: "blueowl", to: "crusoe", type: "equity", amount: "Part of a $15B venture",
      what: "Blue Owl, Crusoe and Primary Digital Infrastructure fund the Abilene, Texas campus through a joint venture, alongside a construction loan led by JPMorgan.",
      flag: "Reports differ on how the venture's debt and equity split." },
    // Purchase commitments
    { from: "openai", to: "nvidia", type: "purchase", amount: "Not disclosed", what: "Nvidia systems for at least 10 GW of data centers, under the September 2025 letter of intent." },
    { from: "openai", to: "microsoft", type: "purchase", amount: "$250B", what: "Azure cloud services.",
      flag: "Reported by one secondary source. Not confirmed by the companies." },
    { from: "openai", to: "oracle", type: "purchase", amount: "$300B", what: "Stargate cloud capacity over about five years." },
    { from: "openai", to: "coreweave", type: "purchase", amount: "$22.4B", what: "Cloud compute contracts: $11.9B (March 2025), $4B (May 2025) and $6.5B (September 2025)." },
    { from: "openai", to: "amazon", type: "purchase", amount: "$138B", what: "AWS: the original $38B agreement plus a $100B expansion over eight years, with about 2 GW of Trainium chips." },
    { from: "openai", to: "amd", type: "purchase", amount: "6 GW of chips", what: "AMD Instinct MI450 GPUs, starting with 1 GW in the second half of 2026.",
      flag: "AMD has not disclosed a dollar value." },
    { from: "anthropic", to: "microsoft", type: "purchase", amount: "$30B", what: "Azure compute, with up to 1 GW of extra capacity." },
    { from: "anthropic", to: "google", type: "purchase", amount: "Not disclosed", what: "Google Cloud TPU capacity, up to 5 GW over five years." },
    { from: "anthropic", to: "amazon", type: "purchase", amount: "$100B+", what: "AWS spending over ten years, with up to 5 GW of Trainium capacity." },
    { from: "nvidia", to: "coreweave", type: "purchase", amount: "$6.3B", what: "Nvidia buys CoreWeave's unsold cloud capacity through 2032." },
    { from: "oracle", to: "nvidia", type: "purchase", amount: "Not disclosed", what: "GPUs for Oracle's data centers." },
    { from: "xai", to: "nvidia", type: "purchase", amount: "Not disclosed", what: "GPUs for xAI's data centers." },
    // Data centers and power
    { from: "oracle", to: "crusoe", type: "purchase", amount: "Not disclosed",
      what: "Oracle leases Crusoe's Abilene, Texas campus, about 1.2 GW planned, which OpenAI uses for Stargate.",
      flag: "Lease terms come from secondary reports. The companies haven't published them." },
    { from: "oracle", to: "vantage", type: "purchase", amount: "Not disclosed",
      what: "Vantage's Frontier campus in Shackelford County, Texas: 1.4 GW across ten buildings, a $25B+ build tied to Oracle and OpenAI's Stargate.",
      flag: "The $25B is Vantage's own investment. Oracle's lease value isn't public." },
    { from: "anthropic", to: "fluidstack", type: "purchase", amount: "$50B", what: "Anthropic's US data center plan, starting with Fluidstack sites in Texas and New York." },
    { from: "crusoe", to: "gevernova", type: "purchase", amount: "29 turbines, ~1 GW", what: "LM2500XPRESS gas turbines to power Crusoe's AI data centers, ordered in two batches: 10 in December 2024 and 19 in June 2025." },
    { from: "microsoft", to: "constellation", type: "purchase", amount: "Not disclosed", what: "A 20-year power purchase agreement that restarts Three Mile Island Unit 1 as the Crane Clean Energy Center, about 835 MW." },
    { from: "amazon", to: "talen", type: "purchase", amount: "~$18B", what: "Up to 1,920 MW from the Susquehanna nuclear plant in Pennsylvania through 2042.",
      flag: "The $18B is Talen's projected revenue at full volume." },
    { from: "google", to: "nextera", type: "purchase", amount: "Not disclosed", what: "A 25-year power purchase agreement to restart the 615 MW Duane Arnold nuclear plant in Iowa. Power is expected in early 2029." },
    { from: "oracle", to: "bloom", type: "purchase", amount: "Not disclosed", what: "Bloom Energy fuel cells to power Oracle's AI data centers." },
    // Electrical equipment: named partnerships only. No money is disclosed.
    { from: "eaton", to: "nvidia", type: "collab", amount: "No money disclosed", what: "A reference design for 800 VDC power in AI factories, announced October 2025: busbar power distribution, supercapacitor backup and DC connectors." },
    { from: "schneider", to: "nvidia", type: "collab", amount: "No money disclosed", what: "A global partnership announced at Nvidia's GTC Paris in June 2025, with joint reference designs for power and liquid cooling in AI data centers." }
  ],
  sources: [
    { label: "Amazon, Anthropic", href: "https://www.geekwire.com/2026/04/amazon-doubles-down-on-anthropic-with-25b-investment-mirroring-its-openai-cloud-deal/" },
    { label: "Amazon, OpenAI", href: "https://www.geekwire.com/2026/amazon-invests-50b-in-openai-deepens-aws-partnership-with-expanded-100b-cloud-deal/" },
    { label: "Google, Anthropic", href: "https://aibusiness.com/generative-ai/google-could-invest-another-40-billion-anthropic" },
    { label: "Anthropic, Microsoft, Nvidia", href: "https://www.constellationr.com/insights/news/anthropic-microsoft-azure-nvidia-ink-30-billion-compute-pact" },
    { label: "AMD, OpenAI", href: "https://tomshardware.com/tech-industry/openai-and-amd-announce-multibillion-dollar-partnership-amd-to-supply-6-gigawatts-in-chips-openai-could-get-up-to-10-percent-of-amd-shares-in-return" },
    { label: "Nvidia, CoreWeave", href: "https://www.datacenterdynamics.com/en/news/nvidia-invests-another-2bn-in-coreweave/" },
    { label: "Nvidia, OpenAI", href: "https://www.datacenterdynamics.com/en/news/nvidia-plans-30bn-investment-in-upcoming-openai-funding-round/" },
    { label: "CoreWeave, OpenAI", href: "https://www.bnnbloomberg.ca/business/2025/09/25/coreweave-expands-openai-pact-with-new-us65-billion-contract-sees-the-quarter-of-diversification/" },
    { label: "Crusoe, Abilene", href: "https://www.globaldatacenterhub.com/p/crusoes-116b-bet-on-openais-texas" },
    { label: "Vantage, Frontier", href: "https://www.datacenterdynamics.com/en/news/vantage-breaks-ground-on-texas-gigawatt-data-center-campus-for-openai/" },
    { label: "Anthropic, Fluidstack", href: "https://datacenterdynamics.com/en/news/anthropic-plans-50bn-us-data-center-spend-starting-with-fluidstack-sites-in-texas-and-new-york" },
    { label: "Crusoe, GE Vernova", href: "https://www.gevernova.com/news/press-releases/ge-vernova-crusoe-announce-major-29-unit-aeroderivative-gas-turbine-deliver-ai-data-centers" },
    { label: "Microsoft, Constellation", href: "https://orrick.com/News/2024/10/Microsoft-Signs-20-Year-PPA-with-Constellation" },
    { label: "Amazon, Talen", href: "https://www.utilitydive.com/news/talen-amazon-aws-susquehanna-nuclear-data-center-t/750440/" },
    { label: "Google, NextEra", href: "https://www.ans.org/news/2025-10-28/article-7501/nextera-and-google-ink-a-deal-to-restart-duane-arnold/" },
    { label: "Oracle, Bloom Energy", href: "https://finance.yahoo.com/news/brookfield-backs-bloom-energy-5-220121193.html" },
    { label: "Eaton, Nvidia", href: "https://www.businesswire.com/news/home/20251010367772/en/Eaton-Unveils-Next-generation-Architecture-to-Advance-800-VDC-Power-Infrastructure-for-AI-Factories" },
    { label: "Schneider Electric, Nvidia", href: "https://itbrief.co.uk/story/schneider-electric-collaborates-with-nvidia-for-advanced-ai-solutions" }
  ]
};

// AI news page: the timeline of milestones, shown newest first.
//   date     "YYYY-MM-DD", or "YYYY-MM" when the day is not a single moment
//   cat      Models, Products, Chips and compute, Money and markets, Policy and safety, Science or Power
//   title    the headline
//   summary  one line, always visible
//   detail   a short paragraph that opens when the entry is clicked
//   links    optional, shown under the detail as "Read more"
// To add news, put a new entry at the top of the list. The page sorts and groups by date on its own.
const AI_TIMELINE = [
  { date: "2026-10", cat: "Money and markets", title: "Nvidia is back at record highs, near $6 trillion",
    summary: "The chipmaker's market value climbs to roughly $5.8 trillion in early October.",
    detail: "Nvidia shares reached new all-time highs in early October 2026, putting its market value at about $5.8 trillion by one count. Prediction markets put the odds it ends the year above $6 trillion at around 40%. The company that sells the chips has been the clearest financial winner of the AI buildout.",
    links: [{ label: "Proactive Investors", href: "https://www.proactiveinvestors.co.uk/a/789bce91/nvidia-closes-in-on-6-trillion-as-prediction-markets-back-year-end-break" }] },
  { date: "2026-10", cat: "Money and markets", title: "Investors split on whether AI spending pays off",
    summary: "The biggest cloud companies are on track to spend $700 billion or more on AI this year.",
    detail: "Estimates put 2026 spending by Amazon, Alphabet, Meta and Microsoft at roughly $725 billion, and Morgan Stanley has projected about $1.2 trillion for 2027. Companies that raised spending without matching growth have been sold off, while those showing strong revenue were rewarded. Bulls call it an expanding investment boom. Bears point to the gap between spending and enterprise AI revenue.",
    links: [{ label: "The Motley Fool, Oct 8", href: "https://www.fool.com/investing/2026/10/08/the-stock-market-is-facing-a-capex-pickle/" }] },
  { date: "2026-09", cat: "Money and markets", title: "OpenAI explores a valuation above $1.2 trillion",
    summary: "Altman says the IPO will not happen in 2026, and new funding talks are reported.",
    detail: "OpenAI was reported to be in early talks to raise money at a valuation above $1.2 trillion, after its March round at $852 billion. People familiar with the talks said fresh funding could let it delay a listing by a quarter or two. Sam Altman told Fortune the long-expected IPO remains in the works but will not take place in 2026.",
    links: [{ label: "The Vibes", href: "https://www.thevibes.com/index.php/articles/business/127338/openai-weighs-fresh-funding-at-us1.2-trillion-plus-valuation-ahead-of-ipo" }] },
  { date: "2026-07-24", cat: "Models", title: "Anthropic releases Claude Opus 5",
    summary: "A new flagship with a 1 million token context window and unchanged pricing.",
    detail: "Release trackers date Opus 5 to July 24, 2026, priced at $5 and $25 per million tokens. It was positioned as coming close to the intelligence of Anthropic's top-end Fable 5 model at half the price. Dates and benchmark figures here come from third-party coverage, so check Anthropic's own announcement for the details.",
    links: [{ label: "DataNorth", href: "https://datanorth.ai/news/claude-opus-5-by-anthropic" }, { label: "LLM Reference changelog", href: "https://www.llmreference.com/changelog/2026-07" }] },
  { date: "2026-06-30", cat: "Models", title: "Claude Sonnet 5 becomes the default model",
    summary: "Near-flagship capability at mid-tier pricing, free to Claude users from July 1.",
    detail: "Anthropic's Sonnet 5 was released on June 30, 2026 and became the default for free and Pro Claude users the next day, replacing Sonnet 4.6. It was described as the company's most agentic Sonnet yet, close to its flagship models at a fraction of the cost.",
    links: [{ label: "NYU RITS", href: "https://rits.shanghai.nyu.edu/ai/anthropic-launches-claude-sonnet-5-closing-the-gap-with-opus/" }, { label: "LLM Reference changelog", href: "https://www.llmreference.com/changelog/2026-07" }] },
  { date: "2026-04-24", cat: "Models", title: "DeepSeek previews V4, adapted for Huawei chips",
    summary: "China's best-known open model lab shows it can run on Chinese hardware.",
    detail: "DeepSeek released a preview of V4 in Pro and cheaper Flash versions, and Huawei said its chips were used in part of the training. Analysts read it as a sign that top Chinese models can now run on Chinese hardware, which matters for the US export controls. Independent benchmarks still placed it behind the leading closed US models.",
    links: [{ label: "CP24 / Bloomberg", href: "https://www.cp24.com/news/world/2026/04/24/deepseek-previews-new-ai-model-adapted-to-run-on-huawei-chips/" }] },
  { date: "2026-04-24", cat: "Money and markets", title: "Google commits up to $40 billion to Anthropic",
    summary: "$10 billion up front and up to $30 billion more tied to milestones.",
    detail: "Alphabet's deal came with a compute agreement: Google Cloud is to supply 5 gigawatts of TPU capacity over five years. Four days earlier Amazon had announced a similar structure. Critics point out that much of the investment comes back to the investors as cloud and chip spending.",
    links: [{ label: "AI Business", href: "https://aibusiness.com/generative-ai/google-could-invest-another-40-billion-anthropic" }] },
  { date: "2026-04-23", cat: "Models", title: "OpenAI releases GPT-5.5",
    summary: "The new flagship, plus a lighter Instant version that became the default in ChatGPT.",
    detail: "GPT-5.5 reached paid ChatGPT and Codex users first, with API access the next day at $5 per million input tokens and $30 per million output tokens. A lighter GPT-5.5 Instant became the default model in ChatGPT. Coverage said it needed less human steering and fewer tokens than GPT-5.4.",
    links: [{ label: "Tangem coverage", href: "https://tangem.com/en/news/tech/22117-openai-launches-gpt-5-5-advanced-ai-for-real-world-tasks/" }] },
  { date: "2026-04-20", cat: "Money and markets", title: "Amazon commits up to $25 billion to Anthropic",
    summary: "Anthropic pledges more than $100 billion of AWS spending over ten years.",
    detail: "Amazon put in $5 billion at once, with $20 billion more tied to commercial milestones, bringing its total to about $33 billion. In return Anthropic committed to spend more than $100 billion on AWS over a decade, securing up to 5 gigawatts of Amazon's Trainium chips.",
    links: [{ label: "GeekWire", href: "https://www.geekwire.com/2026/04/amazon-doubles-down-on-anthropic-with-25b-investment-mirroring-its-openai-cloud-deal/" }] },
  { date: "2026-03-31", cat: "Money and markets", title: "OpenAI closes a record $122 billion round",
    summary: "The largest private funding round on record, at an $852 billion valuation.",
    detail: "SoftBank co-led the round, with backing from Andreessen Horowitz, D. E. Shaw, MGX, TPG and T. Rowe Price, and participation from Amazon, Nvidia and Microsoft. Some outlets reported a lower valuation for an earlier close, so figures vary by whether they are before or after the new money.",
    links: [{ label: "Business Today", href: "https://www.businesstoday.in/technology/story/openai-raises-122-billion-funding-ahead-of-ipo-buzz-523445-2026-04-01" }] },
  { date: "2026-02-27", cat: "Money and markets", title: "Amazon puts $50 billion into OpenAI",
    summary: "OpenAI's AWS deal grows from $38 billion to about $138 billion.",
    detail: "Amazon's $50 billion came in stages and was tied to an expanded cloud agreement: OpenAI added $100 billion of AWS spending over eight years, with about 2 gigawatts of Trainium chips. It was part of a funding round of about $110 billion that also included Nvidia and SoftBank.",
    links: [{ label: "GeekWire", href: "https://www.geekwire.com/2026/amazon-invests-50b-in-openai-deepens-aws-partnership-with-expanded-100b-cloud-deal/" }] },
  { date: "2026-01-26", cat: "Money and markets", title: "Nvidia invests another $2 billion in CoreWeave",
    summary: "The chipmaker backs one of its biggest customers, a pattern critics call circular.",
    detail: "Nvidia bought $2 billion of CoreWeave stock at $87.20 a share to help it build more than 5 gigawatts of AI data center capacity by 2030. CoreWeave said the cash would not go toward Nvidia chips. Nvidia had already agreed to buy up to $6.3 billion of CoreWeave's unsold cloud capacity.",
    links: [{ label: "Data Center Dynamics", href: "https://www.datacenterdynamics.com/en/news/nvidia-invests-another-2bn-in-coreweave/" }] },
  { date: "2026-01", cat: "Chips and compute", title: "US allows Nvidia H200 sales to China",
    summary: "A policy reversal, though shipments were slow to follow.",
    detail: "The Trump administration gave the green light in January for Nvidia's H200 chips to be sold in China. Shipments were held up by disagreements over terms in both countries, and later reporting said a licensed channel reopened after Trump and Xi met in May. That later detail comes from a single research firm.",
    links: [{ label: "Counterpoint Research", href: "https://counterpointresearch.com/cn/reports/deepseek-and-nvidia-trump-xi-equation-shape-china-ai-trajectory" }] },
  { date: "2026-01-01", cat: "Policy and safety", title: "California's frontier AI safety law takes effect",
    summary: "SB 53 makes the largest AI developers publish safety frameworks and report incidents.",
    detail: "The Transparency in Frontier AI Act took most of its effect on January 1, 2026. It applies to large frontier developers and requires published safety frameworks and reporting of certain incidents. It became the main state-level counterweight to federal efforts to preempt state AI laws.",
    links: [{ label: "WSGR", href: "https://www.wsgrdataadvisor.com/2026/01/2026-year-in-preview-ai-regulatory-developments-for-companies-to-watch-out-for/" }] },
  { date: "2025-12", cat: "Policy and safety", title: "Trump signs an order targeting state AI laws",
    summary: "A new task force is told to challenge state rules the administration calls onerous.",
    detail: "Executive Order 14365 created an AI Litigation Task Force whose job is to challenge state AI laws, and tied some federal broadband funds to states not enforcing laws it calls onerous. Congress has twice rejected broad preemption, and states have kept passing AI laws, with one count putting the total at 109 in the first half of 2026.",
    links: [{ label: "Holistic AI", href: "https://www.holisticai.com/blog/ai-regulation-in-2026-navigating-an-uncertain-landscape" }] },
  { date: "2025-11-18", cat: "Models", title: "Google releases Gemini 3",
    summary: "Google's strongest model yet, announced the same day as a big Anthropic deal.",
    detail: "Gemini 3 put Google back at or near the top of the main benchmarks and was rolled into Search and the Gemini app at launch. It marked a turn in the story that Google had fallen behind in the race that ChatGPT started three years earlier.",
    links: [{ label: "Gemini on Wikipedia", href: "https://en.wikipedia.org/wiki/Gemini_(language_model)" }] },
  { date: "2025-11-18", cat: "Money and markets", title: "Anthropic, Microsoft and Nvidia announce a three-way deal",
    summary: "Anthropic buys $30 billion of Azure compute; Microsoft and Nvidia invest up to $15 billion.",
    detail: "Anthropic committed to $30 billion of Azure capacity and up to 1 gigawatt more, while Nvidia agreed to invest up to $10 billion and Microsoft up to $5 billion. The amounts are ceilings. It tied three companies that had been rivals or suppliers into one financing loop.",
    links: [{ label: "Constellation Research", href: "https://www.constellationr.com/insights/news/anthropic-microsoft-azure-nvidia-ink-30-billion-compute-pact" }] },
  { date: "2025-10-29", cat: "Money and markets", title: "Nvidia becomes the first $5 trillion company",
    summary: "Its market value passes $5 trillion, helped by about $500 billion in chip bookings.",
    detail: "Nvidia reached a $5 trillion market value on October 29, 2025, the first public company to do so, three months after passing $4 trillion. The run-up was driven by reports of roughly $500 billion in AI chip orders.",
    links: [{ label: "Trending Topics", href: "https://www.trendingtopics.eu/nvidia-5-trillion-dollars/" }] },
  { date: "2025-10-06", cat: "Chips and compute", title: "AMD and OpenAI sign a 6-gigawatt chip deal",
    summary: "OpenAI gets warrants for up to about 10% of AMD as it buys AMD's chips.",
    detail: "OpenAI agreed to deploy 6 gigawatts of AMD GPUs starting with the MI450 in the second half of 2026. AMD issued OpenAI warrants for up to 160 million shares, vesting as the deployments are made. Critics raised the circularity of a supplier giving its customer equity.",
    links: [{ label: "Tom's Hardware", href: "https://tomshardware.com/tech-industry/openai-and-amd-announce-multibillion-dollar-partnership-amd-to-supply-6-gigawatts-in-chips-openai-could-get-up-to-10-percent-of-amd-shares-in-return" }] },
  { date: "2025-09-22", cat: "Money and markets", title: "Nvidia announces plans to invest up to $100 billion in OpenAI",
    summary: "A letter of intent tied to 10 gigawatts of Nvidia systems; later replaced by a smaller deal.",
    detail: "The letter of intent was not binding, and Nvidia's CEO later said it was never a commitment. In February 2026 it was reported to be replaced by an equity investment of about $30 billion in OpenAI's funding round.",
    links: [{ label: "Data Center Dynamics", href: "https://www.datacenterdynamics.com/en/news/nvidia-plans-30bn-investment-in-upcoming-openai-funding-round/" }] },
  { date: "2025-09-10", cat: "Money and markets", title: "Oracle soars on a reported $300 billion OpenAI contract",
    summary: "The stock has its biggest one-day jump in decades on news of the Stargate cloud deal.",
    detail: "Reports that OpenAI planned to buy about $300 billion of computing power from Oracle over roughly five years sent Oracle's shares up by more than a third in a day. The contract became the center of the debate over how much of the AI buildout is funded by a single customer.",
    links: [{ label: "Oracle on Wikipedia", href: "https://en.wikipedia.org/wiki/Oracle_Corporation" }] },
  { date: "2025-08-07", cat: "Models", title: "OpenAI releases GPT-5",
    summary: "A unified model that decides when to think hard, replacing a menu of older ones.",
    detail: "GPT-5 combined a fast model and a reasoning model behind a router, and became the default in ChatGPT. Reception was mixed at first, with many users saying the jump was smaller than earlier generations, and it prompted a wider conversation about whether progress was slowing.",
    links: [{ label: "GPT-5 on Wikipedia", href: "https://en.wikipedia.org/wiki/GPT-5" }] },
  { date: "2025-07-23", cat: "Policy and safety", title: "The White House publishes its AI Action Plan",
    summary: "Faster data center permits, fewer rules, and a push to export American AI.",
    detail: "The plan set out more than 90 federal actions, centered on speeding up data center and power permitting, loosening regulation and promoting exports of the US AI stack to allies. It reversed the cautious posture of the Biden-era order.",
    links: [{ label: "Executive Order 14110 on Wikipedia", href: "https://en.wikipedia.org/wiki/Executive_Order_14110" }] },
  { date: "2025-07-09", cat: "Money and markets", title: "Nvidia passes $4 trillion",
    summary: "The first company to hit that value.",
    detail: "Nvidia became the first public company to reach a $4 trillion market value on July 9, 2025. Its value had crossed $3 trillion for the first time a little over a year earlier.",
    links: [{ label: "The Motley Fool", href: "https://www.fool.com/investing/2025/07/09/nvidia-reaches-4-trillion-mark-hit-5-trillion/" }] },
  { date: "2025-06-12", cat: "Money and markets", title: "Meta pays $14.3 billion for 49% of Scale AI",
    summary: "The deal brings Scale's founder in to lead Meta's new superintelligence effort.",
    detail: "Meta's investment valued Scale AI at about $29 billion and brought its founder Alexandr Wang to Meta. It kicked off a hiring spree with pay packages reported in the hundreds of millions of dollars as labs competed for a small pool of researchers.",
    links: [{ label: "Scale AI on Wikipedia", href: "https://en.wikipedia.org/wiki/Scale_AI" }] },
  { date: "2025-05-22", cat: "Models", title: "Anthropic releases Claude 4",
    summary: "Opus 4 and Sonnet 4, aimed at long-running coding and agent work.",
    detail: "Claude Opus 4 and Sonnet 4 pushed Anthropic's focus on software engineering and agents that can work for hours on a task. It set up Claude Code as a major product and a growing share of Anthropic's revenue.",
    links: [{ label: "Claude on Wikipedia", href: "https://en.wikipedia.org/wiki/Claude_(language_model)" }] },
  { date: "2025-04-15", cat: "Chips and compute", title: "US requires licenses for Nvidia's H20 chips to China",
    summary: "Nvidia warns of a $5.5 billion charge as its China-specific chip is blocked.",
    detail: "The H20 had been designed to comply with earlier export rules. The new license requirement effectively halted sales and Nvidia took a multibillion-dollar charge. It showed how fast the rules for AI chips could change, and how much of Nvidia's business rides on them.",
    links: [{ label: "Nvidia on Wikipedia", href: "https://en.wikipedia.org/wiki/Nvidia" }] },
  { date: "2025-03-31", cat: "Money and markets", title: "OpenAI raises $40 billion at a $300 billion valuation",
    summary: "A SoftBank-led round that was then the largest private tech raise ever.",
    detail: "The round roughly doubled OpenAI's valuation within months and was followed by a push to restructure the company's nonprofit-controlled structure. Within a year OpenAI would raise a larger round at nearly three times the valuation.",
    links: [{ label: "OpenAI on Wikipedia", href: "https://en.wikipedia.org/wiki/OpenAI" }] },
  { date: "2025-03-25", cat: "Products", title: "ChatGPT's image generation goes viral",
    summary: "Millions of people turn photos into cartoon-style art, straining OpenAI's servers.",
    detail: "A new image generator built into GPT-4o produced a wave of stylized portraits and strained OpenAI's capacity so much that the company said its GPUs were melting. It showed that a single consumer feature could pull in tens of millions of new users in days.",
    links: [{ label: "ChatGPT on Wikipedia", href: "https://en.wikipedia.org/wiki/ChatGPT" }] },
  { date: "2025-01-27", cat: "Money and markets", title: "DeepSeek-R1 knocks about $589 billion off Nvidia in a day",
    summary: "A Chinese lab's cheap open reasoning model shakes the assumption that only huge budgets win.",
    detail: "DeepSeek released R1 on January 20 and by January 27 it topped the US app store. Nvidia lost about $589 billion of market value in a single session, the largest one-day loss in history, on fears that frontier AI would need far less computing power than expected. The fear faded, but it was the first big test of the spending thesis.",
    links: [{ label: "DeepSeek on Wikipedia", href: "https://en.wikipedia.org/wiki/DeepSeek" }] },
  { date: "2025-01-21", cat: "Chips and compute", title: "Stargate is announced: up to $500 billion for US AI infrastructure",
    summary: "OpenAI, SoftBank and Oracle pledge a vast data center buildout, announced at the White House.",
    detail: "The project promised up to $500 billion over four years, starting with a campus in Abilene, Texas. It set the scale for everything that followed: gigawatt-sized campuses, multi-hundred-billion-dollar compute contracts, and a scramble for power.",
    links: [{ label: "Stargate on Wikipedia", href: "https://en.wikipedia.org/wiki/Stargate_LLC" }] },
  { date: "2024-12-20", cat: "Models", title: "OpenAI previews o3",
    summary: "A reasoning model that scores far above earlier ones on a test of novel problems.",
    detail: "o3 scored 75.7% to 87.5% on the ARC-AGI benchmark, which was designed to resist memorization and had stumped models for years. It raised the question of how much of intelligence can be bought with extra computing at the moment of answering.",
    links: [{ label: "OpenAI o1 series on Wikipedia", href: "https://en.wikipedia.org/wiki/OpenAI_o1" }] },
  { date: "2024-10-09", cat: "Science", title: "AI wins two Nobel Prizes in two days",
    summary: "Physics goes to Hinton and Hopfield, Chemistry to the AlphaFold team and David Baker.",
    detail: "The 2024 Physics prize recognized foundational work on neural networks by John Hopfield and Geoffrey Hinton. The Chemistry prize went to Demis Hassabis and John Jumper of Google DeepMind for AlphaFold's protein structure predictions and to David Baker for protein design. It was the clearest sign that AI had become a scientific tool as well as a product.",
    links: [{ label: "Nobel Prize in Physics 2024", href: "https://www.nobelprize.org/prizes/physics/2024/press-release/" }] },
  { date: "2024-09-20", cat: "Power", title: "Microsoft signs a deal to restart Three Mile Island Unit 1",
    summary: "A 20-year power purchase agreement brings a closed nuclear reactor back for data centers.",
    detail: "Microsoft agreed to buy the output of the restarted reactor, to be renamed the Crane Clean Energy Center, with about 835 megawatts of capacity. It was the first of a series of nuclear deals by big tech, and the moment electricity became the main limit on the AI buildout.",
    links: [{ label: "Orrick", href: "https://orrick.com/News/2024/10/Microsoft-Signs-20-Year-PPA-with-Constellation" }] },
  { date: "2024-09-12", cat: "Models", title: "OpenAI releases o1, a model that thinks before answering",
    summary: "The first mainstream reasoning model, trading more computing time for better answers.",
    detail: "o1 spent extra time working through a problem step by step before replying, and scored far higher on math, science and coding tests. It opened a second axis of progress: instead of only making models bigger, labs could make them think longer.",
    links: [{ label: "OpenAI o1 on Wikipedia", href: "https://en.wikipedia.org/wiki/OpenAI_o1" }] },
  { date: "2024-08-01", cat: "Policy and safety", title: "The EU AI Act enters into force",
    summary: "The world's first broad AI law starts its phased rollout.",
    detail: "The Act sorts AI systems by risk. Bans on certain practices came first, rules for general-purpose models followed in 2025, and the strictest obligations for high-risk systems were scheduled for later. Parts of that schedule are now being pushed back.",
    links: [{ label: "AI Act on Wikipedia", href: "https://en.wikipedia.org/wiki/Artificial_Intelligence_Act" }] },
  { date: "2024-06-18", cat: "Money and markets", title: "Nvidia becomes the world's most valuable company",
    summary: "It passes Microsoft with a market value above $3.3 trillion.",
    detail: "Nvidia's stock had risen more than tenfold in under two years. It overtook Microsoft that day, after passing Apple earlier in June, a sign that markets saw the chips behind AI as worth more than the software built on top.",
    links: [{ label: "Nvidia on Wikipedia", href: "https://en.wikipedia.org/wiki/Nvidia" }] },
  { date: "2024-06-10", cat: "Products", title: "Apple announces Apple Intelligence",
    summary: "AI comes to the iPhone, with ChatGPT built in.",
    detail: "At its developer conference Apple unveiled on-device and cloud AI features across iPhone, iPad and Mac, with an optional ChatGPT integration. It put generative AI features within reach of hundreds of millions of iPhone owners, though the rollout of its more ambitious features was slower than promised.",
    links: [{ label: "Apple Intelligence on Wikipedia", href: "https://en.wikipedia.org/wiki/Apple_Intelligence" }] },
  { date: "2024-05-13", cat: "Models", title: "OpenAI releases GPT-4o",
    summary: "A model that talks, sees and listens in real time.",
    detail: "GPT-4o handled text, images and voice in one model and made natural spoken conversation with an AI feel instant. It also brought the best free-tier model to everyone.",
    links: [{ label: "GPT-4o on Wikipedia", href: "https://en.wikipedia.org/wiki/GPT-4o" }] },
  { date: "2024-04-18", cat: "Models", title: "Meta releases Llama 3",
    summary: "An open model that closes much of the gap with closed ones.",
    detail: "Llama 3 and, later, the 405-billion-parameter Llama 3.1 showed that open-weight models could come close to the leading closed ones. It kept pressure on prices and set the stage for the wave of open models from China.",
    links: [{ label: "Llama on Wikipedia", href: "https://en.wikipedia.org/wiki/Llama_(language_model)" }] },
  { date: "2024-03-18", cat: "Chips and compute", title: "Nvidia unveils the Blackwell chip",
    summary: "The next generation of AI accelerators, announced at GTC.",
    detail: "Blackwell promised large gains in training and inference over the H100 and became the basis for the gigawatt-scale systems that followed. Its demand shaped the supply chain for everything from advanced packaging to power equipment.",
    links: [{ label: "Nvidia on Wikipedia", href: "https://en.wikipedia.org/wiki/Nvidia" }] },
  { date: "2024-03-04", cat: "Models", title: "Anthropic releases Claude 3",
    summary: "Opus, Sonnet and Haiku, with Opus matching or beating GPT-4 on several benchmarks.",
    detail: "The Claude 3 family gave Anthropic a model that rivaled the best from OpenAI for the first time and made the market a genuine three-way race with Google.",
    links: [{ label: "Claude on Wikipedia", href: "https://en.wikipedia.org/wiki/Claude_(language_model)" }] },
  { date: "2024-02-15", cat: "Products", title: "OpenAI previews Sora",
    summary: "Photorealistic video from a text prompt, months before it opened to the public.",
    detail: "The Sora preview showed minute-long videos from a text description, years ahead of what most people expected. It set off a rush in video generation and fresh debates about training data and creative work.",
    links: [{ label: "Sora on Wikipedia", href: "https://en.wikipedia.org/wiki/Sora_(text-to-video_model)" }] },
  { date: "2023-12-08", cat: "Policy and safety", title: "The EU reaches a deal on the AI Act",
    summary: "Negotiators agree a political deal after a marathon final round.",
    detail: "Lawmakers settled the hardest questions, including how to treat general-purpose models and what to ban outright, after a negotiation that nearly collapsed over foundation models. The text was formally adopted in 2024.",
    links: [{ label: "AI Act on Wikipedia", href: "https://en.wikipedia.org/wiki/Artificial_Intelligence_Act" }] },
  { date: "2023-12-06", cat: "Models", title: "Google announces Gemini",
    summary: "Google's answer to GPT-4, in three sizes.",
    detail: "Gemini 1.0 came in Ultra, Pro and Nano versions and was Google DeepMind's first model built to handle text, images, audio and code together. It marked the merger of Google's two AI labs and the start of a long catch-up effort.",
    links: [{ label: "Gemini on Wikipedia", href: "https://en.wikipedia.org/wiki/Gemini_(language_model)" }] },
  { date: "2023-11-17", cat: "Products", title: "OpenAI fires Sam Altman, then rehires him",
    summary: "Five days of chaos that nearly broke the company.",
    detail: "OpenAI's board removed its CEO on November 17. Most of the staff threatened to follow him to Microsoft, and he returned days later with a new board. The episode exposed how much power sat in an unusual nonprofit structure, and how dependent the company was on its people and on Microsoft.",
    links: [{ label: "Sam Altman on Wikipedia", href: "https://en.wikipedia.org/wiki/Sam_Altman" }] },
  { date: "2023-11-01", cat: "Policy and safety", title: "World leaders meet at the Bletchley Park AI Safety Summit",
    summary: "28 countries and the EU sign a declaration on the risks of frontier AI.",
    detail: "The UK-hosted summit produced the Bletchley Declaration, signed by countries including the US and China, and led to a network of national AI safety institutes. It was the first time governments agreed in writing that advanced AI poses risks worth managing together.",
    links: [{ label: "AI Safety Summit on Wikipedia", href: "https://en.wikipedia.org/wiki/AI_Safety_Summit" }] },
  { date: "2023-10-30", cat: "Policy and safety", title: "Biden signs an executive order on AI",
    summary: "The first major US action, with reporting rules for the largest models.",
    detail: "The order required developers of the most powerful models to share safety test results with the government and set out dozens of agency actions. It was revoked by President Trump on his first day back in office in January 2025.",
    links: [{ label: "Executive Order 14110 on Wikipedia", href: "https://en.wikipedia.org/wiki/Executive_Order_14110" }] },
  { date: "2023-07-18", cat: "Models", title: "Meta releases Llama 2 for commercial use",
    summary: "An open model that companies can build on without paying Meta.",
    detail: "Llama 2 was released with Microsoft as a partner and with a license allowing commercial use. It made open models a serious option for businesses and started the open versus closed split that still runs through the industry.",
    links: [{ label: "Llama on Wikipedia", href: "https://en.wikipedia.org/wiki/Llama_(language_model)" }] },
  { date: "2023-05-24", cat: "Money and markets", title: "Nvidia's forecast stuns Wall Street",
    summary: "A guide for revenue far above estimates; the stock jumps about 24% the next day.",
    detail: "Nvidia guided to roughly $11 billion of revenue for the next quarter against expectations closer to $7 billion, citing demand for AI chips. Its market value passed $1 trillion within a week. It was the moment markets realized the AI boom had a hard-dollar revenue base.",
    links: [{ label: "Nvidia on Wikipedia", href: "https://en.wikipedia.org/wiki/Nvidia" }] },
  { date: "2023-03-22", cat: "Policy and safety", title: "An open letter calls for a six-month pause",
    summary: "Thousands, including Elon Musk, ask labs to pause training beyond GPT-4.",
    detail: "The letter from the Future of Life Institute asked labs to halt training of systems more powerful than GPT-4 for six months. No pause happened, but it brought AI risk into mainstream debate and into government conversations.",
    links: [{ label: "The letter on Wikipedia", href: "https://en.wikipedia.org/wiki/Pause_Giant_AI_Experiments:_An_Open_Letter" }] },
  { date: "2023-03-14", cat: "Models", title: "GPT-4 and the first Claude launch on the same day",
    summary: "OpenAI's most capable model yet, and Anthropic's first public model.",
    detail: "GPT-4 accepted images as well as text and scored in about the top 10% on a simulated bar exam, according to OpenAI. The same day Anthropic released the first version of Claude. Together they began the competition between the labs that still defines the field.",
    links: [{ label: "GPT-4 on Wikipedia", href: "https://en.wikipedia.org/wiki/GPT-4" }, { label: "Claude on Wikipedia", href: "https://en.wikipedia.org/wiki/Claude_(language_model)" }] },
  { date: "2023-02-24", cat: "Models", title: "Meta releases LLaMA to researchers",
    summary: "The weights leak within days and open models take off.",
    detail: "LLaMA was shared only with approved researchers, but the weights were posted online within about a week. Developers built chatbots on top of it almost overnight, which showed how quickly open models could spread.",
    links: [{ label: "Llama on Wikipedia", href: "https://en.wikipedia.org/wiki/Llama_(language_model)" }] },
  { date: "2023-01-23", cat: "Money and markets", title: "Microsoft invests $10 billion in OpenAI",
    summary: "A multiyear deal that turns a research lab into a cloud-backed giant.",
    detail: "The investment extended a partnership begun in 2019 and made Azure OpenAI's exclusive cloud at the time. Microsoft quickly built OpenAI's models into Bing, Office and Windows, and set the template for later deals between cloud companies and labs.",
    links: [{ label: "OpenAI on Wikipedia", href: "https://en.wikipedia.org/wiki/OpenAI" }] },
  { date: "2022-11-30", cat: "Products", title: "ChatGPT launches",
    summary: "OpenAI puts a chat window on its language model and the internet notices.",
    detail: "ChatGPT passed one million users in five days and an estimated 100 million within about two months, which made it the fastest-growing consumer app on record at that point. It turned AI from a research topic into something people used at school and at work, and set off the race between Google, Microsoft, Meta and Anthropic.",
    links: [{ label: "ChatGPT on Wikipedia", href: "https://en.wikipedia.org/wiki/ChatGPT" }] },
  { date: "2022-10-07", cat: "Policy and safety", title: "The US restricts advanced chip exports to China",
    summary: "Chips become a tool of foreign policy.",
    detail: "Rules from the Commerce Department cut China off from Nvidia's top data center chips and from some chipmaking equipment. Nvidia responded with cut-down chips for China, which the rules were later tightened to catch. The fight over who can buy AI chips has run through every year since.",
    links: [{ label: "Nvidia on Wikipedia", href: "https://en.wikipedia.org/wiki/Nvidia" }] }
];

/* ============ End of the part you edit ============ */
