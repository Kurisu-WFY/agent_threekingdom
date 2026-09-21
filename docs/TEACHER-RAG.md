# 老师资料 RAG 首批交付（2026-09-21）

## 已完成

- 实际本地模型：`E:\bge-large-zh`（目录自带 README 标识 bge-large-zh，不冒称 v1.5），1024 维、CLS pooling、归一化；查询加模型要求的中文检索前缀。
- 原目录 33 个 PDF：13 篇通过首批提取门槛，346 个片段；1 个字节一致重复不重复嵌入；19 个暂缓（OCR、选章、同页杂文、近重复或时效问题）。原始 PDF 未改。
- 新索引：`E:\codex_workplace\sanguo-rag\teacher-bge-v1\index.json`。旁边 `chunks.jsonl` 为提取正文，`manifest.json` 为逐文件处理状态，`retrieval-check.json` 为五组真实检索记录。
- 片段保留文献题名、原文件路径、原文件 SHA256、PDF 物理页码、来源等级、观点类型、提取校对状态。不把现代论文当作正史原文；旅游研究不是当前价格/开放时间依据。
- “陈寿故里”专题保证已入库两篇争议论文有机会同时进入最终上下文；实测蔡东洲与刘敏均召回。这不是对争议结论的裁定。
- 原 hash 索引保留，SHA256：`5F1CDA8DA03E8892E4371A1AFC7FDD68F5F0959704C9F812A7E95B1A01F14F93`。新旧模型索引不能混用，加载错误会明确报错。

## 本机使用

本机被 Git 忽略的 `.env` 已切换 BGE 和新索引，未修改 LLM 密钥。后端/MCP **重新启动后**读取配置；已经运行的老进程不会自动切换。

为保留昨天的 8010 服务，独立启动本轮验证服务：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File D:\agent_threekingdom\scripts\start_teacher_rag.ps1
```

默认地址 `http://127.0.0.1:8011/`，文化问答接口 `POST /chat`，`GET /health` 可确认 `embedding_backend=bge`、`embedding_dimension=1024`。首次问答需加载 CPU 模型，较慢，后续复用已加载模型。不要并行启动许多模型进程。

可问：陈寿文质辨洽的思想是什么？陈寿故里碑争议有哪些？陈寿《三国志》的正统观是什么？

## 复现与验证

使用系统 Python `C:\Program Files\Python312\python.exe`，不是 Git 跟踪的 `.venv`。PDF/BGE 附加依赖见 `requirements.rag.txt`；本机已有依赖，未重复安装或下载模型。

在项目根目录设置 `PYTHONPATH=src`，执行 `python -B scripts/probe_teacher_rag.py` 可重做真实检索（不调用付费 LLM）。

首次导入命令为 `python -B -m ingest.teacher_pdfs <老师目录> --output <新输出目录> --embed`。同时要把 `VECTOR_STORE_PATH` 指向新的索引路径；已有索引会拒绝覆盖。不要把生成文件/原论文提交到代码仓库。

## 边界与后续

- 当前是独立的老师专题索引，旧演示知识没有混入，不是全项目资料的统一重建。
- PDF 技能的质量检查流程用于分离扫描/乱码与可提取文本，并保留页码；未逐字校对全部 346 段。扫描资料需后续 OCR 和人工核对后再入库。
- 350 字窗口、50 字重叠为首版切片；参考文献续页、双栏顺序和跨页语义仍需进一步精校。
- 文献 B/C 分级为暂定使用规则，不代表学术真实性认证。领域外拒答与分数阈值尚未做系统评测。
- 开发分支 `feat/bge-teacher-rag` 从当前 dev 创建，未合并昨天的其他前端/真模型集成分支，未 push。8011 只是当前分支的 RAG 验证服务，不代表昨天所有前端接口都在此分支。
