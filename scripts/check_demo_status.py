from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))


def run_check(name: str, fn: Callable[[], Any]) -> dict[str, Any]:
    try:
        detail = fn()
        ok = bool(detail.get("ok", True)) if isinstance(detail, dict) else True
        return {"name": name, "status": "OK" if ok else "WARN", "detail": detail}
    except Exception as exc:
        return {"name": name, "status": "FAIL", "detail": f"{type(exc).__name__}: {exc}"}


def check_git_branch() -> dict[str, Any]:
    result = subprocess.run(
        ["git", "-C", str(ROOT), "branch", "--show-current"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    branch = result.stdout.strip()
    return {"ok": branch == "dev", "branch": branch, "expected": "dev"}


def check_api_import() -> dict[str, Any]:
    from api import app, health

    return {"ok": True, "title": app.title, "routes": sorted(route.path for route in app.routes), "health": health()}


def check_business_tools() -> dict[str, Any]:
    from tools.travel_business_tools import estimate_hotel_budget, get_spot_ticket, list_scenic_spots, plan_budget, recommend_route

    spots = list_scenic_spots()
    ticket = get_spot_ticket("万卷楼")
    hotel = estimate_hotel_budget("南充")
    route = recommend_route(city="南充")
    budget = plan_budget("南充", nights=2, rooms=1, train_budget=300)
    ok = bool(spots) and ticket.get("found") and hotel.get("found") and route.get("found") and budget.get("found")
    return {
        "ok": ok,
        "spots_count": len(spots),
        "ticket_found": ticket.get("found", False),
        "hotel_found": hotel.get("found", False),
        "route_found": route.get("found", False),
        "budget_found": budget.get("found", False),
    }


def check_retrieval() -> dict[str, Any]:
    from rag.hybrid_retriever import HybridRetriever

    hits, report = HybridRetriever().retrieve("陈寿和南充有什么关系", intent="culture_qa")
    return {
        "ok": bool(hits) and report.passed,
        "hits": len(hits),
        "passed": report.passed,
        "warnings": report.warnings,
        "tip_if_warn": "Run: python src/ingest/ingest_pipeline.py",
    }


def check_llm() -> dict[str, Any]:
    from agent.llm_client import LLMClient
    from san_guo_core.settings import get_settings

    settings = get_settings()
    client = LLMClient()
    return {
        "ok": client.available(),
        "backend": settings.llm_backend,
        "model": settings.llm_model,
        "has_api_key": bool(settings.llm_api_key),
        "tip_if_warn": "Fill LLM_API_KEY and LLM_BASE_URL in .env when you want real model generation.",
    }


def check_external_tools() -> dict[str, Any]:
    from san_guo_core.settings import get_settings

    settings = get_settings()
    return {
        "ok": False,
        "agent_platform_configured": bool(settings.agent_platform_token and settings.agent_platform_base_url),
        "tip_if_warn": "Map/weather/12306/Agent-platform calls are intentionally not live until keys and MCP adapters are configured.",
    }


def main() -> int:
    checks = [
        run_check("git branch", check_git_branch),
        run_check("api import", check_api_import),
        run_check("business tools", check_business_tools),
        run_check("retrieval", check_retrieval),
        run_check("llm config", check_llm),
        run_check("external realtime tools", check_external_tools),
    ]

    print(json.dumps(checks, ensure_ascii=False, indent=2))
    failed = [item for item in checks if item["status"] == "FAIL"]
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
