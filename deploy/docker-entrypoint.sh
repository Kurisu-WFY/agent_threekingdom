#!/bin/sh
# 三国智能服务容器入口：先按 README 做初始化，再启动 HTTP API。
set -e

echo "[entry] 1/4 初始化业务库 (seed_business_db) ..."
python src/ingest/seed_business_db.py

echo "[entry] 2/4 创建向量 collection (create_vector_collection) ..."
python src/ingest/create_vector_collection.py

echo "[entry] 3/4 导入知识文档 (ingest_pipeline) ..."
python src/ingest/ingest_pipeline.py

echo "[entry] 4/4 启动 API (uvicorn) ..."
exec uvicorn api:app --host 0.0.0.0 --port 8000 --app-dir src
