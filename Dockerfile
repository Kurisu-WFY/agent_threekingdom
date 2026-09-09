# 三国文化旅游智能服务 - 运行镜像
# 说明：默认只装运行时轻量依赖，避免 sentence-transformers/torch(>2GB) 进入镜像。
#       代码默认用 EMBEDDING_BACKEND=hash，不需要 torch。
#       若要改用 Milvus 向量库，请自行补装 pymilvus / milvus-lite。

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/src

WORKDIR /app

# 轻量运行依赖（国内网络：走清华 PyPI 镜像，避免连 pypi.org 被断；
#   --trusted-host 用于绕开网络侧 TLS 拦截导致的证书校验失败，仅限开发镜像）
RUN pip install --no-cache-dir --timeout 120 \
    -i https://pypi.tuna.tsinghua.edu.cn/simple \
    --trusted-host pypi.tuna.tsinghua.edu.cn \
    fastapi uvicorn starlette mcp pydantic pydantic-settings python-dotenv \
    numpy rank-bm25 jieba httpx redis

# 拷贝代码、配置、提示词、schema 与样例数据
COPY pyproject.toml README.md ./
COPY src ./src
COPY config ./config
COPY prompts ./prompts
COPY schemas ./schemas
COPY data ./data
COPY frontend ./frontend

# 启动入口：先按 README 初始化（seed/建索引/导知识），再起 uvicorn
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]
