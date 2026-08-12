def expand_queries(query: str, intent: str | None = None) -> list[str]:
    query = query.strip()
    if not query:
        return []

    variants = [query]
    if intent == "route_planning":
        variants += [f"{query} 景点 顺序 时间 交通", f"{query} 叙事阶段 陈寿 蜀汉 南充"]
    elif intent == "history_vs_romance":
        variants += [f"{query} 三国志 三国演义 正史 文学差异", f"{query} 史实 演义 争议"]
    else:
        variants += [f"{query} 陈寿 三国志 蜀汉", f"{query} 南充 地方文化 史料", f"{query} 定义 背景 意义"]

    deduped: list[str] = []
    seen = set()
    for item in variants:
        if item not in seen:
            seen.add(item)
            deduped.append(item)
    return deduped

