# 三国文化旅游智能服务 - 运行镜像（统一放在 deploy/ 目录）
# 构建方式（在仓库根目录执行）：docker build -f deploy/Dockerfile -t agent-threekingdom .
# 说明：默认只装运行时轻量依赖（EMBEDDING_BACKEND=hash，无需 torch）。
#       前端由后端挂载在 / 根路径，无需单独前端服务。

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/src

WORKDIR /app

# 轻量运行依赖（国内网络：走清华 PyPI 镜像；--trusted-host 绕开网络侧 TLS 拦截，仅开发镜像用）
RUN pip install --no-cache-dir --timeout 120 \
    -i https://pypi.tuna.tsinghua.edu.cn/simple \
    --trusted-host pypi.tuna.tsinghua.edu.cn \
    fastapi uvicorn starlette mcp pydantic pydantic-settings python-dotenv \
    numpy rank-bm25 jieba httpx redis

# 拷贝代码、配置、提示词、schema、数据与前端
# 注意：docker build 的上下文须为仓库根目录（COPY 路径相对于根目录）
COPY pyproject.toml README.md ./
COPY src ./src
COPY config ./config
COPY prompts ./prompts
COPY schemas ./schemas
COPY data ./data
COPY frontend ./frontend

# 启动入口：先按 README 初始化，再启动 uvicorn
COPY deploy/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]
