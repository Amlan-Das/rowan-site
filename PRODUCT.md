# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Finance recruiters and analysts (investment banking, private equity, equity research, asset management) screening Rowan Das for internships and full-time roles. They arrive from a résumé, LinkedIn or an email, give the site a minute or two, and decide whether the candidate can do the work.

## Product Purpose
Personal site for Rowan Das, Commerce student at the University of Toronto (Rotman, class of 2029). Success is a recruiter opening a pitch, the morning brief or the deals page and judging the analysis itself to be strong. Contact and the résumé stay one click away, but the work is the argument.

## Positioning
The site does not describe the work; it is the work. Stock pitches are tracked live against their targets after every trading day, and two self-built pipelines (a morning market brief and an M&A deals aggregator) publish real output to the site every weekday. A peer's résumé site cannot claim live, dated, cited output.

## Operating Context
- Pages: home (`index.html`), pitches (`pitches.html`), morning brief with industry desks and primers (`brief.html`), deals (`deals.html`).
- GitHub Actions regenerate `brief.json`, `deals.json` and `pitch-prices.json` each weekday; the pages render them client-side via `common.js` and inline scripts.
- `data.js` holds editable content (contact, projects, industries, pitches). `scripts/pitch_prices.py` parses the PITCHES block, so its format must not change.
- Deployed as static assets (Cloudflare, `wrangler.json`).

## Capabilities and Constraints
- Static HTML, one shared `styles.css`, vanilla JS. No build step.
- Element IDs and classes the scripts render into must keep working, or the scripts must be updated with them.
- Pitch rows expand to thesis, write-up, model and (on pitches.html) TradingView charts.

## Brand Commitments
- Name: Rowan Das. Footer disclaimer: "Not investment advice."
- Voice: plain, first person, specific, no hype.

## Evidence on Hand
- Pitch decks and models in `pitches/`; industry reports, LBO model and charts in `primers/`.
- Résumé at `resume.pdf`.
- Real achievements listed on the home page (case competition placings, fund selection). No testimonials exist; do not invent any.

## Product Principles
1. Show the work before describing it.
2. Every number is real, dated and sourced.
3. A recruiter reaches a pitch or the live brief in one click from the first screen.
4. The daily pipelines must never break because of a design change.
