# 《晋书》陈寿传原文入库

## 原文件与来源边界

- 原文与译文保存在 `data/raw/primary_sources/晋书_陈寿传_用户提供.txt`。
- 用户未提供底本、译者与页码。原文保留用户转录，未把网络版本默默替换进去；在线对照见 https://www.shidianguji.com/book/HY2499/chapter/1kpb3ontluxwa 。
- 正史原文类别为 `primary_source`，文献类型A级，逐字校勘状态仍为 `user_transcription_edition_unverified`。A级只说明文献类型，不代表其中每条叙事都确证。
- 索米段保留“或云”，标为 `hearsay_record`；不得据此直接断言索米属实，需要同时参照现代研究。不能据本传证明全书成于今天的万卷楼。
- 译文中的丁廣、范醾等与原文人名不一致；译文完整保存但未向量化，不作为原文证据。
- TXT按原文段落标引，没有PDF页码，不通过PDF附件接口提供。

## 嵌入方式

专用脚本 `src/ingest/jinshu_text.py`，模型复用 `.env` 中BGE配置。先复制旧库向量到新的内存记录，追加原文向量，再校验旧记录逐项相同且原索引字节不变。输出路径必须不存在，避免覆盖旧库。

```powershell
$env:PYTHONPATH = 'D:/agent_threekingdom/src'
& 'C:/Program Files/Python312/python.exe' -B -m ingest.jinshu_text --output 'E:/codex_workplace/sanguo-rag/teacher-bge-v1-jinshu-v2/index.json'
```

此命令已执行，不能对同一输出路径重复运行；如需重建请指定另一个新路径。

结果：旧库346段全部保留，新增原文6段，新库352段。模型位于 `E:/bge-large-zh`。结果报告为新索引同目录的 `jinshu-ingest-report.json`，不包含认证密钥。

真实MCP检索检查脚本：

```powershell
& 'C:/Program Files/Python312/python.exe' -B scripts/probe_jinshu_rag.py 'E:/codex_workplace/sanguo-rag/teacher-bge-v1-jinshu-v2/index.json'
```

脚本使用真实stdio初始化与工具调用，检查师承、编书及索米传闻原句，三项通过，输出 `jinshu-mcp-check.json`。不调用付费模型。只有明确要求某书原文的提问，才优先呈现该书原文；一般问题保留原有相关性排序。来源等级不代替史实辨析。

## 切换与客户端

`.env` 的 `VECTOR_STORE_PATH` 已切换到验证通过的新索引。本项目后端随本轮重启；NuwaClaw中已有MCP进程需禁用再启用或重新启动，以清除缓存配置。排查发现Windows在协议线程启动后导入SciPy原生依赖会停滞，stdio入口现于启动协议循环前初始化本地BGE，检索推理在工作线程执行。首次启动仍需等待模型就绪。

保留旧路径可以回滚。本次不代表其他19篇待入库论文已完成向量化，也没有改变前端三章精选正文的映射清单。
