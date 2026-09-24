"""Everything that talks to Ollama: embeddings for retrieval, chat for writing.

Settings come from environment variables so the same code runs on a laptop
(bigger model) and in GitHub Actions (smaller model) without edits.
"""
import os

import requests

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.environ.get("LLM_MODEL", "llama3.1:8b")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")


def _post(path, payload, timeout):
    try:
        r = requests.post(f"{OLLAMA_URL}{path}", json=payload, timeout=timeout)
    except requests.ConnectionError:
        raise SystemExit(f"Can't reach Ollama at {OLLAMA_URL}. Is it running? Try: ollama serve")
    if r.status_code == 404:
        raise SystemExit(f"Ollama doesn't have '{payload['model']}'. Try: ollama pull {payload['model']}")
    r.raise_for_status()
    return r.json()


def embed(texts, kind="document"):
    """Turn a list of strings into vectors.

    nomic-embed-text is trained with task prefixes: documents and queries get
    different ones, which noticeably improves search quality.
    """
    prefix = "search_query: " if kind == "query" else "search_document: "
    data = _post("/api/embed", {"model": EMBED_MODEL, "input": [prefix + t for t in texts]}, timeout=300)
    return data["embeddings"]


def generate(system, prompt):
    data = _post("/api/chat", {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        # Low temperature keeps it factual; the bigger context window fits all
        # the numbered sources (Ollama's default window is small)
        "options": {"temperature": 0.2, "num_ctx": 8192},
    }, timeout=900)
    return data["message"]["content"].strip()
