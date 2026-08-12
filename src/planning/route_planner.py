import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SAMPLE_ROUTES = ROOT / "data" / "examples" / "routes.sample.json"


def plan_route(message: str) -> str:
    routes = json.loads(SAMPLE_ROUTES.read_text(encoding="utf-8"))
    route = routes[0]
    stops = "\n".join(
        f"{stop['order']}. {stop['spot_id']}：{stop['narrative_stage']}，{stop['duration_min']} 分钟"
        for stop in route["stops"]
    )
    return (
        "当前是路线规划框架示例，真实景点、开放时间、票价和交通耗时还需要核实。\n"
        f"路线：{route['name']}\n"
        f"时长：{route['duration_hours']} 小时\n"
        f"{stops}\n"
        "数据状态：simulated"
    )

