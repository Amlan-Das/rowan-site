import hashlib
import html
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta

# Search terms to pull headlines for. The broad ones catch the overall market
# story; the targeted ones give the retriever something to find for each
# instrument on the watchlist.
QUERIES = [
    "stock market today",
    "Federal Reserve",
    "S&P 500",
    "Nasdaq tech stocks",
    "Treasury yields",
    "yen dollar",
    "oil prices",
    "gold prices",
]

# Only keep headlines from roughly the last 16 hours. Older news still
# lives in the vector store, so the retriever can reach back further.
LOOKBACK_HOURS = 16


def _clean(text):
    # Google News descriptions are small chunks of HTML; strip the tags
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def fetch_headlines(query, limit=5):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({
        "q": query,
        "hl": "en-US",
        "gl": "US",
        "ceid": "US:en",
    })
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read()

    root = ET.fromstring(raw)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HOURS)
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
        if pub_date < cutoff:
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


def get_headlines():
    all_headlines = []
    seen_titles = set()
    for query in QUERIES:
        try:
            results = fetch_headlines(query)
        except Exception as e:
            print(f"Headline fetch failed for '{query}': {e}")
            continue
        for h in results:
            # Google News often returns the same story from multiple queries
            if h["title"] in seen_titles:
                continue
            seen_titles.add(h["title"])
            all_headlines.append(h)
    return all_headlines


if __name__ == "__main__":
    for h in get_headlines():
        when = h["published"].astimezone().strftime("%I:%M %p")
        print(f"[{when}] {h['title']} ({h['source']})")
