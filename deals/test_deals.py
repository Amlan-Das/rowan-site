"""Tests for the deals pipeline. They use made-up companies and a fake model, so
they run without Ollama or the internet:  python -m pytest deals/test_deals.py
"""
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

import extract  # noqa: E402
import final  # noqa: E402
import headlines  # noqa: E402
import llm  # noqa: E402
import store  # noqa: E402

NOW = datetime.now(timezone.utc)


def hl(title, source, hours_ago, snippet=""):
    return {
        "id": hashlib.sha1((title + source).encode()).hexdigest()[:16],
        "title": title, "source": source, "link": "https://example.com/" + hashlib.sha1(title.encode()).hexdigest()[:8],
        "snippet": snippet, "published": NOW - timedelta(hours=hours_ago),
    }


# ---------- fakes ----------

DEAL_WORDS = {"acquire", "acquisition", "takeover", "merger", "offer", "bid", "buy", "purchase", "proposal",
              "approaches", "deal", "agrees"}


def fake_embed(texts, kind="document"):
    """A bag-of-words vector, so headlines that share words really are closer.
    Words that all mean "a deal" count as the same word, the way a real embedding would."""
    out = []
    for t in texts:
        v = [0.0] * 256
        for w in re.findall(r"[a-z0-9]+", t.lower()):
            w = "dealword" if w in DEAL_WORDS else w
            v[int(hashlib.md5(w.encode()).hexdigest(), 16) % 256] += 1.0
        norm = math.sqrt(sum(x * x for x in v)) or 1.0
        out.append([x / norm for x in v])
    return out


# What the pretend model "reads" out of each headline, keyed by a phrase in it
READS = {
    "to acquire Brightwater": {"acquirer": "Alderwood Systems", "target": "Brightwater Foods", "stage": "Announced", "value": "$4.2 billion"},
    "weigh Alderwood": {"acquirer": "Brightwater Foods", "target": "Alderwood Systems", "stage": "Announced", "value": ""},   # buyer and target swapped
    "agrees $4.2 billion purchase": {"acquirer": "Alderwood Systems", "target": "Brightwater Foods", "stage": "Pending approval", "value": "$4.2 billion"},
    "in talks to buy Dunmore": {"acquirer": "Corvane Industries", "target": "Dunmore Labs", "stage": "Rumored", "value": ""},
    "takeover of Fenwick": {"acquirer": "Elmstead Energy", "target": "Fenwick Rail", "stage": "Pending approval", "value": ""},
    "bid for Corvane": {"acquirer": "Granite Peak Mining", "target": "Zephyr Holdings", "stage": "Terminated", "value": ""},  # invented name
}


def fake_generate(system, prompt, schema=None):
    if system is extract.SYSTEM:
        deals = []
        for m in re.finditer(r"^\[(\d+)\] [^\n]*", prompt, flags=re.M):
            for phrase, rec in READS.items():
                if phrase in m.group(0):
                    deals.append(dict(rec, n=int(m.group(1))))
        deals.append({"n": 999, "acquirer": "Alderwood Systems", "target": "Brightwater Foods", "stage": "Announced", "value": ""})  # no such headline
        return {"deals": deals}
    if system is final.DEAL_SYSTEM:
        nums = [int(n) for n in re.findall(r"^\[(\d+)\]", prompt, flags=re.M)]
        # 9999 is a headline that isn't in this deal's prompt; "[missing date]" isn't a citation
        return {"headline": "Moving along.", "sentences": [
            {"text": "The companies agreed terms.", "sources": [nums[0]]},
            {"text": "This one cites a headline that isn't there.", "sources": [9999]},
            {"text": "More coverage followed [missing date].", "sources": [nums[-1], nums[0], 9999]},
        ]}
    if system is final.OVERVIEW_SYSTEM:
        tail = prompt.split("Extra headlines:")[1] if "Extra headlines:" in prompt else ""
        extra = [int(n) for n in re.findall(r"^\[(\d+)\]", tail, flags=re.M)]
        also = [{"n": 4242, "note": "A story that does not exist [4242]."}]
        if extra:
            also.insert(0, {"n": extra[0], "note": "A real extra story without its citation."})
        return {"lede": "A busy day for deals.", "also": also}
    raise AssertionError("unexpected prompt")


