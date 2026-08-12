# 工程架构说明

## 为什么不用纯聊天机器人结构

真实文旅 Agent 面对的是开放用户，而不是固定演示问题。只做 prompt + 文档检索会遇到几个问题：

- 用户问法多变，单查询容易漏召回。
- 历史资料来源复杂，低可信来源可能污染回答。
- 景点服务信息会变化，不能让大模型自由生成。
- 检索结果看似相关，但可能没覆盖用户问题里的关键实体。

因此当前项目采用更接近生产的 RAG 链路：

```text
用户问题
→ 意图识别
→ 查询扩展
→ 本地向量召回 + 词法召回
→ 候选合并去重
→ rerank
→ recall check
→ guarded answer
→ API / CLI 输出
```

## 当前已实现

- `src/ingest/ingest_pipeline.py`：从 `data/raw` 读取 `.jsonl/.txt/.md`，生成本地索引。
- `src/ingest/create_vector_collection.py`：创建 Milvus Lite collection。
- `src/rag/retriever.py`：混合召回，包含 query expansion、向量召回、词法召回、去重、阈值过滤。
- `src/rag/reranker.py`：综合向量分、关键词覆盖、来源等级、风险说明进行轻量重排。
- `src/rag/recall_checker.py`：检查最终上下文是否覆盖用户问题中的知识库实体。
- `src/cache/redis_cache.py`：可选 Redis 封装，用于会话、限流和外部 MCP 结果缓存。
- `src/agent/response_policy.py`：召回不足时降级，不伪造答案。
- `src/api.py`：FastAPI 服务入口。
- `src/eval_retrieval.py`：检索评测脚本。

## 当前 fallback 与生产替换

当前为了不依赖大模型和本地大向量模型，使用了 hash embedding fallback。它能跑通流程，但不是最终效果。

生产替换建议：

- Embedding：`BAAI/bge-large-zh-v1.5` 或同级中文 embedding。
- Vector DB：Milvus Lite 用于本地 Demo，Milvus Server 用于多人服务。
- Rerank：优先接 `bge-reranker-large` 或云端 rerank API。
- LLM：接 DeepSeek / OpenAI / 通义等，必须保留“只基于上下文回答”的 guardrail。
- 结构化服务数据：票价、开放时间、演出时间、天气、人流单独走数据库/API，不和历史知识混在一个向量库里。

## Milvus 与 Redis

当前默认向量后端已切换为 Milvus Lite：

```text
MILVUS_URI=data/processed/milvus_lite.db
MILVUS_COLLECTION=san_guo_culture_chunks
EMBEDDING_DIMENSION=384
```

创建 collection：

```bash
python src/ingest/create_vector_collection.py
```

入库：

```bash
python src/ingest/ingest_pipeline.py
```

注意：Milvus Lite 是本地文件型数据库，在 Windows 上不能被多个 Python 进程并行访问同一个库文件。它适合单机 Demo，不适合 Nuwax/Dify/Coze 这类平台上的并发用户。真实上线应换成 Milvus Server。

Redis 当前是可选封装：

```text
REDIS_URL=redis://localhost:6379/0
```

用途：

- 用户会话状态
- 天气/12306/POI 工具结果缓存
- 热门问答缓存
- 限流和成本控制

Demo 可以不启 Redis；多人试用建议启 Redis。

## 上线前必须补的能力

- 用户会话状态：保存用户时间、同行人、预算、兴趣、当前位置。
- 权限与隐私：定位数据需要用户授权，日志不能保存敏感信息。
- 内容审核：历史文化回答需要人工抽检，尤其是争议人物和正史/演义差异。
- 缓存：热门问题和热门路线应缓存，降低模型成本。
- 可观测性：记录 query、召回数量、rerank 分数、召回检查结果、用户反馈。
- 兜底策略：无召回、低置信、服务数据过期时，不生成确定结论。

## 外部 MCP 工具

外部实时服务通过 MCP 接入，不进入 RAG。

- 火车/高铁：`12306-mcp`
- 天气：待选择天气 MCP 或天气 API 包装为 MCP
- 景区票价：优先官方接口；没有官方接口时，用后台人工维护的数据表，不建议抓取非官方页面

详细方案见 `docs/mcp_tool_integration.md`。
