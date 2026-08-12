import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_sample_knowledge_jsonl_is_valid_json() -> None:
    path = ROOT / "data" / "examples" / "knowledge_chunks.sample.jsonl"
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            assert json.loads(line)


def test_sample_routes_is_valid_json() -> None:
    path = ROOT / "data" / "examples" / "routes.sample.json"
    assert json.loads(path.read_text(encoding="utf-8"))
