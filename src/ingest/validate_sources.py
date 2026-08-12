def classify_source(source_name: str) -> str:
    official_keywords = ["官方", "原典", "出版", "地方志", "老师确认"]
    research_keywords = ["论文", "研究", "展陈"]
    if any(word in source_name for word in official_keywords):
        return "A"
    if any(word in source_name for word in research_keywords):
        return "B"
    return "C"

