# 演示前检查（2026-09-28）

## 真实入库情况

当前配置：BGE、1024维、本地模型 `E:/bge-large-zh`；索引 `E:/codex_workplace/sanguo-rag/teacher-bge-v1/index.json`。

读取该目录manifest.json确认：13篇included、346个片段；19篇deferred、1篇duplicate。因此并非老师资料全部入库。演示前不重建现有索引，也不把需要OCR的文件强行入库。

- 实际BGE加载/编码/索引检索：`src/rag/bge_store.py`（load_model / BGEVectorStore.upsert / search）。
- 老师PDF分类、提取、切片入库：`src/ingest/teacher_pdfs.py`。
- 通用入库：`src/ingest/ingest_pipeline.py`。
- 后端选择：`src/rag/vector_store.py`。
- `src/rag/embeddings.py` 是旧HashEmbedding，不是当前使用的BGE实现。

## 本轮公开资料

成都武侯祠博物馆官网 https://www.wuhouci.net.cn/ 已查询：地址武侯祠大街231号；全价50元、半价25元（适用资格见官网）；常规08:30—18:30，17:30停止售票，特别活动以公告为准。写入景点查询返回与网页提示词，未重嵌入文献知识库。官方页面资料与演示估算分开，不宣称实时库存。