@pytest.fixture(autouse=True)
def fakes(monkeypatch, tmp_path):
    monkeypatch.setattr(llm, "embed", fake_embed)
    monkeypatch.setattr(llm, "generate", fake_generate)
    monkeypatch.setattr(store, "DB_PATH", str(tmp_path / "chroma"))
    monkeypatch.setattr(store, "_collection", None)
    monkeypatch.setattr(final, "PIN_FILE", str(tmp_path / "watchlist.json"))
    yield
    store._collection = None


FRESH = [
    hl("Alderwood Systems to acquire Brightwater Foods for $4.2 billion", "Reuters", 5),
    hl("Brightwater Foods shareholders weigh Alderwood Systems offer", "Bloomberg", 9),
    hl("Alderwood Systems agrees $4.2 billion purchase of Brightwater Foods", "WSJ", 20),
    hl("Corvane Industries in talks to buy Dunmore Labs, sources say", "Reuters", 12),
    hl("Regulators open review of Elmstead Energy's takeover of Fenwick Rail", "FT", 30),
    hl("Weather turns cold across the Northeast this week", "Local News", 3),
    hl("Granite Peak Mining bid for Corvane collapses after board vote", "CNBC", 40),
]
OLD = hl("Alderwood Systems approaches Brightwater Foods with takeover proposal", "Bloomberg", 14 * 24)


# ---------- name checks ----------

def test_tokens_drop_legal_suffixes():
    assert extract.tokens("Brightwater Foods, Inc.") == ["brightwater", "foods"]


def test_appears_needs_the_name_in_the_text():
    assert extract.appears("Alderwood Systems", "Alderwood Systems to acquire Brightwater")
    assert not extract.appears("Zephyr Holdings", "Alderwood Systems to acquire Brightwater")
    # a long name may be shortened in a headline
    assert extract.appears("Warner Bros. Discovery Inc", "Paramount bids for Warner Bros")


def test_same_party_is_a_prefix_match():
    assert extract.same_party("Warner Bros", "Warner Bros. Discovery")
    assert not extract.same_party("United Airlines", "United Parcel Service")
    assert not extract.same_party("", "Anything")


# ---------- feed parsing ----------

def test_parse_feed_drops_old_items_and_source_suffix():
    def item(title, pub):
        return (f"<item><title>{title}</title><link>https://example.com/{abs(hash(title))}</link>"
                f"<pubDate>{pub}</pubDate><source>Reuters</source>"
                f"<description>&lt;a href='x'&gt;{title}&lt;/a&gt; Reuters</description></item>")
    fmt = "%a, %d %b %Y %H:%M:%S GMT"
    raw = ("<rss><channel>" + item("Fresh deal news - Reuters", NOW.strftime(fmt)) +
           item("Ancient deal news - Reuters", (NOW - timedelta(days=9)).strftime(fmt)) + "</channel></rss>")
    out = headlines.parse_feed(raw.encode(), now=NOW)
    assert [h["title"] for h in out] == ["Fresh deal news"]
    assert out[0]["source"] == "Reuters"


# ---------- extraction and grouping ----------

def test_extraction_rejects_invented_names_and_bad_numbers():
    records, calls = extract.extract_deals(FRESH)
    assert calls == 1
    names = {(r["acquirer"], r["target"]) for r in records}
    assert ("Granite Peak Mining", "Zephyr Holdings") not in names     # names not in the headline
    assert all(r["idx"] < len(FRESH) for r in records)                 # headline 999 does not exist
    assert len(records) == 5


def test_grouping_merges_one_deal_and_fixes_swapped_sides():
    records, _ = extract.extract_deals(FRESH)
    groups = extract.group_deals(records, FRESH)
    assert len(groups) == 3
    ald = next(g for g in groups if g["acquirer"] == "Alderwood Systems")
    assert ald["target"] == "Brightwater Foods"
    assert ald["idxs"] == [0, 1, 2]
    assert ald["outlets"] == 3
    assert ald["value"] == "$4.2 billion"
    assert ald["stage"] == "Announced"            # the newest headline decides


