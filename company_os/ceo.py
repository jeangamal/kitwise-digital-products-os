"""First CEO-to-Research delegation. No fake scoring or autonomous spending."""
import hashlib
import json
from datetime import datetime, timezone

from .governance import Outcome, POLICY_VERSION, authorize
from .research import SourceError

DEFAULT_TOPICS = ("invoice workflow", "personal finance spreadsheet", "job search automation", "small business operations")
MISSING = ("verified_buyer_intent", "observed_sales", "competitor_quality", "willingness_to_pay", "marketplace_supply", "profit_and_build_costs")
MAX_EVIDENCE = 5

def run_board_cycle(store, source, topics=DEFAULT_TOPICS):
    if not topics or len(topics) > 10 or any(not isinstance(t, str) or not t.strip() or len(t) > 90 for t in topics):
        raise ValueError("invalid_research_topics")
    provenance = "synthetic_test" if getattr(source, "is_fixture", False) else "live_public_signals"
    store.ensure_mode(provenance)
    cycle_date = datetime.now(timezone.utc).date().isoformat()
    result = {"kind": "kitwise_company_os_board_report", "version": 1,
              "policy_version": POLICY_VERSION, "mode": provenance, "cycle_date": cycle_date,
              "opportunities": [], "errors": [], "chairman_actions": []}
    for topic in dict.fromkeys(topics):
        key = "research-v1:" + cycle_date + ":" + hashlib.sha256(topic.lower().encode()).hexdigest()
        delegated = authorize("ceo", "delegate_research")
        if delegated.outcome is not Outcome.ALLOW:
            raise RuntimeError("ceo_delegation_denied")
        t = store.task("researcher", "read_public_sources", {"topic": topic}, key)
        if t["status"] == "completed":
            signals = store.evidence(topic)
        else:
            allowed = authorize("researcher", "read_public_sources")
            if allowed.outcome is not Outcome.ALLOW:
                raise RuntimeError("researcher_permission_denied")
            if t["status"] == "pending":
                store.transition(t["id"], "pending", "running")
                try:
                    signals = source.search(topic)
                    for signal in signals:
                        store.save_evidence(topic, signal)
                    store.transition(t["id"], "running", "completed", {"signals_found": len(signals)})
                    store.audit("researcher", "record_evidence", "allow", "topic=" + topic)
                except SourceError:
                    store.transition(t["id"], "running", "failed", {"error": "public_source_unavailable"})
                    store.audit("researcher", "read_public_sources", "failed", "topic=" + topic)
                    result["errors"].append({"topic": topic, "code": "public_source_unavailable"})
                    continue
            else:
                result["errors"].append({"topic": topic, "code": "task_needs_operator_recovery"})
                continue
        all_signals = store.evidence(topic)
        store.upsert_opportunity(topic, len(all_signals), MISSING)
        store.audit("ceo", "assess_evidence", "allow", "topic=" + topic + ";needs_validation")
        result["opportunities"].append({"topic": topic, "status": "needs_validation",
            "score": None, "signal_count": len(all_signals), "missing": list(MISSING),
            "evidence_urls": [s["url"] for s in all_signals[:MAX_EVIDENCE]]})
    result["recommendation"] = "Research additional independent buyer, competitor and sales evidence before selecting a sellable product."
    result["chairman_actions"] = [] if not result["errors"] else ["Review and recover failed research tasks"]
    store.audit("ceo", "produce_board_report", "allow", json.dumps({"topics": len(result["opportunities"]), "errors": len(result["errors"])}))
    return result
