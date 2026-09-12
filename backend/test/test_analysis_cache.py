import asyncio

from services import analyzer


async def test_get_cached_analysis_reuses_same_result(monkeypatch):
    calls = {"count": 0}

    async def fake_analyze(url):
        calls["count"] += 1
        return {"has_website": True, "site_status": 200, "url": url}

    monkeypatch.setattr(analyzer, "analyze_digital_presence", fake_analyze)
    analyzer.ANALYSIS_CACHE.clear()

    first = await analyzer.get_cached_analysis("https://example.com")
    second = await analyzer.get_cached_analysis("https://example.com")

    assert first == second
    assert calls["count"] == 1


async def test_get_cached_analysis_refreshes_after_ttl(monkeypatch):
    calls = {"count": 0}

    async def fake_analyze(url):
        calls["count"] += 1
        return {"has_website": True, "site_status": 200, "url": url, "calls": calls["count"]}

    monkeypatch.setattr(analyzer, "analyze_digital_presence", fake_analyze)
    analyzer.ANALYSIS_CACHE.clear()

    first = await analyzer.get_cached_analysis("https://example.com", ttl_seconds=0)
    second = await analyzer.get_cached_analysis("https://example.com", ttl_seconds=0)

    assert first != second
    assert calls["count"] == 2


if __name__ == "__main__":
    asyncio.run(test_get_cached_analysis_reuses_same_result())
    asyncio.run(test_get_cached_analysis_refreshes_after_ttl())
