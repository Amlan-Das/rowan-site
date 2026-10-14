---
name: Rowan Das
description: A finance student's site set as his own sell-side initiation report, with live calls, daily briefs and deal coverage.
colors:
  paper: "#ffffff"
  soft: "#f3f5f4"
  chip: "#e8eeeb"
  ink: "#121614"
  slate: "#434b47"
  mist: "#646d69"
  rule: "#dde2df"
  rule-strong: "#b9c2bd"
  house: "#0f5a44"
  house-deep: "#0a4433"
  house-tint: "#e6efeb"
  house-soft: "#14684f"
  house-chip: "#1b7259"
  on-house-slate: "#d3e6de"
  on-house-mist: "#a9cbbd"
  up: "#15784a"
  down: "#b3261e"
typography:
  display:
    fontFamily: "Libre Franklin, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(38px, 5.2vw, 64px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.034em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Libre Franklin, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(28px, 2.8vw, 36px)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  title:
    fontFamily: "Libre Franklin, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
    fontFeature: "tnum"
  body:
    fontFamily: "Libre Franklin, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
  caption:
    fontFamily: "Libre Franklin, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.35
    fontFeature: "tnum"
  label:
    fontFamily: "Libre Franklin, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tnum"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: "0px"
  mark: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  2xl: "32px"
  3xl: "56px"
  gutter: "clamp(16px, 4vw, 40px)"
  band: "clamp(56px, 6vw, 88px)"
  wrap: "1180px"
components:
  button-solid:
    backgroundColor: "{colors.house}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "42px"
  button-solid-hover:
    backgroundColor: "{colors.house-deep}"
    textColor: "{colors.paper}"
  button-ruled:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "42px"
  button-ruled-hover:
    backgroundColor: "{colors.house-tint}"
    textColor: "{colors.house}"
  source-chip:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.house}"
    rounded: "{rounded.none}"
    padding: "0 6px"
    height: "22px"
  source-chip-hover:
    backgroundColor: "{colors.house}"
    textColor: "{colors.paper}"
  coverage-sidebar:
    backgroundColor: "{colors.house}"
    textColor: "{colors.paper}"
    width: "330px"
  live-note:
    backgroundColor: "{colors.house-tint}"
    textColor: "{colors.slate}"
    padding: "12px 14px"
  deal-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 20px 14px"
---

# Design System: Rowan Das

## Overview

**Creative North Star: "The Initiation Report"**

Every page reads as part of one sell-side initiation note on white coated paper. One house colour, a deep research green, owns the coverage sidebar, the report rule along the top of every page, the green bands that close each page, and anything you can click. Black ink carries the argument; cool grey hairlines carry the structure. The register is a printed research document set for a screen: dense, ruled, dated, sourced.

Density is that of a research note, not a marketing page. Tables, ledgers and figures are captioned as numbered exhibits with a source line underneath. Section breaks are ink rules, not whitespace and colour fields. There is a single typeface, Libre Franklin, worked from 400 to 800, with tabular figures on every number on the site.

The world refuses the student portfolio template: no hero gradient, no glass panels, no rounded cards with drop shadows, no pill tags.

**Key Characteristics:**
- White paper, black ink, cool grey hairlines, one house green.
- One grotesque from 400 to 800; tabular figures everywhere.
- Numbered "Exhibit n:" captions with a source line under every table and figure.
- Square corners, hairline and ink rules, no shadows, no decorative gradients.
- Green bands (the `.dark` scope) invert the palette for the coverage sidebar, contact band and footer.

## Colors

A monochrome research palette (paper, ink and greys) plus one house green, and a green and red pair kept only for direction of travel.

### Primary
- **Research Green** (house): the coverage sidebar, the 6px report rule on the masthead, solid buttons, the 3px active-tab and active-nav underline, the "Exhibit n:" numeral, citation numbers, and the closing green bands. It is the only brand hue.
- **Deep Research Green** (house-deep): hover state of solid green buttons and the résumé CTA. Never used as a surface.
- **Green Wash** (house-tint): the latest-output note on the tool cards, and the hover fill of ruled buttons. The only tinted surface on paper.

### Tertiary (signal only)
- **Gain Green** (up): positive moves, calls moving toward target, completed deals.
- **Loss Red** (down): negative moves, calls moving away from target, terminated deals.

