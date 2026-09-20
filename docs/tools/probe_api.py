"""接口全量探针：对运行中的后端逐项实测，输出摘要 + 证据 JSON。

用法：
    python docs/tools/probe_api.py                      # 默认 http://127.0.0.1:8002
    python docs/tools/probe_api.py --base http://127.0.0.1:8010 --out .\\evidence

只用标准库，不需要额外依赖。
"""
from __future__ import annotations

import argparse
import json
import pathlib
import urllib.error
import urllib.request

CHAT_CASES = {
    "route_planning": {"message": "南充一天三国文化路线"},
    "culture_qa": {"message": "陈寿和南充有什么关系"},
    "history_vs_romance": {"message": "三国志和三国演义有什么区别"},
    "budget_ticket": {"message": "南充舒适型酒店预算和万卷楼票价多少钱"},
    "路线_无匹配城市": {"message": "襄阳两天三国文化路线规划"},
    "出行句式_易漏判": {"message": "从南充出发，去阆中、剑阁，再到广元旅游"},
    "带mode与history": {"message": "第二天怎么安排", "mode": "学生",
                        "history": [{"role": "user", "content": "南充一天三国文化路线"}]},
    "空串message": {"message": ""},
    "多余字段": {"message": "南充一天路线", "unknown_field": 1},
    "message类型错误": {"message": 123},
    "缺message": {},
}
STATIC = ["/", "/styles.css", "/app.js", "/map-route-core.js", "/sichuan-counties.json"]
ENDPOINTS = ["/health", "/openapi.json", "/docs", "/redoc", "/sse", "/definitely-not-here"]


def call(base: str, method: str, path: str, body=None, headers=None, timeout=60):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    hdrs = {"Content-Type": "application/json"} if data is not None else {}
    hdrs.update(headers or {})
    req = urllib.request.Request(base + path, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            out = {"http": resp.status, "content_type": resp.headers.get("Content-Type"),
                   "bytes": len(raw),
                   "headers": {k: v for k, v in resp.headers.items() if k.lower().startswith("access-control")}}
            try:
                out["json"] = json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                out["text_head"] = raw.decode("utf-8", "replace")[:120]
            return out
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        out = {"http": exc.code, "bytes": len(raw)}
        try:
            out["json"] = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            out["text_head"] = raw.decode("utf-8", "replace")[:120]
        return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8002")
    ap.add_argument("--out", default=".")
    args = ap.parse_args()
    base = args.base.rstrip("/")
    results: dict[str, object] = {}

    print(f"=== GET 端点（{base}） ===")
    for path in ENDPOINTS:
        r = call(base, "GET", path)
        results[f"GET {path}"] = r
        extra = ""
        if isinstance(r.get("json"), dict) and path == "/health":
            j = r["json"]
            extra = f"  status={j.get('status')} vector_backend={j.get('vector_backend')}"
        print(f"  {path:<22} -> {r['http']}  {r.get('content_type') or ''}{extra}")

    print("\n=== 静态前端 ===")
    for path in STATIC:
        r = call(base, "GET", path)
        results[f"GET {path}"] = {k: v for k, v in r.items() if k != "text_head"}
        print(f"  {path:<22} -> {r['http']}  {r.get('bytes')} 字节 {r.get('content_type') or ''}")

    print("\n=== POST /chat（四条意图 + 多态 + 边界） ===")
    for name, body in CHAT_CASES.items():
        r = call(base, "POST", "/chat", body)
        results[f"POST /chat [{name}]"] = r
        payload = r.get("json")
        if r["http"] != 200 or not isinstance(payload, dict) or "intent" not in payload:
            loc = None
            if isinstance(payload, dict) and isinstance(payload.get("detail"), list) and payload["detail"]:
                loc = payload["detail"][0].get("loc")
            print(f"  {name:<20} -> HTTP {r['http']} {'loc=' + str(loc) if loc else ''}")
            continue
        route = payload.get("route", "<无此键>")
        rdesc = ("ABSENT" if route == "<无此键>" else "null" if route is None else
                 f"found={route.get('found')} stops={len(route.get('stops') or [])}")
        stops = (route.get("stops") or []) if isinstance(route, dict) else []
        has_coord = any("coordinates" in s for s in stops) if stops else False
        print(f"  {name:<20} -> {r['http']} intent={payload['intent']['intent']}({payload['intent']['confidence']}) "
              f"top={sorted(payload)} route={rdesc} 坐标={'有' if has_coord else '无'} answer={len(payload.get('answer',''))}字")

    r = call(base, "OPTIONS", "/chat", headers={"Origin": "http://example.com",
                                               "Access-Control-Request-Method": "POST",
                                               "Access-Control-Request-Headers": "content-type"})
    results["OPTIONS /chat"] = r
    print(f"\n=== CORS 预检 ===\n  OPTIONS /chat -> {r['http']} {r.get('headers')}")

    out_dir = pathlib.Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "probe_api_result.json"
    out_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n证据已写入：{out_file}")


if __name__ == "__main__":
    main()
