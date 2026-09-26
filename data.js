/* =====================================================
   EDIT HERE. This file is shared by index.html and pitches.html,
   so anything you change here updates both pages at once.
   ===================================================== */

// Your links. Both pages' nav, hero, contact section, and terminal read from here.
const CONTACT = { 
  email: "rowanamlan@gmail.com",
  linkedin: "https://www.linkedin.com/in/dasrowan",
  github: "https://github.com/Amlan-Das"
};

// Upload your résumé PDF next to index.html with this exact file name.
const RESUME = "resume.pdf";

const TAPE = [
  "Rotman Commerce, Finance and Economics, class of 2028",
  "PwC, U.S. Corporate Tax, Montreal",
  "RCSF, Industrials coverage",
  "KKR PE Case Competition, Top 8",
  "UofT AI Collective, VP Finance",
  "Allure Ventures, Vancouver, 2025"
];

// status: "Pending", "Working" or "Filled"
// result: your finding in 2-3 sentences (leave "" until you have one)
// link:   GitHub repo, deck or write-up (leave "" until it exists)
const PROJECTS = [

  {
    ticker: "$BRIEF", color: "#A4E36B", status: "Complete",
    title: "Morning market brief",
    question: "What moved overnight, and why?",
    approach: "Pulls overnight moves in equity indices, rates, FX and commodities, plus the morning's headlines. Every headline is embedded and stored in a vector database, and for each move the pipeline retrieves the stories most likely to explain it. A local Llama model writes the brief from only those stories and cites each one.",
    stack: "Python, yfinance, Chroma, Ollama",
    result: "Success", link: "brief.html"
  },
  {
    ticker: "$TONE", color: "#FFC730", status: "Pending",
    title: "Earnings call and Fed reader",
    question: "Did the tone change, and did the market care?",
    approach: "Reads earnings call transcripts and FOMC statements, pulls out guidance changes and shifts in tone from the last release, then lines them up against the stock or yield move that followed.",
    stack: "Python, pandas, LLM API",
    result: "", link: ""
  },
  {
    ticker: "$NOTE", color: "#3CD6A0", status: "Pending",
    title: "Structured note parser",
    question: "What does this note actually pay, and when?",
    approach: "Reads pricing supplements for structured notes filed on SEC EDGAR and pulls the key terms into a table: underlying, barrier, coupon, maturity and call features. Anything unusual gets flagged for a closer read.",
    stack: "Python, SEC EDGAR, LLM API",
    result: "", link: ""
  },
  {
    ticker: "$SENT", color: "#61C3FF", status: "Pending",
    title: "News sentiment vs. price",
    question: "Does the news move the stock, or is it already priced in?",
    approach: "Builds on the deal news aggregator. Scores the sentiment of news on a group of stocks, then tests whether sentiment shifts show up before price moves, or only after.",
    stack: "Python, pandas, LLM API",
    result: "", link: ""
  },
  {
    ticker: "$BKTS", color: "#C26EFF", status: "Pending",
    title: "Strategy backtest",
    question: "Would this trade have made money after costs?",
    approach: "Backtests a simple momentum or mean-reversion strategy with transaction costs and no look-ahead bias, and reports the Sharpe ratio and worst drawdown.",
    stack: "Python, pandas, price data",
    result: "", link: ""
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
    current: null, currentAsOf: "",
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
    current: null, currentAsOf: "",
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
    current: null, currentAsOf: "",
    link: "pitches/carrier-carr-industrials-report.pdf#page=19"
  }
];

// Toolbox: the spinning sphere and the list beside it both use this.
const SKILLS = [
  { group: "Valuation and modeling", color: "#FF8F42", items: ["DCF", "Comparable companies", "3-statement modeling", "Sensitivity tables", "Football field", "Pitch decks"] },
  { group: "Tax and accounting", color: "#FFC730", items: ["ASC 740", "NOLs", "Section 382", "Deferred taxes", "Book-to-tax", "Tax due diligence", "CPA (in progress)"] },
  { group: "Code and AI", color: "#3CD6A0", items: ["Python", "RSS pipelines", "LLM workflows", "Agentic workflows", "Claude Code", "Excel automation"] },
  { group: "Data and tools", color: "#61C3FF", items: ["Excel", "S&P Capital IQ", "PowerPoint"] }
];
/* ============ End of the part you edit ============ */
