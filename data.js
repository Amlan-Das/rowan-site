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
// A company that is both a buyer and an investor in the same partner makes a two-way pair, which
// the page marks as circular. kind sets the colour: "lab", "chips" or "cloud".
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
    { id: "coreweave", name: "CoreWeave", kind: "cloud" }
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
    { from: "xai", to: "nvidia", type: "purchase", amount: "Not disclosed", what: "GPUs for xAI's data centers." }
  ],
  sources: [
    { label: "Amazon, Anthropic", href: "https://www.geekwire.com/2026/04/amazon-doubles-down-on-anthropic-with-25b-investment-mirroring-its-openai-cloud-deal/" },
    { label: "Amazon, OpenAI", href: "https://www.geekwire.com/2026/amazon-invests-50b-in-openai-deepens-aws-partnership-with-expanded-100b-cloud-deal/" },
    { label: "Google, Anthropic", href: "https://aibusiness.com/generative-ai/google-could-invest-another-40-billion-anthropic" },
    { label: "Anthropic, Microsoft, Nvidia", href: "https://www.constellationr.com/insights/news/anthropic-microsoft-azure-nvidia-ink-30-billion-compute-pact" },
    { label: "AMD, OpenAI", href: "https://tomshardware.com/tech-industry/openai-and-amd-announce-multibillion-dollar-partnership-amd-to-supply-6-gigawatts-in-chips-openai-could-get-up-to-10-percent-of-amd-shares-in-return" },
    { label: "Nvidia, CoreWeave", href: "https://www.datacenterdynamics.com/en/news/nvidia-invests-another-2bn-in-coreweave/" },
    { label: "Nvidia, OpenAI", href: "https://www.datacenterdynamics.com/en/news/nvidia-plans-30bn-investment-in-upcoming-openai-funding-round/" },
    { label: "CoreWeave, OpenAI", href: "https://www.bnnbloomberg.ca/business/2025/09/25/coreweave-expands-openai-pact-with-new-us65-billion-contract-sees-the-quarter-of-diversification/" }
  ]
};

/* ============ End of the part you edit ============ */
