import hashlib
import html
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta

# Search terms that pull M&A headlines from Google News. Each one is worded
# the way deal stories are worded, so between them they catch rumors, signed
# deals, regulatory reviews, closings and collapses.
QUERIES = [
    "agrees to acquire billion deal",
    "merger agreement announced",
    "takeover bid offer for company",
    "private equity buyout take-private deal",
    "in talks to acquire people familiar with the matter",
    "merger antitrust review regulators approval",
    "completes acquisition closing of deal",
    "merger terminated OR called off OR blocked",
    "acquisition shareholders approve premium per share",
    "rejects takeover offer hostile bid",
    "industrial company acquisition deal",
    "technology company acquisition deal",
]

# Deal news moves more slowly than market news and the run skips weekends, so
# look back three days. Older stories stay in the vector store for retrieval.
LOOKBACK_HOURS = 72
PER_QUERY = 10


def _clean(text):
    # Google News descriptions are small chunks of HTML; strip the tags
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def norm_title(title):
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def parse_feed(raw, now=None, lookback_hours=LOOKBACK_HOURS, limit=PER_QUERY):
    """Turn an RSS document into headline dicts, dropping anything too old."""
    root = ET.fromstring(raw)
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(hours=lookback_hours)
    items = []
    for item in root.iter("item"):
        title = item.findtext("title", "")
        link = item.findtext("link", "")
        pub_date_raw = item.findtext("pubDate", "")
        source = item.findtext("source", "")
        try:
            pub_date = parsedate_to_datetime(pub_date_raw)
        except (TypeError, ValueError):
            continue
        if not title or not link or pub_date < cutoff:
            continue

        # Titles come back as "Headline - Source"; drop the duplicate source
        if source and title.endswith(" - " + source):
            title = title[: -len(" - " + source)]

        snippet = _clean(item.findtext("description", ""))
        if snippet.startswith(title):
            snippet = snippet[len(title):].strip(" -")

        items.append({
            "id": hashlib.sha1(link.encode()).hexdigest()[:16],
            "title": title,
            "source": source,
            "link": link,
            "snippet": snippet[:300],
            "published": pub_date,
        })
        if len(items) >= limit:
            break
    return items


def fetch_headlines(query, limit=PER_QUERY):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({
        "q": query,
        "hl": "en-US",
        "gl": "US",
        "ceid": "US:en",
    })
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read()
    return parse_feed(raw, limit=limit)


def get_headlines():
    """All fresh deal headlines, newest first, with repeats removed."""
    all_headlines = []
    seen_ids, seen_titles = set(), set()
    for query in QUERIES:
        try:
            results = fetch_headlines(query)
        except Exception as e:
            print(f"Headline fetch failed for '{query}': {e}")
            continue
        for h in results:
            # Google News returns the same story from several queries, and
            # wire stories show up under many links with the same title
            key = norm_title(h["title"])
            if h["id"] in seen_ids or key in seen_titles:
                continue
            seen_ids.add(h["id"])
            seen_titles.add(key)
            all_headlines.append(h)
    all_headlines.sort(key=lambda h: h["published"], reverse=True)
    return all_headlines


if __name__ == "__main__":
    for h in get_headlines():
        when = h["published"].astimezone().strftime("%b %d %I:%M %p")
        print(f"[{when}] {h['title']} ({h['source']})")
