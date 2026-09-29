# 复用本地已安装的 Dify Python 3.12 镜像，
# 避免在无法访问 auth.docker.io 的网络中从 Docker Hub 拉取。
FROM langgenius/dify-api:1.16.0

# Dify 镜像默认使用普通用户，其主目录在构建期间不可写，
# 因此以管理员用户安装 MCP 运行依赖。
USER root

# 基础镜像的专用入口会启动 Gunicorn 并要求存在 app 模块；
# MCP 服务使用下方独立指定的进程启动命令。
ENTRYPOINT []

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Dify 镜像会激活自己的虚拟环境；保留其中的包，
    # 同时允许访问本镜像通过系统 pip 安装的包。
    PYTHONPATH=/app/src:/usr/local/lib/python3.12/site-packages

WORKDIR /app

COPY requirements.docker.txt ./
RUN pip install --no-cache-dir -r requirements.docker.txt

COPY . ./

EXPOSE 8000

CMD ["python", "src/mcp_server.py"]