### Neutral
- **Coated Paper** (paper): the page.
- **Grey Wash** (soft): code blocks, highlighted sources, quiet deal cards.
- **Chip Grey** (chip): background of the small numbered source links.
- **Report Ink** (ink): headlines, primary text, section rules (2px) and table head rules (1px).
- **Slate** (slate): body copy and secondary text.
- **Mist** (mist): table headers, dates, source lines, metadata.
- **Hairline** (rule): row dividers and box outlines.
- **Strong Hairline** (rule-strong): framed boxes (rating box, cover box, figure frame), underline colour of links.

### On the green bands
Inside `.dark` the tokens are redefined: paper becomes house, ink becomes white, slate becomes on-house-slate, mist becomes on-house-mist, soft and chip become house-soft and house-chip, rules become white at 20% and 42%, and the accent flips to white with house text on solid buttons. Components never hard-code band colours; they read the same tokens.

### Legacy aliases
`--navy`, `--navy-deep`, `--blue`, `--violet`, `--grad-line` resolve to the house green and `--glass-line` resolves to `--rule`; `--wash` aliases `--soft` and `--serif` aliases `--sans`. They exist only so older rules keep working. New rules use the house tokens.

### Named Rules
**The One House Colour Rule.** Research Green is the only brand hue. No second accent, no blue, no violet; the legacy names that suggest them all point at the green.

**The Direction-Only Rule.** Gain Green and Loss Red appear only where a number moved or a call or deal changed state. They are never decoration and never a brand colour.

## Typography

**Display Font:** Libre Franklin (with Helvetica Neue, Arial)
**Body Font:** Libre Franklin
**Label/Mono Font:** Libre Franklin for labels; system monospace only for code in the "how it was made" walkthroughs.

**Character:** One workhorse grotesque doing every job, the way a bank's research template does. Hierarchy comes from weight (800 for headlines, 600 to 700 for titles and captions, 400 to 500 for reading) and tight negative tracking at display sizes, not from a second family.

### Hierarchy
- **Display** (800, clamp(38px, 5.2vw, 64px), 1.0, -0.034em): one per page, the report headline under the report line. The home cover headline runs clamp(34px, 4.2vw, 58px); the sidebar name 40 to 50px.
- **Headline** (800, clamp(28px, 2.8vw, 36px), 1.08, -0.025em): section titles under a 2px ink rule. Card titles (tool cards, deal cards) use 800 at 21 to 24px.
- **Title** (600, 18px, 1.3): company names in the ledger, experience roles, story headings.
- **Body** (400, 17px, 1.6): reading text at 60 to 70ch; secondary paragraphs 15.5 to 16px in slate.
- **Caption** (700, 15px, 1.35): exhibit captions, with "Exhibit n:" generated in house green.
- **Label** (500, 13px, 1.4): table headers, tickers, dates, source lines, in mist. Sentence case.

