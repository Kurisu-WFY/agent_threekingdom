def format_citation(item: dict) -> str:
    source = item.get("source", "未知来源")
    level = item.get("source_level", "C")
    return f"{source}（可信等级：{level}）"

