"""Bounded manual production test. Uses an existing Actions secret; never logs private responses."""
import json
import os
import re
import sys
import urllib.error
import urllib.request

BASE = 'https://kitwise-company-os.jean-gamal.workers.dev'
key = os.environ.get('KITWISE_CHAIRMAN_KEY', '')
if not re.fullmatch(r'[a-fA-F0-9]{64}', key):
    print(json.dumps({'status': 'blocked', 'reason': 'existing_chairman_actions_secret_unavailable'}))
    sys.exit(1)


def request(path, method='GET', authenticated=True):
    headers = {'authorization': 'Bearer ' + key} if authenticated else {}
    req = urllib.request.Request(BASE + path, headers=headers, method=method,
                                 data=b'' if method == 'POST' else None)
    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            return response.status, json.loads(response.read(100_000))
    except urllib.error.HTTPError as error:
        # Never print the body, headers, request, exception, or access key.
        return error.code, {}
    except Exception:
        return None, {}


code, _ = request('/api/overview', authenticated=False)
if code != 401:
    print(json.dumps({'status': 'blocked', 'check': 'unauthenticated_route', 'http_status': code}))
    sys.exit(1)
code, research = request('/api/overview')
if code != 200:
    print(json.dumps({'status': 'blocked', 'check': 'authenticated_overview', 'http_status': code}))
    sys.exit(1)
latest = research.get('research', {}).get('latest') or {}
print(json.dumps({'check': 'research', 'status': latest.get('status'),
                  'source_count': latest.get('evidence_count')}))
code, production = request('/api/production')
if code != 200 or not production.get('can_generate'):
    print(json.dumps({'status': 'blocked', 'check': 'production_readiness', 'http_status': code,
                      'blockers': [v for v in production.get('blockers', [])
                                   if isinstance(v, str) and re.fullmatch('[a-z_]{1,80}', v)]}))
    sys.exit(1)
code, result = request('/api/production/run', 'POST')
allowed = {'needs_resolution', 'needs_review', 'failed', 'paused_or_already_running',
           'claim_unavailable', 'awaiting_research', 'blocked'}
status = result.get('status')
print(json.dumps({'check': 'one_production_test', 'http_status': code,
                  'status': status if status in allowed else 'unknown',
                  'error_code': result.get('error_code') if re.fullmatch('[a-z_]{1,80}', str(result.get('error_code', ''))) else None,
                  'error_stage': result.get('error_stage') if result.get('error_stage') in
                  {'brief', 'generation', 'storage', 'upscale', 'caption', 'persist'} else None,
                  'transferred': False, 'submitted': False}))
sys.exit(0 if code == 200 and status in {'needs_resolution', 'needs_review'} else 1)
