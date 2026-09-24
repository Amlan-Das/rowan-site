"""The vector store: a local Chroma database of every headline we've pulled.

Each run adds the new headlines, so over a few days it builds up a searchable
archive. That's what lets the brief connect today's move to a story from
yesterday that the 16-hour headline window would have missed.
"""
import os
import time

import chromadb

import llm

DB_PATH = os.environ.get("BRIEF_DB", "data/chroma")
KEEP_DAYS = 14           # older headlines get deleted so the store stays small
MIN_SIMILARITY = 0.45    # hits below this are treated as irrelevant; tune after looking at real scores

_collection = None


def _col():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=DB_PATH)
        _collection = client.get_or_create_collection(
            "headlines",
            metadata={"hnsw:space": "cosine"},
            embedding_function=None,  # we embed ourselves with Ollama
        )
    return _collection


def _doc_text(h):
    # What actually gets embedded: the title plus the RSS snippet when there is one
    return f"{h['title']}. {h['snippet']}" if h.get("snippet") else h["title"]


def add_headlines(headlines):
    """Embed and store any headlines we haven't seen before. Returns how many were new."""
    col = _col()
    if not headlines:
        return 0
    existing = set(col.get(ids=[h["id"] for h in headlines])["ids"])
    new = [h for h in headlines if h["id"] not in existing]
    if not new:
        return 0

    docs = [_doc_text(h) for h in new]
    col.upsert(
        ids=[h["id"] for h in new],
        embeddings=llm.embed(docs, kind="document"),
        documents=docs,
        metadatas=[{
            "title": h["title"],
            "source": h["source"],
            "link": h["link"],
            "published": h["published"].isoformat(),
            "ts": int(h["published"].timestamp()),
        } for h in new],
    )
    return len(new)


def prune(days=KEEP_DAYS):
    cutoff = int(time.time()) - days * 86400
    _col().delete(where={"ts": {"$lt": cutoff}})


def search(query, k=4, days=3):
    """Semantic search over recent headlines. Returns hits with a similarity score (0 to 1)."""
    col = _col()
    if col.count() == 0:
        return []
    cutoff = int(time.time()) - days * 86400
    res = col.query(
        query_embeddings=llm.embed([query], kind="query"),
        n_results=min(k, col.count()),
        where={"ts": {"$gte": cutoff}},
        include=["metadatas", "distances"],
    )
    hits = []
    for doc_id, meta, dist in zip(res["ids"][0], res["metadatas"][0], res["distances"][0]):
        similarity = round(1 - dist, 3)  # cosine distance -> cosine similarity
        if similarity < MIN_SIMILARITY:
            continue
        hits.append({
            "id": doc_id,
            "title": meta["title"],
            "source": meta["source"],
            "link": meta["link"],
            "published": meta["published"],
            "similarity": similarity,
        })
    return hits


def count():
    return _col().count()
