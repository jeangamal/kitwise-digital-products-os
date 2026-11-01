"""Public-source signal discovery. Discussions are NOT verified buyer demand."""
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

HN_ENDPOINT = "https://hn.algolia.com/api/v1/search_by_date"
MAX_ITEMS = 5

class SourceError(RuntimeError):
    pass

class HNSignalSource:
    name = "hacker_news_algolia"
    is_fixture = False

    def search(self, topic):
        query = urlencode({"query": topic, "tags": "story", "hitsPerPage": MAX_ITEMS})
        request = Request(HN_ENDPOINT + "?" + query,
                          headers={"User-Agent": "KitwiseResearch/0.1 (public-market-signal-study)"})
        try:
            with urlopen(request, timeout=12) as response:
                if response.status != 200 or response.headers.get("Content-Length") and int(response.headers["Content-Length"]) > 2_000_000:
                    raise SourceError("public_source_unavailable")
                raw = response.read(2_000_001)
            if len(raw) > 2_000_000:
                raise SourceError("public_source_response_too_large")
            hits = json.loads(raw)["hits"]
        except (OSError, ValueError, KeyError, TypeError, UnicodeError) as exc:
            raise SourceError("public_source_unavailable") from exc
        results = []
        for hit in hits[:MAX_ITEMS]:
            item_id = str(hit.get("objectID", ""))
            if not item_id.isdigit():
                continue
            title = str(hit.get("title") or "").strip()[:240]
            if not title:
                continue
            results.append({"source": self.name,
                            "url": f"https://news.ycombinator.com/item?id={item_id}",
                            "title": title,
                            "published_at": str(hit.get("created_at") or "")[:32],
                            "metadata": {"points": hit.get("points"),
                                         "comments": hit.get("num_comments"),
                                         "source_type": "community_discussion_not_sales_evidence"}})
        return results

class FixtureSource:
    """Synthetic fixture; never present these items as verified live evidence."""
    is_fixture = True

    def search(self, topic):
        return [{"source": "synthetic_test_only",
                 "url": "https://example.invalid/synthetic-fixture/" + str(i),
                 "title": "Synthetic sample for software verification " + str(i),
                 "metadata": {"source_type": "synthetic_test_not_market_evidence"}}
                for i in range(2)]
