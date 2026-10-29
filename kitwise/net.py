"""Small HTTP client: retry reads only; never retry ambiguous mutations."""
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .domain import Problem


def session():
    client = requests.Session()
    retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504],
                  allowed_methods={"GET"}, respect_retry_after_header=False)
    client.mount("https://", HTTPAdapter(max_retries=retry))
    return client


def download(client, url, destination, limit, params=None):
    try:
        with client.get(url, params=params, timeout=(10, 60), stream=True) as response:
            response.raise_for_status()
            total = 0
            with destination.open("wb") as output:
                for chunk in response.iter_content(1024 * 1024):
                    total += len(chunk)
                    if total > limit:
                        raise Problem("download_limit_exceeded")
                    output.write(chunk)
    except Problem:
        raise
    except Exception:
        raise Problem("source_download_failed") from None
