import re

try:
    import jieba
except Exception:  # pragma: no cover
    jieba = None


def tokenize(text: str) -> list[str]:
    text = text.strip().lower()
    if not text:
        return []
    english = re.findall(r"[a-z0-9_]+", text)
    chinese_text = "".join(re.findall(r"[\u4e00-\u9fff]+", text))
    if jieba:
        chinese = [w.strip() for w in jieba.cut(chinese_text) if len(w.strip()) >= 2]
    else:
        chinese = [chinese_text[i : i + 2] for i in range(max(len(chinese_text) - 1, 0))]
    return english + chinese


def extract_entities(text: str) -> list[str]:
    candidates = re.findall(r"[\u4e00-\u9fff]{2,8}|[A-Za-z0-9_]{2,}", text)
    stopwords = {"什么", "怎么", "如何", "为什么", "介绍", "讲解", "区别", "路线", "行程"}
    return [item for item in candidates if item not in stopwords]