def test_pinned_deal_without_news_still_gets_a_group():
    seed = [{"acquirer": "Hollis Group", "target": "Ivy Bank", "pinned": True}]
    groups = extract.group_deals([], FRESH, seed)
    assert groups[0]["stage"] == "No recent news" and groups[0]["idxs"] == []
    assert extract.rank_deals(groups, 5)[0]["pinned"]


def test_pinned_deal_attracts_matching_headlines():
    records, _ = extract.extract_deals(FRESH)
    seed = [{"acquirer": "Corvane", "target": "Dunmore", "pinned": True}]
    g = extract.group_deals(records, FRESH, seed)[0]
    assert g["idxs"] == [3] and g["acquirer"] == "Corvane"


# ---------- the whole pipeline ----------

def run(monkeypatch, fresh=FRESH, old=(OLD,)):
    store.add_headlines(list(old))
    monkeypatch.setattr(final, "get_headlines", lambda: fresh)
    return final.build_deals()


def test_pipeline_end_to_end(monkeypatch):
    (Path(final.PIN_FILE)).write_text(json.dumps({"pinned": [{"acquirer": "Hollis Group", "target": "Ivy Bank"}]}))
    res = run(monkeypatch)
    json.dumps(res)                                   # must be serialisable for the page

    by_pair = {(d["acquirer"], d["target"]): d for d in res["deals"]}
    assert set(by_pair) == {("Hollis Group", "Ivy Bank"), ("Alderwood Systems", "Brightwater Foods"),
                            ("Corvane Industries", "Dunmore Labs"), ("Elmstead Energy", "Fenwick Rail")}
    assert res["deals"][0]["pinned"]                  # pinned deals come first

    pin = by_pair[("Hollis Group", "Ivy Bank")]
    assert pin["stage"] == "No recent news" and pin["sources"] == []

    ald = by_pair[("Alderwood Systems", "Brightwater Foods")]
    titles = [res["sources"][n - 1]["title"] for n in ald["sources"]]
    assert OLD["title"] in titles                     # retrieval pulled in the old story
    assert ald["articles"] == 3 and ald["outlets"] == 3
    assert ald["headline"] == "Moving along"          # trailing full stop stripped
    assert ald["stage"] == "Announced"                # decided by the code from the headlines, not by the model
    assert ald["value"] == "$4.2 billion"

    # The invented extra story is dropped, the real one kept
    assert [a["n"] for a in res["also"]] and all(a["n"] != 4242 for a in res["also"])
    # Off-list citations and bracketed placeholders are stripped from the text, and the stripped ones are reported
    assert "missing date" not in ald["body"] and "9999" not in ald["body"]
    assert "isn't there" not in ald["body"]           # a sentence with no valid source is dropped
    assert ald["body"].count("[") == 2                # the two sentences that kept a source
    assert 9999 in res["invalid_citations"]
    # The extra story gets its citation added by the code
    assert res["also"][0]["note"].endswith("[%d]." % res["also"][0]["n"])
    assert res["lede"] == "A busy day for deals."
    assert res["stats"]["deals_shown"] == 4 and res["stats"]["headlines_fetched"] == len(FRESH)

    # every retrieval hit refers to a numbered source
    nums = {s["n"] for s in res["sources"]}
    assert all(h["n"] in nums for e in res["retrieval"] for h in e["hits"])
    assert res["example_prompt"].startswith("Deal:")


def test_retrieval_ignores_headlines_that_name_neither_company(monkeypatch):
    unrelated = hl("Zenith Motors agrees merger with Orbit Cars in billion deal", "AP", 48)
    res = run(monkeypatch, old=(OLD, unrelated))
    ald = next(d for d in res["deals"] if d["acquirer"] == "Alderwood Systems")
    assert unrelated["title"] not in [res["sources"][n - 1]["title"] for n in ald["sources"]]


def test_empty_fetch_keeps_yesterdays_file(monkeypatch):
    monkeypatch.setattr(final, "get_headlines", lambda: [])
    with pytest.raises(SystemExit):
        final.build_deals()


