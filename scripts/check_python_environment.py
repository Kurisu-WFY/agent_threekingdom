from __future__ import annotations

import importlib
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
EXPECTED_SRC = (REPO_ROOT / "src").resolve()


def describe_module(module_name: str) -> dict[str, str | bool]:
    try:
        module = importlib.import_module(module_name)
    except Exception as exc:
        return {
            "module": module_name,
            "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
        }
    module_path = Path(getattr(module, "__file__", "")).resolve()
    return {
        "module": module_name,
        "ok": module_path.is_relative_to(EXPECTED_SRC),
        "path": str(module_path),
    }


def main() -> int:
    print(f"python: {sys.executable}")
    print(f"working_directory: {Path.cwd().resolve()}")
    print(f"expected_src: {EXPECTED_SRC}")
    print("sys.path:")
    for item in sys.path:
        print(f"  {item or Path.cwd().resolve()}")

    checks = [
        describe_module("config"),
        describe_module("domain"),
        describe_module("planning.route_planner"),
        describe_module("rag.hybrid_retriever"),
        describe_module("tools.travel_business_tools"),
    ]
    print("modules:")
    for check in checks:
        print(f"  {check}")

    return int(not all(bool(check["ok"]) for check in checks))


if __name__ == "__main__":
    raise SystemExit(main())
