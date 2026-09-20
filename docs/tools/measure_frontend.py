"""量化前端体积与请求数：首屏脚本/样式/图片、运行期地图数据、最大文件排行。

用法：
    python docs/tools/measure_frontend.py                 # 默认量 <仓库>/frontend
    python docs/tools/measure_frontend.py --fe path\\frontend

只用标准库。对应 docs/FRONTEND-ISSUES.md 的 F1 / F2 / F3。
"""
from __future__ import annotations

import argparse
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parents[2]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fe", default=str(REPO / "frontend"))
    args = ap.parse_args()
    fe = pathlib.Path(args.fe)
    if not fe.is_dir():
        raise SystemExit(f"目录不存在：{fe}")

    all_files = [(p.relative_to(fe).as_posix(), p.stat().st_size) for p in fe.rglob("*") if p.is_file()]
    total = sum(s for _, s in all_files)
    print(f"{fe}\n共 {len(all_files)} 个文件，{total / 1024:.0f} KB\n")

    html = (fe / "index.html").read_text(encoding="utf-8")
    scripts = re.findall(r'<script[^>]*src="([^"]+)"', html)
    styles = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"', html)
    images = sorted(set(re.findall(r'(?:src|href)="(assets/[^"]+)"', html)))

    def size(name: str) -> int:
        p = fe / name.split("?")[0]
        return p.stat().st_size if p.exists() else 0

    print("=== 首屏同步加载（index.html 直接引用） ===")
    first = [("index.html", size("index.html"))] + [(s, size(s)) for s in styles] + [(s, size(s)) for s in scripts]
    for name, s in first:
        print(f"  {s / 1024:9.1f} KB  {name}")
    print(f"  小计 {sum(s for _, s in first) / 1024:.0f} KB / {len(first)} 个请求")

    print("\n=== 运行期 fetch 的数据（地图/故事） ===")
    runtime = [(n, s) for n, s in all_files if n.endswith(".json") and "sichuan" in n]
    for n, s in sorted(runtime, key=lambda x: -x[1]):
        print(f"  {s / 1024:9.1f} KB  {n}")
    print(f"  小计 {sum(s for _, s in runtime) / 1024:.0f} KB")

    print("\n=== 图片 ===")
    for n, s in sorted([(n, s) for n, s in all_files if n.endswith((".jpg", ".png", ".webp"))], key=lambda x: -x[1]):
        print(f"  {s / 1024:9.1f} KB  {n}")

    print("\n=== 最大的 8 个文件 ===")
    for n, s in sorted(all_files, key=lambda x: -x[1])[:8]:
        print(f"  {s / 1024:9.1f} KB  {n}")

    js = [(n, s) for n, s in all_files if n.endswith(".js")]
    tests = [(n, s) for n, s in all_files if n.endswith(".test.cjs")]
    print(f"\n=== 分类 ===\n  脚本 {len(js)} 个 / {sum(s for _, s in js) / 1024:.0f} KB；"
          f"测试 {len(tests)} 个 / {sum(s for _, s in tests) / 1024:.0f} KB（不参与运行）")
    print(f"  index.html 引用：<script> {len(scripts)} 个，<link rel=stylesheet> {len(styles)} 个，图片 {images}")


if __name__ == "__main__":
    main()
