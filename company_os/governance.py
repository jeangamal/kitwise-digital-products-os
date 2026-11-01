"""Versioned, default-deny authority policy for Kitwise agents."""
from dataclasses import dataclass
from enum import Enum

POLICY_VERSION = "1.0"

class Outcome(str, Enum):
    ALLOW = "allow"
    APPROVAL = "chairman_approval_required"
    DENY = "deny"

@dataclass(frozen=True)
class Decision:
    outcome: Outcome
    reason: str

ROLE_ACTIONS = {
    "ceo": {"delegate_research", "assess_evidence", "produce_board_report"},
    "researcher": {"read_public_sources", "record_evidence", "propose_opportunity"},
    "product_manager": {"draft_specification"},
    "qa": {"inspect_product", "request_revision"},
    "growth": {"draft_listing"},
    "finance": {"calculate_unit_economics"},
    "cto": {"run_tests"},
}
PROTECTED = {"spend_money", "hire_paid_resource", "publish_marketplace", "deploy_production", "change_strategy", "change_authority_policy", "increase_budget", "enable_paid_api", "activate_new_platform"}
FORBIDDEN = {"expose_secret", "evade_platform_controls", "fabricate_evidence", "disable_audit_logging"}

def authorize(role: str, action: str) -> Decision:
    if action in FORBIDDEN:
        return Decision(Outcome.DENY, "prohibited_operation")
    if role not in ROLE_ACTIONS:
        return Decision(Outcome.DENY, "unknown_agent_role")
    if action in PROTECTED:
        return Decision(Outcome.APPROVAL, "requires_explicit_chairman_approval")
    if action in ROLE_ACTIONS[role]:
        return Decision(Outcome.ALLOW, "within_role_mandate")
    return Decision(Outcome.DENY, "role_has_no_authority")