### Named Rules
**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` is set on the body and repeated on every numeric cell. Every number on the site aligns in columns.

**The Weight Not Family Rule.** No second display face. Emphasis is a weight step within Libre Franklin.

**The Sentence Case Rule.** Labels, captions and headers are sentence case and untracked. The one uppercase setting is the rating call (BUY / SELL style, 800, 30px, +0.02em) inside the rating box, as on a research note's front page.

## Layout

A single wrap of 1180px plus a fluid gutter (clamp(16px, 4vw, 40px)). Content bands are separated by a 1px hairline and padded clamp(56px, 6vw, 88px) vertically.

The home cover is a two-column report front page: a 330px green coverage sidebar that bleeds to the left edge of the window, and the report column (report line, headline, summary, Exhibit 1). At 901 to 1200px the sidebar narrows to 270px and the ledger drops a column; under 900px the sidebar becomes a full-width green block above the report; under 640px it keeps only name, role and the coverage box.

Tool pages (brief, deals) open with a ruled report line, display headline, dek and byline, then a sticky "On this page" bar under the masthead. Their body pairs a reading column (max 68ch) with a 300px sticky key-data table that drops above the text under 960px.

Spacing steps observed in use: 4, 8, 12, 18, 24, 32 and 56px, with 10, 14 and 16px used inside rows and boxes. Ledger rows pad 18px vertically; key-data rows 10px.

**The Report Line Rule.** Every page opens with a running header: the publication name on the left, today's date on the right, 600 13.5px slate, ruled underneath in 1px ink. It always carries the date; without it, it is a kicker and does not belong.

## Elevation & Depth

Flat. Depth is never simulated; structure is conveyed by rules and tone. Ink rules (2px for sections, 1px under table heads and the masthead) do the work that shadows do elsewhere; the green bands and the grey wash are the only tonal layers.

The only `box-shadow` in the build is a 3px paper-coloured knockout ring around the slider dot (`0 0 0 3px var(--paper)`), which separates the mark from the track. It is a cut-out, not elevation.

### Named Rules
**The Ruled Not Raised Rule.** No drop shadows, no glass, no blur. If something needs separating, draw a rule.

## Shapes

Square corners everywhere: buttons, boxes, tables, chips, figure frames, deal cards. Circles appear only as data marks (the last-close dot, the closest-print ring, legend swatches, the time-elapsed dot) and the 2px tracks round by 1px. Boxes are outlined in hairlines; emphasis comes from a heavier top rule (3px house on the rating box and tool cards, 2px ink on deal cards and the key-data table) rather than a fill. Plus and minus disclosure marks are two 1.5px drawn lines that rotate, never glyphs.

## Components

### Buttons
Square and ruled; green only when solid.
- **Shape:** square (0px), 42px tall, 18px side padding, 600 15px.
- **Solid:** house green with white text; hover to Deep Research Green. On green bands it inverts to white with house text.
- **Ruled:** 1px ink outline, transparent; hover turns the outline and text house green over Green Wash.
- **Fold button:** a ruled button with a strong-hairline outline and a drawn house-green plus that turns to minus when open.
- **Focus:** 2px accent outline, 3px offset, everywhere.

### Chips
There are no pills. Status labels are plain 600 14px text coloured by role (slate, house, up, down). The one boxed chip is the numbered source link: 22px tall, chip grey, house-green numeral, fills house green on hover.

### Cards / Containers
- **Corner Style:** square.
- **Background:** paper; Grey Wash only for quiet or highlighted items.
- **Shadow Strategy:** none (see Elevation).
- **Border:** hairline sides with a heavier top rule.
- **Internal Padding:** 14 to 20px.

### Navigation
Masthead: sticky, paper, a 6px house rule on top and a 1px ink rule below. The wordmark in 800 18px with a hairline-separated affiliation; links 600 15px slate, hover house, current page in ink with a 3px house underline sitting on the ink rule. Solid green résumé CTA at the right. Under 960px the nav wraps to a horizontally scrolling row. The "On this page" bar and the industry tabs reuse the same 3px house underline for the active item.

### Ledger (signature)
The pitch table: ink-ruled header row of mist labels, hairline-ruled rows, company in title weight with the ticker beneath, right-aligned tabular numbers, and a pitch-to-target slider in the last column. A row opens with a 0.4s grid-row transition and the drawn plus rotating to a minus.

### Rating box (signature)
The top of an opened pitch: hairline box with a 3px house top rule, the call in uppercase 800 house green on the left, and a three-column key-data list (target, upside, progress) with 12.5px mist terms over 700 18px values.

### Pitch slider (signature)
A 2px hairline track with ink ticks at 16% (pitch price) and 84% (target); a 4px fill in up or down colour; an ink dot for the last close with an ink price bubble above it, and an ink ring for the closest print to target. Bars draw once on load over 1s with `cubic-bezier(.16, 1, .3, 1)`; reduced motion removes every transition.

### Exhibit
A figure with a 700 15px caption auto-numbered "Exhibit n:" in house green from a page-level counter, the table or figure, then a 13.5px mist source line. Only key data, tables and figures are exhibits.

## Do's and Don'ts

### Do:
- **Do** caption every table, ledger and figure as an exhibit with a source line beneath it.
- **Do** keep house green for the sidebar and bands, the report rule, interactive elements and the exhibit numeral.
- **Do** set every number in tabular figures and right-align numeric columns.
- **Do** separate sections with a 2px ink rule and rows with 1px hairlines.
- **Do** build green surfaces by adding `.dark` and reading the same tokens, never by hard-coding white text on green.
- **Do** date every report line and every live output.

### Don't:
- **Don't** add a second brand colour, or use the legacy navy, blue or violet names to bring one back.
- **Don't** use drop shadows, glass, blur or decorative gradients.
- **Don't** round containers, buttons or chips; circles are for data marks only.
- **Don't** use a second typeface for display, or uppercase tracked labels outside the rating call.
- **Don't** use up or down colours for anything but direction of travel.
- **Don't** use icon glyphs or icon fonts; marks are drawn with CSS lines.
