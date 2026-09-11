# Reuse the locally installed Dify Python 3.12 image. This avoids a Docker Hub
# pull on networks where auth.docker.io is unavailable.
FROM langgenius/dify-api:1.16.0

# The Dify image defaults to an unprivileged user whose home directory is not
# writable during image builds. Install the MCP runtime packages as root.
USER root

# This base image has a Dify-specific entrypoint which starts Gunicorn and
# expects an `app` module. The MCP server has its own process command below.
ENTRYPOINT []

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # The Dify image activates its own virtualenv; retain its packages while
    # also exposing packages installed by this image's system pip.
    PYTHONPATH=/app/src:/usr/local/lib/python3.12/site-packages

WORKDIR /app

COPY requirements.docker.txt ./
RUN pip install --no-cache-dir -r requirements.docker.txt

COPY . ./

EXPOSE 8000

CMD ["python", "src/mcp_server.py"]