def test_no_deals_found_still_produces_a_page(monkeypatch):
    monkeypatch.setattr(llm, "generate", lambda system, prompt, schema=None: {"deals": []})
    res = run(monkeypatch, old=())
    assert res["deals"] == [] and res["stats"]["llm_calls"] == 1
    assert "No deals" in res["lede"]


def test_a_failed_extraction_batch_does_not_stop_the_run(monkeypatch):
    calls = {"n": 0}

    def flaky(system, prompt, schema=None):
        if system is extract.SYSTEM:
            calls["n"] += 1
            if calls["n"] == 1:
                raise ValueError("bad json")
        return fake_generate(system, prompt, schema)
    monkeypatch.setattr(llm, "generate", flaky)
    filler = [hl(f"Filler story number {i} about nothing", "Wire", 2 + i) for i in range(10)]
    records, calls = extract.extract_deals(filler + FRESH)
    # the first batch (all filler) failed; the second still ran and found the real deals
    assert calls == 1 and len(records) == 5


def test_check_citations():
    assert final.check_citations("a [1] b [2, 3] c [9]", 5) == ([1, 2, 3], [9])


def test_console_report_prints(monkeypatch, capsys):
    final.print_report(run(monkeypatch))
    out = capsys.readouterr().out
    assert "How it was made" in out and "Alderwood Systems" in out


# ---------- checks on what the model says ----------

def test_possessives_do_not_split_a_company():
    assert extract.tokens("Schneider\u2019s") == ["schneider"]
    assert extract.same_party("Schneider's", "Schneider Electric")


def test_value_must_be_in_the_headline():
    text = "Schneider Electric to Buy PTC for $22.6 Billion"
    assert extract.canon_value("22.6 Billion", text) == "$22.6 Billion"     # spelled the way the headline spells it
    assert extract.canon_value("null", text) == ""
    assert extract.canon_value("$9 billion", text) == ""                     # not in the headline
    assert extract.canon_value("", text) == ""


def test_stage_is_read_from_the_words():
    assert extract.infer_stage("Basware completes acquisition of Trustpair") == "Completed"
    assert extract.infer_stage("Deal expected to be completed in Q4") != "Completed"
    assert extract.infer_stage("Fathom merger is called off") == "Terminated"
    assert extract.infer_stage("Corvane in talks to buy Dunmore, sources say") == "Rumored"
    assert extract.infer_stage("Kestrel agrees to buy Lumen after talks") == "Announced"
    assert extract.infer_stage("Regulators open review of the takeover") == "Pending approval"
    assert extract.infer_stage("Weather turns cold") is None


def test_a_model_claim_of_completed_needs_backing():
    texts = ["Cenovus Energy Agrees to Acquire Athabasca Oil in $4 Billion Deal"]
    assert extract.decide_stage(texts, "Completed") == "Announced"
    # With nothing clear in the words, a modest model answer stands
    assert extract.decide_stage(["Odd headline"], "Rumored") == "Rumored"
    # The newest clear headline wins
    assert extract.decide_stage(["Kestrel completes purchase of Lumen", "Kestrel agrees to buy Lumen"], "Announced") == "Completed"


def test_clean_body_keeps_only_this_deals_citations():
    body, removed = final.clean_body("Agreed [3]. Date [missing date]. Also [2, 7] and [9].", {3, 7})
    assert body == "Agreed [3]. Date. Also [7] and."
    assert removed == [2, 9]


def test_only_the_newest_headlines_are_read(monkeypatch):
    monkeypatch.setattr(final, "MAX_READ", 3)
    res = run(monkeypatch, old=())
    assert res["stats"]["extraction_calls"] == 1 and res["stats"]["deals_found"] == 1


def test_assemble_body_needs_a_source_for_every_sentence():
    body, removed = final.assemble_body([
        {"text": "Agreed terms.", "sources": [3]},
        {"text": "Nobody says this.", "sources": [99]},
        {"text": "Said twice [oops]", "sources": [3, 3, 7]},
        {"text": "", "sources": [3]},
    ], {3, 7})
    assert body == "Agreed terms [3]. Said twice [3, 7]."
    assert removed == [99]
