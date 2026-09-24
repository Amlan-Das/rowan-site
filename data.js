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
    ticker: "$CGNX", color: "#FF6B8B", status: "Filled",
    title: "Cognex stock pitch",
    question: "What is Cognex worth?",
    approach: "A full pitch on Cognex, the machine vision company: a nine-slide deck, a DCF, a football field of valuation methods, sensitivity tables, and a comparison with Teledyne and Keyence, built on S&P Capital IQ data.",
    stack: "Excel, S&P Capital IQ, PowerPoint",
    result: "At an 8% WACC and a 23.2x terminal EV/EBITDA multiple, the DCF gave a base case of about $59 a share.",
    link: ""
  },
  {
    ticker: "$DEAL", color: "#A4E36B", status: "Working",
    title: "Deal news aggregator",
    question: "What's the latest on every deal I'm tracking?",
    approach: "Pulls Google News headlines for a watchlist of M&A deals. Next come deduping and storing articles, an LLM step that sorts them, and a web page to read them on.",
    stack: "Python, RSS, LLM API",
    result: "", link: ""
  },
  {
    ticker: "$BRIEF", color: "#FF8F42", status: "Working",
    title: "Morning market brief",
    question: "What moved overnight, and why?",
    approach: "Pulls overnight moves in equity indices, rates, FX and commodities, plus the morning's headlines. Every headline is embedded and stored in a vector database, and for each move the pipeline retrieves the stories most likely to explain it. A local Llama model writes the brief from only those stories and cites each one.",
    stack: "Python, yfinance, Chroma, Ollama",
    result: "", link: "brief.html"
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
//   current        today's price — UPDATE THIS BY HAND whenever you check (number or null)
//   currentAsOf    when you last updated "current", e.g. "Sep 2026"
//   link           link to the full deck or write-up
const PITCHES = [
  {
    ticker: "V", tvSymbol: "NYSE:V", color: "#61C3FF",
    company: "Visa Inc.",
    direction: "Long",
    date: "2026-03-06", dateLabel: "March 6, 2026",
    horizonMonths: 12, // not stated when you gave me this one — change if it wasn't 12 months
    thesis: "",
    pitchPrice: 317.00,
    target: 432.00,
    current: null, currentAsOf: "",
    link: ""
  },
  {
    ticker: "OWL", tvSymbol: "NYSE:OWL", color: "#C26EFF",
    company: "Blue Owl Capital Inc.",
    direction: "Long",
    date: "2026-03-27", dateLabel: "March 27, 2026",
    horizonMonths: 12,
    thesis: "",
    pitchPrice: null, // you gave me a target but not the price you pitched it at — add it here
    target: 8.84,
    current: null, currentAsOf: "",
    link: ""
  },
  {
    ticker: "CARR", tvSymbol: "NYSE:CARR", color: "#3CD6A0",
    company: "Carrier Global Corporation",
    direction: "Long",
    date: "2026-09-08", dateLabel: "September 8, 2026",
    horizonMonths: 12, // not stated when you gave me this one — change if it wasn't 12 months
    thesis: "",
    pitchPrice: 59.00, // you gave me one number and no target — check this is the entry price, not the target
    target: null,
    current: null, currentAsOf: "",
    link: ""
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
