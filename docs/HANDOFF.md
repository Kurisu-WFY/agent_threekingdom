# 交接记录 · HANDOFF

### 2026-10-06 · 游客展示文案自然化
- 新增frontend/presentation-copy.js，仅转换游客显示文字，原始回答、数据状态与核查规则不变。脚本、表单、用户原话、代码及块引文保留。不调整CSS或布局，不修改平台提示词与MCP原始输出。
- 改用位置概览、景区公告、原文阅读等具体措辞；保留演示预算、非实时报价及不可导航等边界。
- 25组本地回归通过；两组固定8002的旧浏览器脚本连接拒绝。8010独立浏览器确认当前可见旧标签0处、动态转换生效且保留估算说明；未调用远端女娲生成。

### 2026-10-06 · 陈寿资料库选段入库
- src/ingest/chenshou_library.py审核11文献37段，校验SHA256、行号与首尾标记，清理导航、目录、重复和严重乱码；原典6、考辨/现代争议5。原典A，考辨按项目B研究处理，不照搬包内等级。
- 新库E:/codex_workplace/sanguo-rag/teacher-bge-v1-chenshou-library-20261006/index.json共570条，旧533记录与原索引逐项相等。详细选文与来源见同目录chenshou-library-report.json；原始TXT没有修改。
- 实测发现繁体陳壽及称字承祚被主题过滤遗漏，已适配常见字形与审核实体，仍保留具体主题匹配；不改引文。4入库/8文献/7闭环断言与6类真实stdio分页通过。
- .env只切VECTOR_STORE_PATH，密钥未动，未提交本地数据或资料。新8010服务进程47500／工具会话99099；客户端运行中MCP须重载。未调用远端模型生成答案，未改前端。操作边界见CHENSHOU-LIBRARY-RAG.md。

### 2026-10-06 · 资料库与Git诊断
- 用户指定以后本机D:/agent_threekingdom直接本地dev修改；已更新AGENTS协作规则，不新建分支、不自动推送。四个原有未跟踪教师补库文件保留。
- 新资料库索引82条，标记可用且非失败/未分类60条，其中正式目录34条；60条SHA256吻合但不代表逐字校勘。适合补华阳国志、诸葛氏集上表、历代索米/国不置史考辨与目录著录；不提供实时交通或酒店。
- 识典晋书TXT带大量导航与其他卷目录，上表TXT也有站点导航；同文异底本须归并，目录的A清人考史/B演义不能直接照搬项目来源等级。说明书所谓范頵写法与实际HY2499文本范𫖳不一致，须以正文及底本核校；本轮只审查，未入库。
- 当前HEAD/origin/dev均821460d，远端ls-remote确认；相对昨天b5144b0无已提交后端变化。7项女娲回归、7项闭环断言通过，没有实测远端模型效果。
- PyCharmCE2025.1日志今日17:19首次Git版本探测无响应、最终耗时38171ms；17:28已成功识别D:/Git/cmd/git.exe（2.45.1）。项目vcs.xml映射正确，HTTP代理USE_PROXY_PAC=true。终端远端读取成功不证明推送认证成功；尚无当前可视化推送错误可重现，建议先IDE Git测试，再区分普通Git操作与Gitee插件API登录。未改IDE、代理、令牌或Git凭据。

### 2026-10-05 · 有限反思与证据纠错
- src/agent/reflection.py实现真实核查、补检索、模型修订与再核查，最多两轮；阻断问题未解决或补查中断改为证据摘录。不是全面语义验证，不输出内部推理。
- 本地文化回答与网页女娲接通；女娲沿用原会话，增加等待上限。新MCP史料核查和行程约束核查须在客户端重载；系统提示词文件已改但未远程发布。行程约束工具已验证，旧规划入口不保证自动重规划。
- 7项闭环断言、女娲7/生成4/网页提示词3回归、非浏览器前端回归通过。真实stdio MCP故里碑断言风险与时间/预算超限通过。真实浏览器以标明夹具的响应验证折叠说明和1440/375无横向溢出；保持旧布局，遵循impeccable产品设计约束。
- 本轮仅重启原8010服务，进程41732／工具会话56294；主线程预热BGE避免原生数值库首次在线程加载卡住。没有改密钥、向量索引或其他进程。操作与边界见REFLECTION.md。

### 2026-10-05 · 文化回答完整证据策略
- 用户要求史实为先、所有相关文献逐篇列出。新增src/rag/document_evidence.py供MCP与本地编排共用：全索引检索后按人物／主题／相关性过滤，每文献三条代表证据，不限制文献数为五；保留旧retrieve兼容路径与原典指定出处优先。
- MCP新增offset/page_size参数，返回references/has_more/next_offset，模型须续页；前端自然语言提示词每轮带新规则，游客不显示分页或诊断。女娲平台系统词文件已更新但没有远程发布；MCP旧进程须重载才能拿到新定义。
- 本地模型上限4096、真实题名缺项补列；无模型按所有相关文献整理摘录，不再仅前三段。该上限和补列不控制女娲平台生成器。
- 22项单元／断言测试、故里碑／晋书编书／王平／张飞四类真实stdio分页检索通过；报告保存于当前索引旁document-evidence-check.json。没有重新嵌入或改动知识库，未修改前端排版、密钥或平台发布状态。
- 范围与操作见docs/CULTURE-ANSWER-STRATEGY.md。算法阈值仍可能漏召回；清单限本次已入库且实际返回相关资料，不称穷尽学界研究。
- 本轮8010服务已按新策略重启，当前进程3564／工具会话53575，健康检查ok；此前35112已正常停掉，没有操作其他Python进程或Docker。

### 2026-10-05 · 景点人物正史补库
- 用户授权从前一份PDF补充选编本未收人物。当前业务库六处景点：万卷楼、王平墓、汉桓侯祠、剑门关、昭化古城、成都武侯祠；中华书局扫描本23篇选编并不覆盖谯周、王平，且本轮未OCR。
- src/ingest/sanguozhi_people.py从E:/Download/三国志.pdf抽取10篇／传段、181条，保留真实PDF页码；补入刘备、诸葛亮、关张马黄赵、庞统法正、霍峻、谯周、王平、姜维、邓艾、黄权。陈寿自身生平沿用已入库《晋书》。不是两份书均已全部入库。
- 新索引E:/codex_workplace/sanguo-rag/teacher-bge-v1-sanguozhi-v1/index.json共533条，旧352条与旧索引逐项／字节检查未变，模型身份不变。.env只更换VECTOR_STORE_PATH；不提交密钥或向量索引。
- tests/test_sanguozhi_people.py两项断言通过；scripts/probe_sanguozhi_rag.py五项真实stdio MCP检索通过，报告在新索引旁。NuwaClaw旧MCP须停用再启用、新建会话；未代操作客户端发布或推送。
- 电子底本未核定，含转录字形且未逐字校勘；A级不等于每条史实已证。注释、传闻必须归属，现代墓址、祠庙及演义另需对应资料。覆盖范围详见docs/SANGUOZHI-PEOPLE-RAG.md。
- 增量库回归发现指定《晋书》原文查询提及三国志时，原有书名子串规则同时保留两书；修正为显式书名号书名优先。两项出处排序、三项晋书和两项新书断言通过；晋书三项真实stdio MCP复验通过。
- 本轮仅重启此前本轮持有的8010服务；修正出处规则后当前进程35112／工具会话49787，健康ok，新《三国志》PDF出处接口200。未改前端布局、平台提示词或其他服务。

### 2026-10-05 · 用户提供《晋书》陈寿传入库
- 原文和译文保存在data/raw/primary_sources/晋书_陈寿传_用户提供.txt；原文字句保留用户转录，底本未注明，按原文段落不造PDF页码。译文人名有不一致，暂不向量化。A级是正史类型，不把“或云”索米说当事实；不从本传证明万卷楼为全书成书地点。
- 专用src/ingest/jinshu_text.py新增6段BGE向量，352段新库E:/codex_workplace/sanguo-rag/teacher-bge-v1-jinshu-v2/index.json；旧teacher-bge-v1索引及346段向量逐项不变。初次验证库teacher-bge-v1-jinshu保留未启用，后续加主题标题改善检索。没有处理剩余19篇全文入库。
- .env仅切换索引路径，不提交凭据。新增三项原文边界、一个指定原文优先测试；原章节四项断言通过，共8项runpy断言（未运行pytest）。scripts/probe_jinshu_rag.py真实stdio三种问题原句召回通过，报告在新库目录。
- Windows首轮模型初始化卡在SciPy BLAS原生依赖导入：stdio入口改为协议线程启动前初始化模型，并限制数值库线程，检索移到工作线程。真实stdio冷启动恢复；客户端第一次启用仍需等待模型加载。
- 仅明确某书原文请求优先对应primary_source，普通问题排序与故里争议逻辑保留。PDF目录过滤TXT，避免纯文本被以PDF附件响应。现有女娲进程需禁用再启用MCP，未代操作平台发布；本机8010后端现为进程3300/工具会话39570，健康检查及三章接口通过。

### 2026-10-05 · 首页故事卡片排版修复
- 用户截图发现简介被挤入24px标记栏；根因是简介缺少跨列规则，固定156px高度与20px信息行不能容纳论文映射内容，异步加载还追加了第二个信息块。
- 仅修改首页故事卡片：简介跨列，行高及总高度随内容增长，原信息块就地更新，重复加载不新增节点；375px时故事卡片与预览上下排列，不调整全站布局。
- 23组非浏览器测试通过，增加内容重复加载、简介顺序及进度节点保留断言。真实375/800/1440px验证正文、信息、操作区不重叠/未越界/无页面横向溢出，控制台无错误；桌面与手机截图在output/playwright/story-card-fixed-*.png，已目视核验。测试视口恢复1440px。
- 样式与脚本版本更新防旧缓存；8010服务保持运行，四个用户未跟踪文件不动，未推送。

### 2026-10-05 · 教师PDF到阅读栏目与地点映射完成
- 保留布局；三章编纂背景、人物关系，四条独立争议观点及五处地点文化介绍已映射。陈寿摘要/隐藏对话背景同步论文内容，阅读地点按钮保持当前章节。
- 每栏单独解析来源与PDF页码，B级现代研究与C级旅游线索分层；正史、演义缺证据部分未填充，未将历史交通描述转换成现代路线，坐标仍为空。
- 八篇引用PDF链接均200；两篇尚未向量化的补充文献按清单文件名、完整SHA256和PDF页数核验，不改索引。当前v1仍13篇，v2提取32篇不等于全量入库。
- 23组非浏览器前端测试、4项runpy后端断言通过，未运行pytest。浏览器第三章及两家争议观点真实显示、桌面无横向溢出/控制台错误；未宣称全站浏览器回归通过。
- 本机8010当前进程23748（工具会话68220），取代此前40700/9772；保留四个原有未跟踪RAG文件，未推送远端。

### 2026-10-05 · 新版前后端与陈寿阅读章节适配
- 用户授权跨界适配，分支 feat/frontend-backend-content；保留新版布局及四个原有未跟踪RAG文件。
- 三章教师论文内容映射、索引文献编号与页码解析、PDF白名单链接；新增现代研究类别，未伪造正史原文或陈寿行走路线。内容清单与说明见 docs/FRONTEND-CONTENT-ADAPTER.md。
- 修复新住宿档位兼容；天气改为前端/MCP共用高德日夜预报；网页酒店搜索复用RollingGo授权，仅默认一晚两成人城市查询，尚未支持档位过滤/多晚/房型交互。
- 章节接口与四条文献引用解析、天气真实调用、酒店授权检查通过；四组前端回归和两项后端断言通过。当前Python无pytest，后端断言通过runpy直接执行，未宣称pytest通过。浏览器实际确认三章目录、详情和文化阅读正文，无控制台错误。酒店报价尚未本轮实测；全站回归尚未完成。
- 当前v2只有文本提取未见索引，未改.env或覆盖旧索引。正史原文尚未新增入库，仍建议补《晋书》陈寿传、《华阳国志》相关传记及《三国志》原文/裴注。
- 本轮启动本机8010服务进程40700（工具会话44155），供当前浏览器查看；未停止其他服务、未推送远端。

### 2026-10-03 · 回答与高德地点、路线地图衔接
- 新增frontend/amap-chat.js：回答“在地图查看提及地点”进入现有出发核验页，按已知景点/城市名搜索高德候选；可以修改城市与关键词，核对地址后查看单点或带入路线目的地。名称识别只用于搜索，未读取回答坐标。未知地名仍可在表单手动输入。
- 智能体Markdown本机地图链接点击后由AmapPlanner.openRoute同页加载，校验本机地址、端口、路径、地点ID及方式，不接管外部地址。真实轨迹仍从后端重新查询，不相信回答中的路线形状；多站点需要逐段链接，不是整程自动合图。现有文化地图不变。
- 使用现有视觉令牌和布局，无重构。地图加载有错误反馈；搜索结果经DOM文本输出，过期异步响应隔离。新增回归、全部非浏览器前端测试和3项提示词测试通过。
- 本机8010真实万卷楼搜索底图、行署校区至万卷楼公交地图和同页链接接管通过；375px无横向溢出。截图output/playwright/amap-chat-route.png与amap-chat-mobile.png。旧浏览器测试硬编码8002未启动而连接失败，未声称该批通过；本轮浏览器验收使用8010。平台系统提示词未代发布，本机用户提示词按请求读取。

### 2026-10-03 · RollingGo住宿查询
- 后续授权已成功保存：真实南充酒店搜索、指定酒店房型查询通过；远程女娲实际调用酒店搜索返回183元/晚参考价（2026-10-04至10-05，2成人1间房）。未执行交易。下列初次授权待办已解除。
- 使用用户安装的RollingGo技能官方代理，新增住宿授权状态、酒店搜索、房型报价三项MCP能力。仅开放查询，不开放锁价、下单、支付或取消订单；凭据由官方登录流程本机保存，不写入仓库。
- 实现位于src/tools/rollinggo_tools.py，配置示例在.env.example，使用说明见docs/ROLLINGGO-HOTELS.md；项目系统提示词与每次请求读取的用户提示词已添加住宿规则，前端工具标签为中文。
- 5项新增测试、提示词回归和前端格式化回归通过；stdio发现通过，远程女娲智能体实际调用住宿状态工具成功。当前本机仍未登录，旧授权等待超时后已发起新授权；真实酒店与房价尚未验收，不可宣称已可用。平台系统提示词未代发布。
- 当前任务分支feat/rollinggo-hotel-tools，未推送或合并；保留用户已有的4个未跟踪RAG文件。

### 2026-09-29 · 高德交互地图
- 新增 `amap_map_api.py` 配置与固定高德上游代理。网页只获得JS API Key，securityJsCode仅服务端注入；拒绝路径穿越、跨站浏览器请求、无效回调及重定向，错误不回显密钥。本机服务绑定127.0.0.1，公开部署前需认证与限流。
- REST路线返回真实分段轨迹，前端 `amap-map.js` 用高德底图绘制、切换方案、标记起终点，缺失路段不画直线补齐。保持原聊天和行程布局。地图SDK需联网。
- MCP路线返回本机 `map_url`，不向模型输出大量坐标。智能体按本地提示词附「查看路线地图」链接；点击链接再点击加载，后端按地点ID重新核验，可查看最新路线（不保证与先前结果完全相同）。当前是逐段路线地图，不是多站点整程自动合图。
- 真实南充公交底图和路线显示通过；375px无页面横向溢出；9项后端测试、全部前端回归、stdio MCP地图链接实测通过。截图在output/playwright/amap-map-desktop.png和amap-map-mobile.png。平台系统提示词未代发布；客户端MCP需重载。

### 2026-09-29 · 高德前端与MCP接入
- 共用实现 `src/tools/amap_tools.py`，REST为 `POST /api/travel/amap/places`、`POST /api/travel/amap/route`；MCP新增 `search_amap_places` 和 `get_amap_route`。密钥只读取服务端 `AMAP_WEB_SERVICE_KEY`，不输出到网页或错误消息。
- 出行助手新增地点搜索、起终点确认与公交/驾车/步行查询，保留既有智能体规划入口；高德GCJ02坐标不送入旧WGS84路线工具。返回距离、预计时长、公交费用、分段指引及查询时间，不代表实时到站或购票。
- 7项新增后端测试、全部前端回归通过；真实三种交通请求及stdio MCP搜索/公交成功；网页实调西华师范大学行署校区到万卷楼成功（约32分钟、2元），375px截图在 `output/playwright/amap-mobile.png`。
- 8010后端已启动。NuwaClaw现有MCP须禁用再启用并新建会话以发现工具；本地提示词已更新，平台系统提示词仍需用户同步发布。没有冒充云端智能体完整自主调用验收。未改动此前RAG任务的四个未跟踪文件。

### 2026-09-28 · 演示前整理
- 用户要清理“暂未接入”等占位语。显示文案改成可向智能体询问/官方渠道确认等可操作说明，不把未实现功能标成已实现；技术诊断继续隐藏，修正检索兜底回答的意图和召回报告复述。
- 官网 https://www.wuhouci.net.cn/ 已核对武侯祠地址、50元全价/25元半价和常规08:30—18:30、17:30止售；REST景点与MCP列表/票价查询补入，附来源，不声称实时库存。网页提示词可直接使用这份有日期的参考资料。
- BGE配置和实际manifest/index检查，13篇346段，19篇deferred、1篇duplicate；并非全量。代码 src/rag/bge_store.py，PDF流程 src/ingest/teacher_pdfs.py。未修改原索引，未重新嵌入。详见 DEMO-RAG-STATUS.md。
- 19组前端、7项travel API、3项提示词测试通过，清理旧文案断言。8010本项目后端已重启，成都景点HTTP实测通过。未替用户同步Nuwa客户端运行中的MCP或发布平台系统提示词。

### 2026-09-28 · 规划统一交给智能体、解除南充输入限制
- 用户明确要求规划动作由智能体完成。目的地城市卡片、景点卡片和两种规划表单在正常页面均走SGTJourney.ask → /chat/stream；使用现有pending草稿保护，不另造LLM通道。新表单可填写多城市和任意景点，新增成都/绵阳/德阳/巴中/达州目录筛选入口；目录无数据时仍可提交该城市规划。
- 更新系统/网页提示词：范围川东北及四川其他三国文化目的地，成都不归川东北；不得将南充专用工具/三城市天气冒充通用服务，目录缺项不代表没有景点。没有新填未核验景点或坐标。平台系统提示词仍须用户同步。
- 规划入口preserveMap，防止说明文字地名触发自动地图连线。保持原界面尺寸，使用impeccable文案规范区分输入范围与资料覆盖。
- 19组前端回归、3项提示词测试通过。真实浏览器点击成都表单和万卷楼卡片，拦截/chat/stream检查payload与模拟回包显示；没有消费真实女娲请求，不声称模型规划质量或新城市检索已验证。截图已检查，测试浏览器关闭。

### 2026-09-28 · 演示费用补齐
- 用户明确允许未知费用使用演示数字。南充规划默认住宿200元/间夜、餐饮60元/人天、市内交通30元/人天、门票预留30元/人/所选地点；用户输入含0优先，半日按1天额度。实际报价仍未知，total为空、estimated_total为估算合计，逐项记录item_status。
- UI沿用现有布局，明确标注演示与用户额度。同步提示词边界；8项规划、3项提示词测试通过。已重启本项目8010后端；Nuwa本地MCP仍需用户重新载入，未替用户发布平台配置。

### 2026-09-28 · Codex · 南充行程草案
- 分支 feat/nanchong-itinerary；新增共用REST/MCP规划模块与13工具目录。前端保留纸色/青绿视觉、聊天尺寸和原导航，增加南充逐段行程、北湖住宿候选、自填额度、地图跳转；桌面双栏、375px单栏。网址 http://127.0.0.1:8010/?v=outing#outing 。
- 7项新规划/HTTP/MCP单测、7项原travel API、3项提示词测试与18组前端回归通过；浏览器真实生成两日草案、手机截图检查、条件更改旧结果标识、模拟503失败后恢复通过。故障测试产生的503控制台错误是预期；正常页面无控制台错误。
- 新MCP只测试了本地注册/调用，未验证女娲新会话自主调用；平台需重载本地MCP，复制更新后的系统提示词。网页用户模板会读取本地文件。
- 仅2个有公开页面的目的地、1家住宿候选；编辑建议停留时长明确标注。无实时交通班次/耗时、票价或空房；不声称规划可行或总预算完整，不替用户预订。地图调起链接按官方文档构建，尚未在第三方地图完成路线匹配验收。
- 无改动.env、知识库、Docker或被跟踪.venv。未合并/推送，详情 docs/NANCHONG-ITINERARY.md。

### 2026-09-28 · Codex · 无Key到达路线与静态演示提示词
- 修改 prompts/nuwax_agent_system_prompt.md 与 nuwax_user_prompt.md：区分文化游览模板和实际到达路线，优先免费道路工具，缺可靠入口坐标如实降级；用户提供截图可整理为非实时静态演示，不猜几何/坐标、不泄露无关隐私。
- 未改前端、数据或接口；没有收到路线截图，未制作静态路线。系统提示词文件需用户复制到女娲平台，网页用户模板由后端构建请求时读取。
- 3项 unittest 提示词回归通过；当前系统Python未安装pytest，未安装额外依赖。未测试模型遵循效果，未自动发布平台配置。

### 2026-09-27 · Codex · 出行助手页面与女娲带入
- 已按用户确认视觉稿制作站内 outing 视图，可直接访问 /#outing。保留原导航并新增入口；独立天气/空气、步行/驾车、道路形状SVG、来源/时间、草案原文。仅使用语义HTML/CSS/SVG，不将生成效果图嵌成页面。
- 同源GET /api/travel/city-location 复用免费城市定位。道路起终点支持3座城市中心或用户确认的WGS84手动坐标；不是景点搜索，不自动把未核验坐标用于导航。SVG无底图、不含实时路况。
- 女娲成功回答及结构化路线回答显示“查看出行方案”。保留原回答，城市/ISO日期仅在唯一且有效时预填；多城市/多日期让用户选择。纯文字不猜站点顺序与坐标，结构化route.stops只带名称。返回原对话不刷新页面、不丢内存会话；刷新仍会丢对话（原有行为）。
- 测试：18组Node，8项免费工具+7项旅游HTTP Python；桌面1440/平板768/手机375可读无页面横向溢出。浏览器已测试2099日期范围提醒、503重试、手动坐标必填、跳转旧路线清空、原对话恢复。
- 真实网络：南充7日预报/空气质量成功，南充→阆中市中心驾车100.06km/71分钟为当次参考值。女娲真实API及浏览器分别返回get_travel_weather FINISHED；真实前端回答→查看出行方案→返回原对话成功。受控回答测试已撤销，未留mock。
- Web8010本轮启动PID27848；截图output/playwright/outing-desktop.png、outing-mobile.png、outing-tablet.png（tablet展示受控503状态）。未改.env/密钥/聊天几何，未推送或合并。

### 2026-09-26 · Codex · 免费出行工具
- 分支 feat/free-travel-tools；新增3个MCP工具，共11个。Open-Meteo非商业天气/空气质量、四川城市中心定位、FOSSGIS OSRM步行/驾车道路参考。公共接口本机共享SQLite限流/缓存，不涉及付费Key。
- 前端现有行程入口展示天气/空气质量及来源、原查询时间、预测边界；未改变布局/聊天栏，未新增地图路线绘制。/api/travel/road-route供后续适配。
- 真实stdio使用用户现有 .venv Python入口测试：南充/阆中/广元各7日预报、空气质量成功；步行路线返回3465.7米/2772.3秒（仅测试坐标，不是景区入口/实时路况）。发现Nanchong查询还返回高坪，修正为省份+名称匹配，不盲取首项。
- 测试：8新增+7旅游接口+3提示词Python测试、17组前端回归；真实浏览器查询2026-09-27南充，显示预报与当前空气模型。截图 output/playwright/free-travel-desktop.png。Web8010本轮进程PID26332。
- 女娲接入需用户停用再启用san-guo-travel-agent、新建会话；工具协议已实测，女娲模型端未代测。本地系统提示词文件不会自动发布女娲；后端用户提示模板已附工具规则。详细步骤见 FREE-TRAVEL-TOOLS.md。未改.env/.venv，未推送或合并。

### 2026-09-20 · Codex · REST＋项目内Agent
- 接入景区丰富字段和卡片问答/规划入口；/chat复用已有DeepSeek配置，显式标记模型与检索兜底，限制历史角色/长度。
- 当前8010为真实模型模式（PID 29944，本轮启动），不是上一轮mock。浏览器万卷楼卡片问答已成功，15项Python、15组前端回归通过。
- 未改.env/密钥/.venv；未推送。女娲平台Agent仍未接入；坐标、实时服务仍待核验/接入。详见LOCAL-INTEGRATION.md更新段。

### 2026-09-20 · Codex · 本机新前端接入
- 工作区：D:\agent_threekingdom；分支 feat/frontend-backend-integration。用户本轮明确授权调整前后端，无推送或合并。
- 已完成：四个旅游接口、结构化路线约束、排除节点、酒店档位兼容、空日期处理、未知票价不免费、导航入口与gzip。
- 验证：11项unittest、2项样例数据检查、15组Node回归；Playwright实际查询景区、规划、预算、半天无结果保留旧方案，375px无横向溢出。pytest未安装，使用unittest及直接调用2项schema检查。
- 预览：http://127.0.0.1:8010；独立临时业务库、mock模型。未修改.env及.venv，不需要Docker。
- 下一步：资料负责人补故事正文/证据/精确坐标；实时服务与更完整约束规划尚未接入。审查明细及启动方法见 LOCAL-INTEGRATION.md。

> 规则：每完成一个任务（或中断时），在下面**追加一条**，格式照抄模板。
> 目的：让另一个 agent / 新会话**不依赖聊天记录**也能接着干。

---

## 模板（追加新条目时复制这段）

```md
### <日期> · <谁>（Codex / DSH / 人）· 任务 #<编号>
- 做了什么：
- 改了哪些文件：
- 怎么验证的：
- 当前状态：（可运行 / 半成品 / 未验证）
- 下一步：
- 卡点 / 需要人决策：
```

---

### 2026-09-10 · DSH · 任务 #1 #2 #3 #13–#18

- **做了什么**：
  1. 搭建本地环境（Python 3.11.4 venv、依赖、pip 清华源、`pyproject.toml` 放宽到 `>=3.11`）。
  2. **补齐了 5 个从未入库的实现模块**，让整条链路可跑：`san_guo_core`(settings/models)、`rag/vector_store.py`、`rag/hybrid_retriever.py`、`agent/answer_chain.py`、`tools/travel_business_tools.py`。
  3. Docker 化：`Dockerfile` + `docker-compose.yml` + `docker-entrypoint.sh`（入口按 README 顺序：seed → 建索引 → 导知识 → 起 uvicorn）。构建成功，容器 healthy，`/health` `/chat` 均 200。
  4. 前端：把 GPT-6 的工作台布局模板接入后端 `/chat`（相对路径、多轮历史、加载态、错误态、意图/路线/召回信息）。
  5. 前端界面改版：宣纸+朱红主题、落地页（能力卡片 + 示例问题一键提问）、结构化气泡（意图标签 / 路线卡片 / 召回覆盖）。
  6. 修 bug：`hidden` 被 `.chat-panel{display:flex}` 覆盖导致对话面板强制显示 → 加 `[hidden]{display:none!important}`。
  7. 修"改前端不生效"：`src/api.py` 新增 `NoCacheStaticFiles`，静态资源响应带 `Cache-Control: no-store`。
  8. 把 `dev` 合并进 `master`（`0e7b4cb`）并推送。
  9. 编写 `ARCHITECTURE.md`、`TESTING.md`、`AGENTS.md`、`docs/TASKS.md`、本文件。

- **改了哪些文件**：
  - 新增：`src/san_guo_core/*`、`src/rag/vector_store.py`、`src/rag/hybrid_retriever.py`、`src/agent/answer_chain.py`、`src/tools/travel_business_tools.py`、`frontend/*`、`Dockerfile`、`docker-compose.yml`、`docker-entrypoint.sh`、`ARCHITECTURE.md`、`TESTING.md`、`AGENTS.md`、`docs/*`
  - 修改：`src/api.py`（CORS + 挂载前端 + NoCacheStaticFiles）、`pyproject.toml`、`src/planning/route_planner.py`、`src/rag/__init__.py`

- **怎么验证的**：`node --check frontend/app.js`；本地 venv 起服务验证 `/`、`/styles.css`、`/app.js`、`/health`、`POST /chat`；Docker 容器重建后同样验证通过；`docker inspect` 显示 healthy。

- **当前状态**：**本地与 Docker 均可运行**；但**上述改动全部未提交（未 commit / 未 push）**，远端仓库仍缺那 5 个模块。

- **下一步**（按优先级）：
  1. **任务 #4**：把 5 个实现模块提交并推送（否则同事全新克隆跑不起来）。
  2. **任务 #6**：解除 `.venv` 跟踪（`git rm -r --cached .venv`），否则 merge/pull 一直被噪音干扰。
  3. **任务 #5**：把 Docker 配置入库并统一（根目录版 vs `deploy/` 版）。
  4. **任务 #7**：前端第二迭代（等人工体验反馈）。

- **卡点 / 需要人决策**：
  - 推送需要 Gitee 私人令牌（人操作）。
  - `master` 与 `dev` 历史分叉，合并策略需人确认。
  - 本机无法访问 pypi / npm 官方源 / Docker Hub，需走镜像。

---

### 2026-09-11 · DSH · 任务 #4 #5 #6（+ 新发现）

- **做了什么**：

  1. **先核对真实状态，发现任务板已过时**：`origin/master` 已推进（含 `deploy/` 版 Docker 配置与
     Codex 的自包含 `frontend/index.html`），而本地 `master` 落后 6 个提交。
     任务 #5 的"入库"其实已由别人完成，真正没做的是 #4 和 #6。

  2. **任务 #6**：`git rm -r --cached .venv` 移除 1120 个被跟踪文件（`.gitignore` 早有 `.venv/`）。
     提交 `3b69bfd`。**已解除，merge/pull 不再被噪音淹没。**

  3. **任务 #4**：补齐 5 个从未入库的实现模块并提交 `35333dc`：
     `src/san_guo_core/{__init__,settings,models}.py`、`src/rag/vector_store.py`、
     `src/rag/hybrid_retriever.py`、`src/agent/answer_chain.py`、`src/tools/travel_business_tools.py`。

  4. 提交 `378d405`：`src/api.py` 的 `NoCacheStaticFiles` 一并入库。

  5. 提交 `a370553`：`requires-python` 放宽到 `>=3.11`（与 `python:3.11-slim` 一致）。

  6. **任务 #5 —— 新发现两个会让 Docker 部署必然失败的真 bug**，提交 `671a703`：
     - `deploy/docker-compose.yml` 写 `context: .`，而 **Compose 把相对路径解析为「compose 文件
       所在目录」**，实际上下文变成 `deploy/`，`dockerfile: deploy/Dockerfile` 被解析成
       `deploy/deploy/Dockerfile`。实证报错：
       `resolve : GetFileAttributesEx ...\deploy\deploy: 系统找不到指定的文件`。
       改为 `context: ..`、数据卷 `../data`，并补上 `healthcheck` 与顶层 `name`。
     - **CRLF 毁掉 shebang**：仓库内 blob 本来就是 LF，但 `core.autocrlf=true` 且缺 `.gitattributes`，
       Windows 上会被检出成 CRLF，容器内报
       `exec /docker-entrypoint.sh: no such file or directory`。
       新增根 `.gitattributes` 固定 `*.sh text eol=lf`。
       ——这也解释了为什么主工作树里那份**未跟踪**的根 `docker-entrypoint.sh` 反而能跑
       （它没经过 git 检出过滤，是纯 LF），即 `agent-threekingdom` 容器一直 healthy 的原因。

  7. **同步 `AGENTS.md`**：第 3 节"当前状态"、第 4 节 Docker 用法、第 8 节部署导航均按实际更新。

  8. **同步 `docs/TASKS.md`**：新增 #20–#23，重排已完成项。

- **改了哪些文件**（分支 `chore/commit-missing-modules`，基于 `origin/master`）：

  | 提交 | 内容 |
  |---|---|
  | `3b69bfd` | `chore(repo)`：解除 `.venv` 跟踪（-1120 文件） |
  | `35333dc` | `feat(core)`：5 个缺失模块（+600 行） |
  | `378d405` | `fix(api)`：静态资源禁缓存 |
  | `a370553` | `chore(deps)`：`requires-python >=3.11` |
  | `671a703` | `fix(deploy)`：compose 上下文 + `.gitattributes` |

  另更新（主工作树，尚未入库）：`AGENTS.md`、`docs/TASKS.md`、`docs/HANDOFF.md`。

- **怎么验证的**（**没有复用主工作树的 venv**，因为它是 editable 安装、会掩盖"模块缺失"）：
  1. 从分支**全新 clone** 到 `D:\DSH Workspace\sgt-verify-clone`，确认 6 个模块文件都在、`.venv` 已随
     克隆消失（克隆前实测：这些模块在 `origin/master` 上确实不存在）；
  2. `C:\Python\Python311\python.exe -m venv .venv` + 清华源装运行依赖；
  3. `seed_business_db` → `create_vector_collection` → `ingest_pipeline` 三步 exit=0；
  4. 起 uvicorn，实测 `/health`（`status=ok`）、`/`（200，含「三国文化旅游助手」，
     `Cache-Control: no-store, must-revalidate`）、`/chat` 三条意图全过：
     `route_planning`（含 2 个站点）/ `culture_qa` / `budget_ticket`；
  5. **Docker 链路**：另 clone 一份 → 确认入口脚本已是 LF（`CRLF=0 LF-only=15`）→
     `docker compose -f deploy/docker-compose.yml build` 成功 → 起容器，
     入口 4 步全过、uvicorn 正常 → 容器内 `/health`、`/chat` 同样全过；
  6. 期间修掉自己验收脚本的两个 bug（header 大小写、`stops` 取层级），避免误报 FAIL。

- **当前状态**：**分支仅在本地**（worktree `D:\DSH Workspace\sgt-dsh-wt`，tip `671a703`），
  代码与 5 个提交完好、未丢失。
  按人要求，**已把该分支从 Gitee 撤下**（`git push origin --delete chore/commit-missing-modules`），
  远端已恢复为只有 `master`（`0e7b4cb`）与 `dev`（`bd24963`）。
  - ⚠️ 验证记录里"从 Gitee 远端克隆实测通过"是**当时真实跑过的**，但该远端分支随后已被删除；
    重跑需要先重新推送。
  - 已清理：临时克隆目录、验证容器 `sgt-docker-verify`、验证镜像、测试用 uvicorn(8020/8024) 均已回收；
    用户原有的 `agent-threekingdom` 容器（healthy:8001）**未受影响**

- **⚠️ 推送相关**：Gitee 凭据已在 Git Credential Manager 里缓存，推送**不需要**人工再配令牌
  （本次已验证可推送、也可删除）。但**是否推送必须先经人明确同意**，不要自行推送。

- **下一步**（按优先级）：
  1. **人**：决定何时推送 / 合并 `chore/commit-missing-modules`（任务 #20）。
     **推送前先明确同意**；合并前先清理主工作树（见下面脚本）。
  2. **人**：决定协作文档是否入库（任务 #21）与根目录重复 Docker 文件是否删除（任务 #22）。
  3. **Codex**：解决 `frontend/index.html` 的 add/add 冲突（见下），再收尾任务 #7、#23。
  4. **DSH**：任务 #8 意图识别增强（关键词规则对口语/同义词易漏判）。

- **🔀 分支合并预演结果（用 `git merge-tree` 实测，只读）**：
  期间 Codex 把主工作树切到了 `feat/frontend-iteration-2`（`add6259`），它**基于旧的本地 `f6930ce`**，
  而我的分支基于 `origin/master`（`0e7b4cb`）。两者合起来**只冲突 1 个文件**：

  ```
  Auto-merging frontend/index.html
  CONFLICT (add/add): Merge conflict in frontend/index.html
  ```

  原因是 `origin/master` 已含 `frontend/index.html`（提交 `7776ea7`），而 Codex 从 `f6930ce` 分支出来
  又**重新新增**了一份同名文件。其余文件（含 `src/**`、`deploy/**`）全部可干净合并。
  **这是 Codex 的活**，不是 DSH 的。

- **合并前清理脚本**（这些改动已全部包含在修复分支里，可安全丢弃）。
  ⚠️ 主工作树现在在 `feat/frontend-iteration-2` 上，**不要在没提交前乱切分支**：
  ```powershell
  $git = "C:\Program Files\Git\cmd\git.exe"
  cd "D:\DSH Workspace\agent_threekingdom"

  # 0) 先确认 Codex 的前端改动都已提交，否则下面会丢东西
  & $git status --short -- frontend

  # 1) 丢弃已被修复分支覆盖的已跟踪文件改动
  & $git checkout -- pyproject.toml src/api.py src/rag/__init__.py

  # 2) 删除已被修复分支覆盖的未跟踪文件（否则合并/检出报 untracked would be overwritten）
  Remove-Item -Recurse -Force src\san_guo_core
  Remove-Item -Force src\rag\vector_store.py, src\rag\hybrid_retriever.py
  Remove-Item -Force src\agent\answer_chain.py, src\tools\travel_business_tools.py

  # 3) 再 fetch / 合并
  & $git fetch origin
  ```
  ⚠️ `AGENTS.md`、`ARCHITECTURE.md`、`TESTING.md`、`docs/`、根目录三个 Docker 文件的清理步骤，
  取决于任务 #21/#22 的结论，**先别删**（`frontend/**` 现在归 Codex 的分支管，别动）。

- **卡点 / 需要人决策**：
  1. **协作文档从未入库**：`AGENTS.md` 自称"Codex 与 DSH 共同读取"，但它只存在于主工作树，
     从未提交 → 任何 worktree / 全新克隆都读不到（Codex 就一直读不到）。建议入库（任务 #21）。
  2. **两套 Docker 真相**：根目录三个文件 vs `deploy/` 版。建议删根目录那三个，只留 `deploy/`。
     注意根 `docker-compose.yml` 的 `build: .` 只指向根 Dockerfile，与 `deploy/` 版不是一套（任务 #22）。
  3. **两分支基线不同**（上面 🔀）：建议先把 `chore/commit-missing-modules` 合进 `master`，
     再把 `master` 合进 `feat/frontend-iteration-2`，让 Codex 只解一个 `frontend/index.html` 冲突。
  4. **`master` 与 `dev` 历史分叉**，合并策略仍需人确认。
  5. **本机仍有 5 个 docker 容器在跑**（`agent-threekingdom` healthy:8001、inventree 4 个）。
     8000 被 inventree 占用，所以本项目映射 8001 是对的。

---

### 2026-09-11 · DSH · 后端冻结（人指示，优先级高于上一条）

- **人说了什么**：那 5 个缺失模块**不是"没人写"，而是队友写了但忘推了**。
  如果这边先推同名文件上去，**队友就推不上来了**。
  指示：**后端暂时不要改**，尤其是 DSH 自己写的那 5 个模块。

- **做了什么**：
  1. **撤下 Gitee 上的分支**：`git push origin --delete chore/commit-missing-modules`。
     远端已恢复为只有 `master`（`0e7b4cb`）与 `dev`（`bd24963`）——**远端现在没有任何 DSH 的改动**。
  2. **解除该分支的上游跟踪**（`git branch --unset-upstream`），避免以后在 `sgt-dsh-wt` 里
     顺手 `git push` 又把它推回去。
  3. **代码未丢**：本地分支 `chore/commit-missing-modules`（tip `671a703`，5 个提交）完好，
     在 worktree `D:\DSH Workspace\sgt-dsh-wt`。
  4. **停止一切后端改动**：主工作树 `src/**` 我从未写入过——那 5 个模块至今仍是**未跟踪**状态
     （`git ls-files --error-unmatch src/san_guo_core/settings.py` 报 pathspec 不匹配，可复核）。
  5. **改文档**：`AGENTS.md` 第 3 节改成「⛔ 后端暂缓」，并逐条标注每个提交**是否会与队友对撞**；
     `docs/TASKS.md` 把 #4 标为 `BLOCKED` 并交回队友、加冻结提示。

- **⛔ 现在起不要做的事**：
  - 不要改/提交/推送 `src/**`。
  - 不要推送或合并 `chore/commit-missing-modules`（其中 `35333dc` 正是那 5 个文件）。
  - 不要动主工作树里那 5 个未跟踪副本。

- **⚠️ 队友推送后、本地拉取前必须先删本地未跟踪副本**，否则 `pull` 报
  `untracked working tree files would be overwritten by merge`：
  ```powershell
  cd "D:\DSH Workspace\agent_threekingdom"
  Remove-Item -Recurse -Force src\san_guo_core
  Remove-Item -Force src\rag\vector_store.py, src\rag\hybrid_retriever.py
  Remove-Item -Force src\agent\answer_chain.py, src\tools\travel_business_tools.py
  ```
  **删之前先和队友的版本 diff 一下**：本地这几份是 DSH 按同一套架构独立写的，内容不一定一致，
  差异本身可能有用（比如某些边界处理）。

- **✅ 哪些东西与后端无关、可以安全推进**：
  - `671a703` 里的 `deploy/docker-compose.yml` 修正 + 根 `.gitattributes`：
    修的是**真 bug**（`docker compose -f deploy/docker-compose.yml up` 现在必定失败：
    构建上下文被解析成 `deploy/`、CRLF 毁掉 shebang）。与 `src/**` 无交集，建议单独摘出来合并。
  - `frontend/**` 的活归 Codex（`feat/frontend-iteration-2`），与本次冻结无关。

- **当前状态**：**后端冻结中，等队友推送。** 远端干净，DSH 无任何改动在远端。

- **下一步**：
  1. **等队友**推送那 5 个模块（任务 #4，已标 BLOCKED）。
  2. 队友推完后：先 diff 本地未跟踪副本 → 删副本 → 拉取 → 再评估 DSH 那份是否还有价值。
  3. **人**决定 DSH 本地分支怎么处理（保留 / 只摘 `671a703` / 整体删除）。
  4. **人**决定协作文档是否入库（任务 #21）、根目录重复 Docker 文件是否删除（任务 #22）。

---

### 2026-09-12 · DSH · 队友补齐后端 → 产出交付快照（任务 #4 #29 #30）

- **背景**：队友把之前"忘推"的东西推上来了。远端现在是：

  | 分支 | 提交 | 内容 |
  |---|---|---|
  | `origin/dev` | `7537459` | *补充* —— 5 个实现模块 + 一堆配套设施 |
  | `origin/master` | `4fcccad` | *Merge branch 'dev'* |

- **做了什么**：

  1. **核对队友的 `7537459`**（206 个文件）：除 5 个模块外，还新增了
     `.dockerignore`、**根 `Dockerfile` + `docker-compose.yml`**、`requirements.docker.txt`、
     `scripts/audit_imports.py`、`scripts/check_demo_status.py`、`scripts/check_python_environment.py`、
     `tests/test_runtime.py`、`data/raw/demo_knowledge.jsonl`，以及 **189 个 `.venv` 文件**。

  2. **对比队友模块 vs 本地那份** —— **7 个文件全部不同**（是两套独立实现，例如
     `vector_store.py` 6221 vs 4100 字节、`models.py` 1111 vs 1702）。
     所以本地那几份**没有直接删**，而是整体备份到 `D:\DSH Workspace\sgt-local-backup-20260911\`（13 个文件）。

  3. **⚠️ 主工作树的 `pull` 没有执行**（详见下面「卡点」）：`git` 会被直接拒绝。

  4. **推动 Codex 暂停冻结**（协调者给了提示词）：它冻结在
     `feat/frontend-iteration-2 @ 827adc8`。**实测该提交相对功能代码最后提交 `adccd3c`
     只多了 `frontend/HANDOFF.md`（+11 行），功能代码一行未动**，工作区干净、无 stash。

  5. **产出交付快照** `D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8\`：
     - 后端 = Gitee `master@4fcccad` 全新克隆（模块已自带，**不需要再复制任何文件**）
     - 前端 = 冻结快照 `827adc8`（17 个文件，逐字节校验一致）
     - **DSH 自建的 `Dockerfile.backend` + `docker-compose.backend.yml`**（按要求**不使用**仓库里的任何 Docker 配置）
     - 目录内 `SNAPSHOT.md` 记录全部来源、构建方式、坑与限制

  6. **踩到并修掉两个 Docker 坑**（都已写进 `SNAPSHOT.md` 与 `AGENTS.md`）：
     - 队友的 `settings.py` 默认 `vector_backend="milvus"`，但 `requirements.docker.txt` 故意不装
       `pymilvus`，而 `src/ingest/create_vector_collection.py` **直接实例化 `MilvusVectorStore()`、没有兜底**
       → 容器一启动就 `RuntimeError: Milvus backend requires pymilvus...` 并无限重启。
       解法：`VECTOR_BACKEND=local` + `CMD` 里跳过那一步。
       （`rag/vector_store.py` 的 `get_vector_store()` 是有 try/except 回退的，**就那个建表脚本没有**——建议反馈队友。）
     - 队友新增的根 `Dockerfile`/`docker-compose.yml` **跑的是 MCP 服务**（基底 `langgenius/dify-api:1.16.0`，
       `CMD python src/mcp_server.py`，容器名 `san-guo-mcp`），**不是 Web API + 前端**，别混用。

  7. **上线**：快照容器 `sgt-snapshot-api` 跑在 **http://localhost:8001**（healthy）。
     旧的预览容器 `sgt-preview-gpt6` 已停并删除（**镜像保留**，可回退）。

  8. **更新文档**：`AGENTS.md` 第 3/4/8 节、`docs/TASKS.md` 全量重写为本轮状态。

- **改了哪些文件**：
  - 新增（仓库外）：`D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8\`
    （其内 `Dockerfile.backend`、`docker-compose.backend.yml`、`SNAPSHOT.md` 为 DSH 自建；
    其余为快照代码本体）
  - 新增（仓库外）：`D:\DSH Workspace\sgt-local-backup-20260911\`（本地旧模块与旧 Docker 文件的备份）
  - 修改（主工作树，仍未入库）：`AGENTS.md`、`docs/TASKS.md`、本文件
  - **仓库 `src/**` 与 `frontend/**` 一行未动**

- **怎么验证的**：
  1. 快照容器 `/health` → `status=ok`、`vector_backend=local`；
  2. **前端 17 个文件逐个 HTTP 拉取并与快照文件逐字节比对 → 17/17 一致**；
  3. `/chat` 三条意图全过：`route_planning`（含 2 站点）/ `culture_qa`（**已返回真实演示内容**：
     "万卷楼位于南充西山风景区一带…"，不再是"此处仅为结构样例"）/ `budget_ticket`；
  4. 入口日志 `Indexed 8 chunks`（此前只有 2 条样例，队友的
     `data/raw/demo_knowledge.jsonl` 8 条已被 ingest 读到）；
  5. 容器 `docker ps` 显示 `Up (healthy)`。

- **当前状态**：**快照已交付并在跑**。仓库 `master` 是完整后端；Codex 前端只存在于快照里、**未进 master**。

- **下一步**（按优先级）：
  1. **Codex**：恢复后先把 `origin/master` 并进 `feat/frontend-iteration-2`（任务 #25，只有
     `frontend/index.html` 一处 add/add 冲突，是它的文件）。
  2. **人 + DSH**：解决 `.venv` 的跟踪问题（任务 #27），这是 #26 的根因。
  3. **人**：决定 `AGENTS.md`/`docs/` 是否入库（#21）、根目录两套 Docker 文件如何取舍（#22）。
  4. **DSH**：反馈队友 `create_vector_collection.py` 缺兜底（#28）；恢复后做意图识别增强（#8）。

- **卡点 / 需要人决策**：
  1. **主工作树 `git pull` 会被 git 拒绝**，因为：
     - **189 个 `.venv` 文件两边都改了**（队友提交改了 189 个；主工作树里 `.venv` 有 1084 个本地改动
       = 540 删除 + 548 修改），重叠 189 个 → `local changes would be overwritten`；
     - 另有 6 个未跟踪文件会被覆盖（5 个模块 + 根 `Dockerfile`/`docker-compose.yml`），**已备份**。
     → **`.venv` 被 git 跟踪这件事现在真的在阻断协作了**，强烈建议尽快做 #27。
  2. **`.venv` 疑似是真在用的 venv**（有一个真 `python` 环境），所以我没有贸然
     `git checkout -- .venv` 去丢弃那 1084 个改动——这一步需要人确认。
  3. **仓库自带的 Docker 配置两套都有问题**（见上「做了什么 6」与 `AGENTS.md` 已知问题 4），
     建议明确取舍后清理，否则下一个人还会踩。
  4. 交付快照是**纯净版，没打静态资源禁缓存补丁**（预览镜像里有）。因为前端改为烘焙进镜像、
     内容未变，当前不会有问题；需要"改完刷新即生效"的实时联调模式再加回来。

---

### 2026-09-12 · DSH（前端组本轮）· 任务 #25 #7（顺带为 #2 取证）

- **做了什么**：
  1. **#25 合并 → 产出候选分支（未推 master）**：主工作树脏（1100 项本地改动，绝大多数是 `.venv`），
     按禁令**不切分支、不 pull**；改用**隔离 worktree + 稀疏检出**（只物化 `frontend/`，0.02 MB，
     `.venv` 一个文件都不落盘）：`git worktree add --no-checkout -b chore/merge-frontend-into-master <wt> origin/master`
     → `sparse-checkout set frontend` → `git merge feat/frontend-iteration-2`。
     实测**确实只有 `frontend/index.html` 一处 add/add 冲突**，其余 16 个前端文件都是纯新增。
     解冲突**取前端分支那份**：`origin/master` 侧是早期「单文件版」（内联 `<style>`/`<script>`、蓝主题、133 行），
     Codex 的是第二迭代「多文件版」（`styles.css` + `app.js` + `travel-*` + 地图，201 行）；
     **#1 的 `[hidden] { display: none !important; }` 修复在 `styles.css` 里仍在**，没有丢修复。
     → 合并候选提交 **`9623be1`**（父 `4fcccad` + `827adc8`）。
  2. **#7 前端联调 → 修掉 1 个真实缺陷**：实测真实后端 `route_planning` 的 `stops` 是
     西山风景区·万卷楼 / 鹤鸣山景区·王平墓，**既无 `coordinates`、名称又是景区**，匹配不到 183 个县级驻地
     → `structured()` 两点全 `null`；而 `travel-map.js` 的 `fromResponse` **无条件用后端站点覆盖 `mapRoute`**
     → 用户已看到的「南充」被清成「0 个已定位地点」，视口还被重置。
     修复见迭代分支 **`aff0c37`**：`map-route-core.js` 新增纯函数 `resolveRoute(existing, parsed)`
     （只有「能落到位」的后端站点才替换已识别点位；否则保留地名路线，并把落不到位的站点记入 `backendStopsPending`），
     `travel-map.js` 改用它，并在状态栏区分「未能唯一定位」与「后端站点暂无可信坐标」。

- **改了哪些文件**：
  - 仓库内（主工作树，**只有文档**）：`docs/TASKS.md`、`docs/HANDOFF.md`（本条）。
    **主工作树 `frontend/**`、`src/**`、`deploy/**` 一行未改**——`frontend/` 保持**冻结干净**
    （`git status --short --untracked-files=all -- frontend` 无输出，与上一条交接的暂停状态一致）。
    前端侧的交接记录写在隔离 worktree 的分支上：`feat/frontend-iteration-3` 的 `366ba3e`
    追加了 `frontend/HANDOFF.md`，会随该分支进 master。
  - 仓库外 worktree：`D:\DSH Workspace\sgt-merge-frontend`（`chore/merge-frontend-into-master` @ `9623be1`）、
    `D:\DSH Workspace\sgt-frontend-iter3`（`feat/frontend-iteration-3` @ `366ba3e`）。
  - 证据脚本（仓库外）：`D:\DSH Workspace\.tmp-e2e\`（`probe.py`、`replay-map.cjs`、`chat-probes*.json`）。

- **怎么验证的**：
  1. **合并面**：`rev-parse <合并>:frontend` 与 `827adc8:frontend` 的树哈希**完全相同**（`1e8bc91…`）；
     17 个前端文件逐个 blob 比对 **0 处不一致**；相对 `origin/master` 的改动面**只有 `frontend/**`**；
     `src`/`deploy`/`data`/`prompts` **零污染**；**无文件丢失**。
  2. **前端自带回归**：`node --check` 6/6 通过；`app.test.cjs`、`travel-api.test.cjs`、`map-route.test.cjs` 全 PASS。
  3. **真实响应回放**（`replay-map.cjs`：最小 DOM 桩加载**真实 `travel-map.js` 本体**，喂实测 `/chat` 响应）：
     - 冻结版：发送后 1 个已定位点「南充市」→ 回答后 **0 个**（复现缺陷）；
     - 修复版：回答后仍保留「南充市」，并提示后端 2 个站点暂无 GCJ-02 坐标；
     - **含坐标对照**：给同样两个站点补 `GCJ-02` 坐标后，修复版与冻结版行为**完全一致**
       （后端顺序优先、2 个已定位点）→ 证明修复只在退化场景生效，不影响将来坐标接入。
  4. **容器字节级联调**：`GET /` 与 7 个静态资源 SHA256 **与挂载源逐字节一致（8/8）**；
     `GET /health` = `ok`；`POST /chat` 三条意图实测（0.82 / 0.55 / 0.78）、空串 → 200 `culture_qa`、
     **缺 `message` → 422**，全部与 `docs/BACKEND-API.md` 一致。
  5. **为 #2 的两个 P0 缺口取证（交后端/人）**：
     - 坐标：`route.stops[]` 仍无坐标（见上）；
     - 价格：实测「南充舒适型酒店预算和万卷楼票价多少钱」→
       「景区票价：西山风景区·万卷楼：**0.0 - 0.0 CNY（manual_demo）**」——未知被写成 0，
       前端照实显示会像"免费"；且结构化字段**没有** `data_status`/`sources`/`updated_at`；
     - 附带观察：「阆中古城门票多少钱」（纯票价问）→ 只回酒店预算 220–420 CNY，**没给任何门票信息**。

- **当前状态**：合并候选与前端修复**均已提交、均已验证**；**未 push、未合并 master**（按 AGENTS 6.5 由人 review）。
  容器仍按原样跑在 **http://localhost:8001**、仍挂载主工作树 `frontend/`（冻结版）——**联调环境未被改动**。

- **下一步**：
  1. **人 review 后**合并 `chore/merge-frontend-into-master`（`9623be1`）进 master，再合
     `feat/frontend-iteration-3`（分支 tip `366ba3e` = `aff0c37` 缺陷修复 + 前端交接文档）。
  2. 后端按 `docs/BACKEND-API.md` 补 `stops[].coordinates` + `coordinate_system` 与
     `data_status`/`sources`/`updated_at`（未知金额用 `null`）——**前端已就绪，坐标一补上地图自动对齐**。
  3. 浏览器视觉验收仍未做（见卡点 1）。

- **卡点 / 需要人决策**：
  1. **受管浏览器两次启动均失败**（Edge 与 Chrome 都是 `Browser exited before DevTools became ready`；
     本机有用户 Edge 实例在跑，按工具契约**未杀任何进程**、也不再重试）→ **本轮没有浏览器渲染验收**，
     改为「真实响应回放 + DOM 契约 + 容器字节级校验」。建议人在自己浏览器打开 http://localhost:8001 目视确认一次。
  2. ~~想直接看修复版：自己改挂载源~~ → **已由我在 2026-09-12 变更完成**：快照前端挂载源已改指
     `D:/DSH Workspace/sgt-frontend-iter3/frontend`（= 迭代分支），容器已重建并实测逐字节一致，
     详见下一条交接。想回到「只看封版前端（`827adc8`）」：把那行挂载注释掉再 `up -d`；
     想回到旧的主工作树挂载源：把该行改回 `D:/DSH Workspace/agent_threekingdom/frontend` 再 `up -d`。
  3. 合并候选**不能直接推 master**：`9623be1` 里含 `frontend/index.html` 的**人工解冲突结果**，
     需人确认「早期单文件版被第二迭代多文件版取代」这个取舍。
  4. 本机未尝试 push（无凭据），远端仍是 `4fcccad`；两个新分支都只在本地。

---

### 2026-09-12 · DSH · 只做前端 → 把联调环境对准前端分支（交接性变更，无任务编号）

- **背景**：协调者决定**接下来团队只做前端**；后端 / 数据 / 提示词的缺口写进任务板交人，不归前端组动手。
- **做了什么**：
  1. **联调环境对准前端分支**：快照 `docker-compose.backend.yml` 的前端挂载源从主工作树（冻结 `827adc8`）
     改为 **`D:\DSH Workspace\sgt-frontend-iter3\frontend`**（= `feat/frontend-iteration-3`），容器 `up -d` 重建。
     实测：`/health` = `ok`；服务端 9 个文件（`/`、`styles.css`、5 个 JS、`sichuan-counties.json`、`HANDOFF.md`）
     SHA256 **与迭代分支逐字节一致**；服务端 `map-route-core.js` 里 `resolveRoute` 已在线（第 63 行）。
     → 现在**改前端文件刷新即生效**，而且看到的就是**迭代分支**的内容（不再是冻结版）。
  2. **新增 `docs/HANDOFF-TO-CODEX.md`：给 Codex 的接手提示词**（自包含、可直接粘贴）——
     含工作区与稀疏检出说明、联调环境、已做完的、协议硬约束、两个 P0 缺口、本轮该干什么（优先级）、
     自证命令、收工要求、禁令、已知限制。
  3. **更新协作文档**：`AGENTS.md`（第 3 节状态表 + 新增「前端两分支 + 三个工作树」+ 第 5 节「只做前端」
     + 第 8 节导航）、`docs/TASKS.md`（新增「前端待办（Codex）」#34–#38，并标注哪些任务**不归前端组**）。
- **改了哪些文件**：仓库内 `AGENTS.md`、`docs/TASKS.md`、`docs/HANDOFF.md`、新增 `docs/HANDOFF-TO-CODEX.md`；
  仓库外快照目录 `docker-compose.backend.yml`、`SNAPSHOT.md`；分支上 `frontend/HANDOFF.md`、`frontend/API-CONTRACT.md`
  （提交在 `feat/frontend-iteration-3`）。**主工作树 `frontend/**` 仍未改一行；`src/**`、`deploy/**` 未改。**
- **当前状态**：可运行。Codex 的任何前端改动都会立刻反映在 **http://localhost:8001**。
- **下一步**：Codex 按 `docs/HANDOFF-TO-CODEX.md` 第 6 节的优先级干活；人 review 合并两个候选分支
  （`9623be1` 先、`feat/frontend-iteration-3` 后）。
- **卡点**：仍然**没有浏览器渲染验收**（本机受管浏览器 Edge/Chrome 都起不来）；两个分支**都未 push**（远端仍 `4fcccad`）。

---

## 给下一个 agent 的最短上手路径

1. 读 `AGENTS.md`（项目、状态、分工、规则）。
2. 读 `docs/TASKS.md`，挑一个 `TODO` 并标 `DOING`。
3. 按 `AGENTS.md` 第 4 节的命令把项目跑起来验证。
4. 只改你负责的目录（Codex → `frontend/**`；DSH → `src/**`）。
5. 收工后回填任务板与本文件。


## 2026-09-12 · Codex 第三迭代：浏览器验收与回答核验标识

- 工作树：D:/DSH Workspace/sgt-frontend-iter3，分支 feat/frontend-iteration-3；基于 bccae1f。未改后端、部署、数据、提示词；未 push、未合并。
- 完成：app.js 为回答和路线展示 data_status、带时区 updated_at、sources；缺失或非法值显示待核验。来源只允许 HTTP/HTTPS，链接带 noopener noreferrer；C 级明确不能支撑史实结论。预算原文保留，另提示未知金额不能认定为免费。styles.css 补核验信息换行与字号。
- 容错补充：路线卡片忽略 null / 缺名称的站点，避免脏数据导致整条回答渲染失败。app.test.cjs 覆盖多态响应、缺元数据、合法与非法来源、时间戳、异常站点，以及 422 / 非法 JSON / 缺 answer / 超时后的重试恢复。
- 浏览器：Codex 内置浏览器成功访问 http://127.0.0.1:8001。1280×800 首页默认收起；展开后主框右缘 468px、面板左缘 500px，不重叠。375×812 首页默认收起、无横向溢出；展开为全屏对话，可关闭；空输入发送禁用。未发现需要改动布局的视觉缺陷。
- 真实联调步骤：依次发送“三国志与演义的区别”“南充舒适型酒店预算和万卷楼票价多少钱”“南充一天三国文化路线”。文化回答显示召回覆盖，预算 route:null 正常，路线卡片正常，浏览器无 JS error。预算依然返回 0.0 - 0.0 CNY（manual_demo），前端未改写且明确待核验。
- 地图步骤：发送“从南充出发，去阆中、剑阁，再到广元旅游”，地图保留 4 个地点及虚线顺序示意；但后端实际识别为 culture_qa，属于意图识别缺口，交人处理。另发南充一天路线，后端两个景区均无坐标，地图仍保留南充市并提示两个未定位站点；真实响应回放也通过。驻地点不冒充景区入口。
- 错误态浏览器验收：打开 /tests/chat-error.html，点击“南充一天三国文化路线”；独立测试页仅首次将请求体换成 {}，真实后端回 422，出现错误气泡与“重新请求”；点击后正常返回路线且重试按钮消失。正式首页不加载该测试逻辑。真实断网/改端口未操作；网络拒绝、超时、非法 JSON 由自动测试注入覆盖。
- 验证：6 个 frontend/*.js 的 node --check 全通过；app.test.cjs、travel-api.test.cjs、map-route.test.cjs 全 PASS；D:/DSH Workspace/.tmp-e2e/replay-map.cjs 回放通过；/health=ok，缺 message=422，HTTP app.js 与本地 SHA256 一致。
- 截图目录（本机绝对路径）：C:/Users/Rocket/.codex/visualizations/2026/09/10/01a08c5d-b8c1-7301-a48c-fa4514c75077/
  - frontend-desktop-1280.png：桌面路线卡片、核验提示与地图缺坐标降级。
  - frontend-mobile-home-375.png：手机首页默认收起。
  - frontend-mobile-chat-375.png：手机全屏对话。
  - frontend-mobile-map-375.png：手机地图、四个地名点。
  - frontend-error-422.png / frontend-retry-recovered.png：真实 422 与重试恢复。
- 下一步 / 卡点：#33 仍需后端提供景区 GCJ-02 坐标及价格元数据，修正未知金额为 null；多地旅游问句意图识别需人协调后端。#36 等四个旅游接口落地，travel-api.js 保持 enabled=false。本轮未扩展景区数据或导航能力。


## 2026-09-13 · 市县分级地图、县域点击与川东北定位

- 完成用户本轮五项要求及补充：真实 21 市州 / 183 县区轮廓；100%–249% 仅市州边界，250% 起叠加县级边界；屏幕固定字号、标签避让；按市域完整边界适配筛选视野；成都朱红色并标省会；首页和助手说明聚焦南充、阆中、广元、剑阁的川东北三国文化旅游。
- 县域可直接点击内部选中并高亮，文字和驻地点仍可选。拖动超过阈值才捕获指针，防止拖动误选；双指缩放、滚轮锚点缩放、右下角滑条与百分比同步。
- 性能：requestAnimationFrame 合并输入；缩放按钮平滑收敛；按视野裁剪边界和点位；低缩放跳过县级图层布局；重用边界节点并清理旧标注引用。尊重 prefers-reduced-motion。不承诺所有设备恒定 60fps。
- 地图来源：2026-09-12 下载 DataV areas_v3/bound/510000_full.json 及 21 个市州的 *_full.json；保留原始 GeoJSON 于 frontend/sichuan-city-boundaries.json、sichuan-county-boundaries.json。build-map.cjs 以 .22 投影单位简化轮廓，生成 sichuan-map-geometry.json 和静态 SVG。运行页面无需构建或外部地图网络。行政区示意边界不用于精确测绘，驻地仍不代表景区入口。
- 代码：travel-map.js、map-route-core.js、styles.css、index.html、app.js、build-map.cjs 及地图资源；新增 travel-map.test.cjs、tests/map-performance.html / .js。正式首页不加载性能测试脚本。
- 自动验证（2026-09-13 恢复后）：全部 frontend/*.js 语法通过；app.test.cjs、travel-api.test.cjs、map-route.test.cjs、travel-map.test.cjs 全通过。覆盖 21/183 边界唯一性、完整市域 fit、100–1000% 密集标签无交叠、真实地图事件的县域选择/拖动隔离/双指缩放。中断前真实响应回放通过：后端无坐标站点仍保留南充市。
- 浏览器实测（中断前）：1280 桌面成都筛选 450% 显示 17 个市县标签，实际 DOM 矩形无交叠；375 手机南充地图可读。点击仪陇县轮廓内部，selected=county-511324、标题=仪陇县 · 南充市、高亮=511324。
- 性能实测：隐藏页受限帧影响，不作为流畅度结论。可见页优化前五秒 224 帧，p95=42.4ms、5 次超过 50ms；裁剪与轮廓简化后五秒 244 帧，p95=30.3ms、最大 42.4ms、0 次超过 50ms，SVG 节点数稳定。之后又补充视野外点位裁剪与标注引用清理；最终版本的在线帧率未重新获得：2026-09-13 恢复时 http://127.0.0.1:8001 连接拒绝。没有改后端、容器或部署。
- 截图位于 C:/Users/Rocket/.codex/visualizations/2026/09/10/01a08c5d-b8c1-7301-a48c-fa4514c75077/：map-chengdu-counties.png、map-mobile-nanchong.png、map-county-area-selected.png。
- 下一步：服务恢复后打开 /tests/map-performance.html 可复测当前设备帧间隔，手机双指交互已由事件回归覆盖，仍建议在实际手机上体验。后端缺坐标和价格元数据的问题不变，旅游四接口保持关闭。仅前端提交，未 push、未合并。


### 2026-09-13 服务恢复后的最终在线复测

- Docker 由用户启动后，HTTP travel-map.js 与本地 SHA256 一致。正式页面再次点击仪陇县域内部，选中 county-511324 并高亮 511324。
- 最终版本可见页五秒缩放：首次 261 帧、p95 33.4ms、最大 150.3ms、5 次超过 50ms；热态复测 263 帧（约 53fps）、p95 33.4ms、最大 66.8ms、1 次超过 50ms；两次 SVG 节点数均稳定。此前服务未启动的在线复测限制已解除。仍存在偶发长帧，不能宣称所有设备完全无卡顿；后续若继续追求稳定 60fps，应对具体设备做绘制性能分析。


## 2026-09-13 · 高倍拖动缺块、文字拖选和地块接缝修复

- 修复裁剪：SVG preserveAspectRatio=meet 时容器宽高比与 viewBox 不同，实际可见地图超出名义 viewBox；新增 MapRouteCore.visibleBounds，边界及点位裁剪按容器完整可见范围计算，避免高倍拖动边缘地块突然消失。
- 禁止地图及其子节点 user-select / -webkit-user-select，并在地图 pointerdown 阻止原生文字选择；保留县域点击、文字点击、拖动与双指缩放。
- 接缝处理：不再逐县独立简化，也不混用粗市界与细县界。build-map.cjs 根据共享县级顶点构建弧段，固定交汇点、规范方向，同一弧段只简化一次；市州填充来自同一批县域环，市州边线取消内部共边。保留原始行政区数据，不虚构或移动行政边界；原始数据自身的精度限制仍存在。
- 成都标签仅显示红色“成都”，删除“省会”后缀和说明中的相关字样。
- 实测发现浏览器复用旧版 CSS/JS，新增本轮资源版本参数，地图几何请求不使用缓存，避免新旧资源混用。
- 验证：app.test.cjs、travel-api.test.cjs、map-route.test.cjs、travel-map.test.cjs 及 JS 语法检查全部通过。新增宽/高容器实际范围断言、市县同源几何断言、市州外框不重复描绘内部县界断言。浏览器新版 800% 成都视图拖动通过，window.getSelection() 为空，county-label 的 user-select=none，capital-label=成都。
- 截图：C:/Users/Rocket/.codex/visualizations/2026/09/10/01a08c5d-b8c1-7301-a48c-fa4514c75077/map-drag-seams-fixed.png。
- 性能说明：完整保留原始顶点会增加开销，最终使用共边弧段简化降低数据量至约 1.4MB。最后一次浏览器基准出现约 1 秒的帧间隔，结果不足以确认实际交互帧率，因此本轮不作稳定帧率保证。先前仍带“省会”的截图/基准读到旧资源，不作为本次最终代码的验证。
- 改动仅 frontend/**；共享文档仅回填；未动后端/部署，未合并、未 push。


## 2026-09-13 · 智能体优先首页与视觉整理

- 按用户方向，将主导航从七项收拢为“与蜀汉对话 / 行旅地图”。目的地、规划、预算等不再逐项平铺为首页入口；已实现的模块代码保留，供后续内容接入，不影响原有接口约定。
- 首页以“读懂三国，再出发”为主视觉，直接提供提问框及少量自然问题。新增 landing.js，共用既有 send / toggleChat / 会话状态，文化、路线、预算均通过智能体对话触发。请求进行中从首页发起的新问题保存为对话草稿，不创建重复请求。
- 地图底部的规划按钮也改为请求智能体，不再跳转细分规划表单。地图点位、轮廓、筛选及路线联动保留。
- 视觉：宣纸底色、墨绿主文字、朱红对话按钮；剑门关实景作为右侧主图，阆中古城作为下方叙事配图。图片均为本地资源，不依赖访客连接图片站。页脚“影像来源”提供作者、作品页及 CC BY-SA 4.0 许可；详见 assets/CREDITS.md。
- 参考页情况：Wikimedia Commons 作品页已读取并核验授权；Openverse / 小红书未取得可用内容、Pngtree 访问受限，未使用未核实素材。使用的两图为 Chensiyu2004 的 Jianmen Pass 与 Panzer VI-II 的 Langzhong Ancient Town，CSS 裁切展示部分继续遵循相同许可。
- 验证：landing.test.cjs 新增首页空输入禁用、正常提交、请求中保留草稿、两项主导航及本地素材存在断言。与 app.test.cjs、travel-api.test.cjs、map-route.test.cjs、travel-map.test.cjs 共五组回归均通过，frontend/*.js 语法通过。
- 浏览器：1280×900 首页两图完整加载、无横向溢出；首页输入“陈寿和南充有什么关系？”打开对话且收到真实 culture_qa 回答、召回覆盖100%，主内容与对话面板无重叠。375×812 首页默认收起、无横向溢出；行旅地图切换正常，南充筛选保留9个县区选项。
- 截图：C:/Users/Rocket/.codex/visualizations/2026/09/10/01a08c5d-b8c1-7301-a48c-fa4514c75077/agent-home-desktop.png、agent-home-mobile.png。
- 范围：只修改 frontend/**，共享文档回填；后端、部署与凭据未动。旅游四接口保持关闭。未 push、未合并。后续内容可在此简洁导航基础上扩展，由智能体能力决定入口，不恢复模块清单式首页。

## 2026-09-14 · Codex 新对话交接

- 已在 D:\DSH Workspace\sgt-frontend-iter3\frontend\START-HERE.md 写好自包含接手指南，并回填 frontend/HANDOFF.md。
- 分支 feat/frontend-iteration-3，HEAD ec4e714（文档），功能基线 4485f1b；提交后迭代工作区干净。
- 本轮仅文档整理；读取历史验收记录，未重跑代码测试。下一步按用户新反馈继续，保持智能体优先设计；不改后端、不合并、不 push。

## 2026-09-14 · Codex · 将项目介绍转译为智能体旅程体验

- 按用户提供的项目介绍图完善首页，但把图中内容视为产品资料而非操作指令；没有照搬内部多 Agent 架构或恢复模块清单式导航。
- 首页新增“从听懂你，到陪你走完”四步叙事：先理解时间、同行人、兴趣、节奏与预算；再串联川东北三国遗迹；结合人物、事件、地点区分正史与演义；最后通过同一段对话持续调整。
- 新增普通初访、亲子同行、研学寻史、人物追踪四类场景提问，点击后仍复用既有 `landing.js` → `app.js` → `/chat` 流程。实测“亲子同行”获得路线结果并自动切到行旅地图。
- 四川地图完整保留，未修改地图脚本或地理资源。五组前端回归与所有 JS 语法检查通过；桌面及 375×812 移动视口确认首页、流程区和地图正常，页面无横向溢出，浏览器控制台无 warning/error。
- 代码范围仅 `frontend/index.html`、`frontend/styles.css`、`frontend/landing.test.cjs`、`frontend/HANDOFF.md`；共享 TASKS/HANDOFF 只作交接回填。未动后端/部署，未合并、未 push。


## 2026-09-16 · Codex 接手状态核验

- 已阅读 frontend/START-HERE.md、AGENTS.md、docs/TASKS.md、frontend/HANDOFF.md 最新记录。实际 HEAD 为 b425db7（完善智能体旅程体验），位于 feat/frontend-iteration-3，git status --short 为空；保留 ec4e714 之后新增的四步旅程与四类游客场景。
- http://127.0.0.1:8001/ 与 /health 均返回 HTTP 200，health.status=ok；服务首页与迭代目录 frontend/index.html 内容完全一致。Docker CLI 查询受本地权限限制，未独立核验容器状态，未修改容器或部署。
- 本轮仅接手核验及共享文档回填，没有修改前端代码、重跑回归或进行浏览器交互验收。下一步按用户新需求，仅在 sgt-frontend-iter3/frontend/** 继续，保持智能体核心与两项主导航；不合并、不 push。

## 2026-09-16 · Codex 智能体旅程工作台重构

- 本地提交 fba8a41，分支 feat/frontend-iteration-3；仅修改 frontend/**。将项目介绍图转化为四主题工作台（规划/文化/人物/调整）、同行/讲解偏好、文化线索卡、四川地图入口与回顾调整；主题各自保留草稿，复用当前对话。
- 切换：220ms 可取消入场动画、无异步切换回调、视图滚动位置和焦点恢复、对话开关阅读位置恢复、减少动态效果支持。地图实现及数据未改；选中仪陇县、手动路线和 409% 缩放在往返后保持。
- 验证：全部 JS 语法及六组自动回归通过；1280×900/375×812 浏览器无横向溢出，真实 route_planning/culture_qa 联调通过，控制台未见 warning/error。开关对话实测 scrollY 498→0→498。frontend/HANDOFF.md 与 START-HERE.md 已更新。
- 后端待协调：讲解偏好目前随消息文本传入，文化检索把“亲子故事版”计为未覆盖实体（示例召回67%）；后续应支持独立偏好字段或检索前分离偏好。前端明确本页保留/实际回答以服务为准，没有伪装语音、人物扮演、长期档案或自动评价闭环已接入。旅游四接口继续关闭。
- 下一步根据用户反馈迭代；没有后端/部署改动，未合并、未 push。


## 2026-09-17 · 首页故事线发现入口

### 审查与确认

- 用户要求先审查再改造，确认桌面优先五卡、375px 单列向下浏览；确认仅做五个主题模板，缺项显示待补充/待核验，完整内容等待提供。
- 实际基线为 feat/frontend-iteration-3@fba8a41，开工工作区干净。复用 agent-hero、journey-desk、landing.js 草稿桥接及 showContentView；五个旧隐藏模块保持。
- 需求同时要求两项主导航与 story 按钮：story 入口落在卡片，主导航保持 welcome/map。实际 showContentView 原先未更新 view-label，本轮补齐。
- 文档的坐标、时间、来源均为示例，未直接采用。没有新增史实、时长、章节、景区坐标、实时信息。陈寿与建筑图形均为艺术化 SVG 示意。

### 改动文件与原因

| 文件 | 改动 |
|---|---|
| index.html | 寻迹三国品牌、故事推荐区、轮廓预览、陈寿入口、建筑节点、story 详情面板；保留工作台与两项导航 |
| styles.css | 复用现有令牌实现卷轴卡片、朱红编号、SVG 形象、响应式单列；压缩桌面 hero 以容纳五卡 |
| stories.js（新增） | 五条 SGT_STORIES 待补充模板、四个 SGT_PLACES 待确认节点；安全文本渲染、详情与提问、地图轮廓失败降级 |
| app.js | view-label 同步；无对应主导航时，键盘焦点落到 story 标题 |
| landing.js | 暴露 SGTJourney.ask，共用原有 send 与 pending 草稿规则 |
| travel-map.js | 无识别地点也无歧义地点的问题不清空路线、不跳转空地图；实际联调发现并修复 |
| stories.test.cjs（新增） | 缺项、坐标留空、选择、共享提问、安全文本、轮廓加载失败回归 |
| navigation.test.cjs | story/home/map 的标题、焦点、独立滚动、动画取消与地图状态回归 |
| landing.test.cjs | 新公开桥接的发送与 pending 草稿回归 |
| travel-map.test.cjs | 无地名主题保留路线/视图/缩放；明确地名仍进入地图 |
| HANDOFF.md / START-HERE.md | 本轮结果和接手事项 |

新增 stories.js 在 index.html 的 travel-map.js 后引入（页面末尾），版本为 ?v=story-discovery-1；styles.css、app.js、landing.js、travel-map.js 同步更新该版本串。stories.test.cjs 不在网页中引入。

### 实测

- 所有 frontend/*.js 的 node --check 通过；七组 *.test.cjs 全通过；git diff --check 通过。
- 1280×900：五卡同排完整首屏（底部约 883px），默认对话收起，无横向溢出。375×812：五卡单列、首页/详情/对话无横向溢出。
- 浏览器 Enter 进入故事详情后焦点为 story-title，view-label 为故事线；返回与地图切换可用。地图手选仪陇县经过首页/故事往返后仍存在。自动缩放动画中曾读取 477%→409%，不将这一过程声称为固定缩放保持；固定缩放保持由自动回归覆盖。
- 手机故事详情入口真实调用 /chat 得到“正史 / 演义”检索式回答；结构化信任信息缺失仍显示待核验。发现无地名问题误跳空地图后加 guard，浏览器再次提问保持 story 视图。
- 浏览器自动点击曾两次因 CDP 超时未完成；读取状态后改用键盘 Enter 完成对应操作。浏览器控制台未见 warning/error。没有新保存截图文件。
- /health 实测 ok；index.html、styles.css、app.js、landing.js、stories.js、travel-map.js 的服务端字节与迭代目录一致。

### 取舍与下一步

- 放弃编造完整故事线；人物、地区也不从标题自动推成结构化路线事实。无章节地点时仅展示现有四川轮廓，不画虚假路线。
- 手机优先可读性，不要求一屏塞入五卡。建筑只呈现类型剪影，章节关联待确认。
- 需要内容负责人提供五模板的核心问题、简介、人物/事件、章节顺序与地点、每站理由、可靠 A/B 来源及更新时间；再补可信坐标和出行约束。本轮未实现已完成/探索记录或专门故事匹配接口。
- 后端、部署、数据目录和旅游 API 开关未改；未合并、未 push。下一轮在此迭代目录继续。

## 2026-09-17 三国故事地图交付

在现有 travel-map.js 上增加 story-map.js 图层与控制器，保留原几何、投影和手势实现。首页卡片及故事详情携带 storyId 进入地图；支持章节印章、当前/已寻迹/待探索三态、页内进度、非故事 POI 降权、地名顺序虚线与叙事墨迹线、内联 SVG 建筑微缩、章节/来源卡和继续探索操作。选章通过既有 /chat 携带上一章上下文；忙碌时沿用草稿机制。退出故事恢复原地图视域与筛选，明确加入路线才修改路线。

数据边界：用户确认仅实现模板和缺项提示。蜀道寻踪三章按用户给定顺序为昭化古城、剑门关、米仓道；前两者仅使用已有县级驻地示意，米仓道无落点，不画假坐标或跨缺失点连线。章节正文、人物事件和来源仍待确认；导航禁用。位置示意不是景区入口，虚线不是道路导航。StoryMap.setData({story, places}) 为将来后端数据接入保留适配口，信任元数据/坐标要求见 API-CONTRACT.md。本轮未开启 /api/travel/*，未增加依赖或外链，未改后端。进度仅本页内存状态，手动已寻迹不代表真实到访核验。

验证：全部 frontend/*.js 的 node --check、八组 *.test.cjs、git diff --check 通过。真实浏览器已检查 1280×900 桌面及 375×812 手机布局、首页/详情进入、节点鼠标和键盘选择、自动章节上下文、盖章/下一幕、待定位禁用操作、100%/1000% 分级及高倍拖动。375px 页面无横向溢出；双指缩放以回归测试验证，未用触屏硬件实测。最新鼠标节点选择确认关闭旧地名浮层，进度同步显示。未保存截图文件。

下一步：后端/内容负责人提供可核验故事资料、米仓道具体遗址或县区、GCJ-02 坐标与 A/B 来源/更新时间、道路及入口导航数据，再接入现有适配口。不能把当前演示问答视为完整故事知识服务。代码仅在 sgt-frontend-iter3/frontend，本地提交交人 review，不 push、不合并。

## 2026-09-17 需求12 故事线系统
- Codex 完成：列表四框架筛选/三态、详情章节轴、localStorage进度、手选压缩、三讲解模式与全章收尾推荐。用户确认沿用模板与缺项，不编内容。
- 验证：九组回归及JS语法/diff检查通过；浏览器刷新恢复、章节完成与收尾、375px/桌面检查通过。开发仅 sgt-frontend-iter3/frontend，未动后端/部署，未合并/推送。
- 后续：人补完整正文、每站理由与作用、A/B来源、可靠坐标与现实约束。详情见 frontend/HANDOFF.md 与 START-HERE.md 最新记录。

## 2026-09-18 故事线转现实约束路线
- 复用旧trip-form、plan/budget/travel模块，/chat获取路线，站点reason/时长/开放/风险/更新及章节取舍明确呈现。局部重绘、失败重试、旧响应隔离与县级位置示意完成；四旅游API仍关闭。
- 十组回归、JS语法、diff检查通过；真实后端、375px表单/结果、2/3进度保持、预算出行返回路径验证通过。Docker由用户恢复后完成最终在线检查。
- 实际后端仍忽略半天/已完成约束，且缺ID映射与逐章舍弃依据，已写任务板；前端不伪造可执行结果。详见迭代frontend/HANDOFF.md。未改后端/配置，未push/合并。

## 2026-09-18 文化节点详情
- 新cultural-node.js/node视图复用首页建筑与地图上下文；三模式不变章节地点、保留阅读位置；正史/演义/推断/争议及实时信息分区，C级和缺元数据不得作为史实。五种SVG分层无新增图片。
- 十一组回归/语法/diff通过；浏览器实测227px阅读位置保持、第二幕/剑门关不变、375px无溢出。完整正文依赖内容负责人提供史料与分类，未编造数据。
- API-CONTRACT/START-HERE/前端HANDOFF已更新；不改后端或部署，不push/合并。

## 2026-09-18 人物视角对话（c67b532）
已完成三角色、内联SVG、现有会话/草稿/重试复用、可信度分区、张飞主题与阆中县级示意、史实追问保持章节。十二组测试、语法和桌面/375px浏览器验收通过；工作树干净，未push/merge。人物规则在history，message原文；真实后端无逐项来源时原回答折叠标未核验。下一步由内容/后端负责人补人物可靠摘要与逐项来源，具体适配见迭代frontend/API-CONTRACT.md。没有人物专用接口或长期记忆。

## 2026-09-18 我的三国探索志（4e7fcfe）
新增journal视图，沿用showContentView，主导航第四项；三卷书页与印章进度读取StoryProgress，问题从真实会话归档到本地，最多200条。真实章节足迹复用地图，缺坐标不画点；人物事件缺项不补造；兴趣推荐说明依据。十三组回归、JS语法、diff检查及桌面/375px浏览器通过。联调问题已删除，未伪造探索记录。下一步内容负责人补章节人物/事件与史料；无探索记录后端，不跨设备同步。未push/merge，详见迭代frontend/HANDOFF.md。

### 2026-09-18 需求20修正完成（Codex）
- 本地提交 d8b46c1，位于 sgt-frontend-iter3 / feat/frontend-iteration-3；工作树干净，未推送或合并。
- 完成：显式阶段筛选；张飞兴趣推荐保留人物及当前视图；人物提示持久；真实后端大众/亲子/学术 mode 与章节共享；空模板和探索志缺项说明；地图适配原子校验与静态回退；九项接口契约。
- 验证：13组前端测试、全部JS语法、git diff --check通过；真实页面桌面/375px联调通过，测试会话已删除。无后端、业务数据、Docker变更，TravelApi仍关闭。
- 逐文件修改、修正前后和五条故事线阶段依据详见迭代工作区 frontend/HANDOFF.md；接口预留详见 frontend/API-CONTRACT.md。
- 下一步：人工 review 本地提交；后端接口及文化史料仍由对应负责人补充。本轮无阻塞。

### 2026-09-19 万卷史官·陈寿（Codex，b8c4eb1）
- 已完成右侧常驻陈寿栏：内联SVG四态、真实故事/章节/地点/已寻迹/模式上下文；地图选章本地承接、完成与撤销、手选压缩入口、三人物主题匹配、回答地点可点击。原会话/草稿/隔离/重试和隐藏旧模块保留。
- 14组测试、全部JS语法、diff检查通过；桌面1440及375×812实页验证，地图点击/完成撤销/切视图保持/加载态/南充市州定位通过。测试对话已清理；无控制台报错。迭代工作树干净，未推送或合并。
- 仅 frontend 改动。细节与限制见 sgt-frontend-iter3/frontend/HANDOFF.md 末尾。后端 /chat 演示检索仍可能忽略时间约束，不声称已完成智能压缩；资料不足保留缺项。
- 下一步：人工 review 本地提交；后端上下文推理与史料补齐交对应负责人。本轮无阻塞。

### 2026-09-19 整站视觉语言（Codex）
- 完成迭代frontend/styles.css令牌及组件统一，新增DESIGN-SYSTEM.md与design-system.test.cjs，缓存visual-system-1。保留旧令牌、模块、视图/会话核心行为，无依赖或后端改动。
- 15组测试、JS语法、diff通过；关键文字对比最低4.91:1。375×667对话/375探索志/768宽度/1440首页检查通过。Docker未运行，静态8002预览不含真实/chat联调。
- 已本地提交，未push/merge；具体提交见迭代git日志。下一步人工review，后续页面遵守frontend/DESIGN-SYSTEM.md。

### 2026-09-20 DSH · 后端接口文档 + 协作文档入库 + 推送就绪（无任务编号）
- **新增 `docs/BACKEND-API-REFERENCE.md`**（382 行 / 32.5 KB）：把**后端所有接口**整理成字典 —— HTTP 侧
  （`GET /health`、`POST /chat` 四条意图的**多态矩阵**、静态前端挂载、`/openapi.json`/`/docs`/`/redoc`、
  404/405/422 行为、CORS）+ MCP 侧（`4fcccad` 的 **7 个工具**，含完整 `inputSchema` 与返回结构）+
  **`origin/dev` 上尚未合入的接口变化**（工具 **7→8**、新增 `plan_cultural_route`、新增 stdio 入口
  `src/mcp_stdio_server.py`）。逐字段与边界**全部对运行中的容器实测**（证据脚本见下）。
- **四个关键发现**（已同步进文档、`AGENTS.md` 与任务板 #40）：
  1. 🔴 `route.stops` 缺坐标**不是“没数据”**：`scenic_spots` 表**有 `lat`/`lng` 且已填值**
     （万卷楼 `106.067/30.792`、汉桓侯祠 `105.965/31.577`、王平墓 `106.11/30.78`、剑门关 `105.57/32.214`），
     是 `get_route_detail()` 的 SELECT **没取这两列** → 后端修法 = 一行 SQL + 组装 `coordinates`
     （**经度在前**；坐标系要先核实：库里只到 3 位小数、未标 GCJ-02/WGS84）。
  2. `/health` 的 `redis.enabled` **不是配置开关**：compose 里的 `REDIS_ENABLED` 环境变量**完全无效**
     （`Settings` 里没有该字段 + `extra="ignore"`）；它只表示“redis 客户端是否构造成功”。
  3. `spot_tickets.data_status` 实际是 `manual_demo` / `manual_demo_table`，**不在协议允许集**
     （`sample|maintained|live|pending|stale`）里；且**未知票价被写成 `0.0`**（前端照实显示会像“免费”）。
  4. 之前文档漏了**第 4 条意图** `history_vs_romance`（0.72）：它和 `culture_qa` 一样有 `retrieval`、
     **没有 `route` 键**；另确认 `GET /chat` 是 **404**、`POST /health` 是 **405**、
     三个 `POST /api/travel/*` 是 **405**（落进静态挂载，Starlette 只接 GET/HEAD）。
- **协作文档入库**（协调者 2026-09-20 决定）：`AGENTS.md`、`ARCHITECTURE.md`、`TESTING.md`、`docs/`（共 **8 个 md**）
  作为**一条独立提交**放在 `chore/merge-frontend-into-master` 分支上（前端合并提交 `9623be1` 之上），
  会随该分支进 `master`。**严格排除**了 `src/**`、`.venv` 与根目录那三个 DSH 旧版 Docker 文件
  （提交前用 `diff --cached --name-status` 核对过，只有这 8 个 md）。
- **推送已就绪，但按协调者决定“先不推”**：凭据 OK（Windows Credential Manager）、
  `git push --dry-run` 对**两个分支**均通过；`origin/master → 候选分支` 是**干净的 fast-forward**。
  同时 `git fetch` 发现 **`origin/dev` 已前进到 `546cabf`**（队友 5 个新提交，动了 `src/mcp_server.py`、
  新增 `src/mcp_stdio_server.py`、`src/planning/route_planner.py` +31 行、`prompts/*`），**尚未合进 master**。
- **验证方式**：接口 = `D:\DSH Workspace\.tmp-e2e\probe_all.py` 对 http://localhost:8001 实测
  （证据 `api-probes.json`、`openapi.json`）；数据库结构与取值 = `inspect_db.py` 直查 sqlite；
  推送能力 = `push --dry-run`；文档提交内容 = `diff --cached --name-status` 核对。
- **环境**：容器之前是停的、**Docker Desktop 也关着**（交接文档提过的坑），已拉起并重建，`/health` = ok。
  **主工作树 `frontend/**` 仍未改一行；`src/**`、`deploy/**` 未改。**
- **下一步**：① 协调者决定是否推送（两个分支 / 是否把 `master` 一起 FF 到候选分支）；
  ② 后端两处 P0 缺口（任务板 #33，坐标其实已具备，只差 SQL）；③ dev 的 MCP 新接口待合入。
- **卡点**：**未推送**（协调者选择“先不推”）；`origin/dev` 已领先 master，是否先合 dev 待定。

### 2026-09-20 DSH · 前端推送 dev（协调者指令）+ 前端问题清单
- **协调者指令**：⛔ **不许直接推 master**，改推 `dev`。
- **推送结果**：`origin/dev`：`546cabf` → **`b8a8ce3`**（**纯快进，无强推**）；**`master` 未动**（仍 `4fcccad`）。
  **做法**：`dev` 与前端分支在 `4fcccad` 分叉，**直接推会被非快进拒绝**（也绝不能强推），
  所以先从 `origin/dev` 建 `chore/frontend-into-dev`（新 worktree `D:\DSH Workspace\sgt-dev-integration`，
  稀疏检出 `frontend docs`），依次 `merge feat/frontend-iteration-3`（Codex 最新前端）与
  `merge chore/merge-frontend-into-master`（文档提交），**两次合并零冲突**——dev 侧改的是
  `.idea/**`、`README.md`、`prompts/**`、`src/mcp_server.py`、`src/mcp_stdio_server.py`、
  `src/planning/route_planner.py`，与 `frontend/**`、`docs/**` **路径完全不重叠**。
- **推送前验证（全部通过）**：① 前端树与 `55bb0a0` **逐字节一致**（`1a14ca3…`）；
  ② 队友的 `src`/`prompts`/`.idea`/`README.md` **保留 dev 版本**；③ **零文件丢失**
  （两侧 `--diff-filter=D` 均为空）；④ 相对 `origin/dev` 的改动面 = `frontend/**` 48 个 +
  `docs/**` 5 个 + 3 个根 md，**「其他」为 0**；⑤ **15/15 前端回归通过** + 全部 JS 语法通过；
  ⑥ 先 `push --dry-run` 确认是快进才真推。
- **新增 `docs/FRONTEND-ISSUES.md`**：把当前前端问题按**责任人**分四组 ——
  **F1–F9（前端自己改）**：首屏 13 个同步脚本 / ≈288 KB 且无压缩、地图数据 3.37 MB（1.76 MB + 1.38 MB JSON）
  且懒加载待确认、两张图 537 KB 未压、地图偶发长帧（p95 33.4 ms / 最大 150.3 ms）、
  移动端触摸与无障碍未系统验收、localStorage 只有本机（问题上限 200 条）、四个 `/api/travel/*` 开关待联调、
  验收截图只在 Codex 本地目录、前端文档里的 HEAD tip 已过期；
  **B1–B9（交后端队友）**：`stops` 缺坐标（**数据其实已有，只差一行 SQL**）、价格 `data_status` 与未知金额 `0`、
  「从南充出发，去阆中、剑阁，再到广元旅游」被漏判为 `culture_qa`、路线忽略硬约束（南充半天仍 8 小时模板）、
  `placeId↔spot_id` 无稳定映射、米仓道缺坐标、四接口未实现（GET 404 / POST 405）、上下文压缩不保证、
  dev 上队友改过的 MCP/route_planner 待合 master 后需重跑前端联调；
  **C1–C4（内容负责人）**：五条故事线模板正文/来源、文化节点正文与分层依据、票价开放时间来源、实景图片授权；
  **D1–D4（协作流程）**：`docs/` 在旧 worktree 读不到、`.venv` 仍被跟踪、master 落后、worktree 增至 4 个。
- **改了哪些文件**：新增 `docs/FRONTEND-ISSUES.md`；更新 `AGENTS.md`、`docs/TASKS.md`（#31 改写、新增 #42/#43）、
  `docs/HANDOFF.md`（本条）。**主工作树 `frontend/**` 与 `src/**` 仍未改一行。**
- **当前状态**：可运行。`dev` 已含前端全量 + 协作文档；容器 healthy（http://localhost:8001，挂载迭代 worktree）。
- **下一步**：① 前端按 `FRONTEND-ISSUES.md` 的 **F 组**自改（F1/F2/F3 收益最直接，且不依赖任何人）；
  ② **B 组**交后端队友；③ 决定 `dev → master` 时机（现在是干净快进）；
  ④ `sgt-dev-integration` worktree 可 `git worktree remove`（分支保留）。
- **卡点**：无阻塞。注意 `master` 仍落后于 `dev`（协调者要求不推 master）。

### 2026-09-20 DSH · 用最新仓库的干净克隆替换旧工作副本
- **协调者指令**：把最新仓库克隆下来，替换先前的克隆。
- **先备份「无法从远端恢复」的三样**：
  1. 本地 **5 个遗留提交**（`chore/commit-missing-modules`）打成
     `D:\DSH Workspace\backup-agent_threekingdom-20260920.bundle`（9.7 MB，`git bundle verify` 通过）；
  2. `.env` —— 与 `.env.example` **逐字节一致**，确认不含机密，仍复制到新仓库；
  3. **DSH 版根 Docker 三件套**（`Dockerfile`、`docker-compose.yml`、`docker-entrypoint.sh`，任务 #22 待决策）
     → 存入 `D:\DSH Workspace\sgt-local-backup-20260911\dsh-webapi-docker-20260920\`。
- **克隆与验证**：`git clone -b dev https://gitee.com/wwffyyy/agent_threekingdom.git`（1267 个文件，
  **含被跟踪的 `.venv` 1120 个文件 / 20.4 MB**）。验证：工作区**干净**、`frontend` 树与 `55bb0a0`
  **逐字节一致**、`docs/` 与 `AGENTS.md` 齐全、**15/15 前端回归 + 全部 JS 语法通过**。
- **替换**：旧副本改名 `agent_threekingdom-frozen-20260920`（**保留作回滚点，未删除**），新克隆接管
  `D:\DSH Workspace\agent_threekingdom`；从 bundle 恢复 `chore/commit-missing-modules`，
  并按已知 SHA 重建 `feat/frontend-iteration-2/3`、`chore/merge-frontend-into-master`、`chore/frontend-into-dev`。
  新克隆没有本地 git 身份，已从旧副本取回 `user.name`/`user.email` 配好。
- **删除 3 个失效 worktree**：`sgt-merge-frontend`、`sgt-frontend-iter3`、`sgt-dev-integration` ——
  它们的内容都已在 `origin/dev` 里验证过（前端树逐字节一致），删目录不损失历史。
- **容器挂载改回主仓库**：快照 `docker-compose.backend.yml` 的前端挂载源 →
  `D:/DSH Workspace/agent_threekingdom/frontend`，重建容器后抽样实测服务端 7 个文件与主仓库
  **逐字节一致**、`/health` = `ok`（服务仍在 http://localhost:8001）。
- **文档同步**：`AGENTS.md`（新增「仓库与工作区布局」，替换全部旧 worktree 路径）、`docs/TASKS.md`、
  `docs/HANDOFF-TO-CODEX.md`（工作区章节重写）、`frontend/START-HERE.md`、`docs/FRONTEND-ISSUES.md`
  （D1/D4 标记为已解决）。文档更新已提交并推送到 `dev`。
- **结果**：工作区只剩 **4 项** —— 主仓库（干净、停在 `dev`）、部署快照、旧副本（回滚）、bundle 备份；
  **不再有 worktree、不再有稀疏检出，文档与代码同源**。
- **下一步**：① 前端按 `docs/FRONTEND-ISSUES.md` 的 **F 组**自改；② **B 组**交后端队友；
  ③ 确认无误后可删旧副本与 bundle；④ `dev → master` 的时机由人决定（协调者当前明确不推 master）。
- **卡点**：无阻塞。

### 2026-09-20 DSH · 补齐后端接手文档（让队友能接着干）
- **起因**：协调者问「远端推的 md 是否支持队友继续工作」。审查结论：**部分支持 —— 缺关键一份，且 `TESTING.md` 会把人带沟里。**
- **审查发现（都已在文档里改掉）**：
  1. **`TESTING.md` 照着跑会崩**：第一步就让人跑 `src/ingest/create_vector_collection.py` —— 那脚本只认 Milvus
     且**没有兜底**，镜像不装 `pymilvus` → `RuntimeError`；§1 又写「预期 `vector_backend: milvus`」，
     而**本机实际是 `local`**（照旧判会误报失败）；Docker 段让人在仓库根跑 `docker compose up --build -d` ——
     那套跑的是 **MCP 服务**（`san-guo-mcp`，只开 `127.0.0.1:8000`），**不是 Web API + 前端**。
  2. **`ARCHITECTURE.md` 停在旧状态**：MCP 写「7 个工具」（dev 已是 **8 个**，另有 stdio 入口
     `src/mcp_stdio_server.py`）；`data_status` 写的词表（`verified`/`manual_pending`/…）与
     `docs/BACKEND-API.md`（`sample`/`maintained`/…）以及**数据库实际值**（`manual_demo`/`manual_demo_table`）
     **三套互不一致**；§8 Docker 描述的是那套坏配置。
  3. **`AGENTS.md` 里没有「队友」这个角色**：分工表只有 Codex / DSH / 人，而且通篇是前端协作视角。
  4. **没有一份「后端工作单」**：后端待办散在 `docs/FRONTEND-ISSUES.md` 的 B 组里 —— 名字就叫 FRONTEND 的问题清单，
     后端同事很可能根本不看。
- **做了什么**：
  1. **新增 `docs/BACKEND-TODO.md`（核心交付：后端工作单）**：P0/P1/P2 分级，每条带
     **实测证据 + 改哪里（含确切 SQL / 文件）+ 验收标准 + 可复制自测命令**；另有
     「怎么把后端跑起来（本地直跑 & Docker 实情）」「改完怎么自证（后端链路 + **前端 15 组回归**）」、
     协作约定（进 `dev`、不推 `master`、先 dry-run）与文档索引。
     其中特别点明 **P0-1 坐标「数据其实已经有了」**：`scenic_spots.lat/lng` 五个景区都有值（万卷楼 `30.792/106.067` 等），
     是 `get_route_detail()` 的 SELECT **没取这两列** —— 一行 SQL 的事；
     并强调**坐标系必须先核实再标 GCJ-02**（不能确认就标 `WGS84` 或走降级，**宁可降级也不要骗前端**）。
  2. **修正 `TESTING.md`**：去掉致崩的建表步骤、改用 `C:\Python\Python311\python.exe` 并要求
     `VECTOR_BACKEND=local`、把 `vector_backend` 预期改成 `local`、Docker 段改成实话（根 compose 是 MCP；
     `deploy/` 那套有三处问题）、验收表补 422 / 多态字段 / MCP 8 工具 / **前端 15 组回归**。
  3. **修正 `ARCHITECTURE.md`**：8 工具 + stdio 入口、`data_status` 三套词表冲突与 `updated_at` 兜底问题、
     Docker 现状与修法指向、新增「2026-09-20 实测补充」（意图漏判反例、坐标已有但未输出、`/chat` 无响应模型…）。
  4. **`AGENTS.md`**：分工表加入 **队友（后端）** 角色与范围；顶部加「后端同事从这里开始」的入口；
     去掉会过期的硬编码 tip；§8 加「后端工作单」索引；顺带把「7 个工具」改成 8 个。
  5. **`docs/TASKS.md`**：新增 **「后端待办（队友）」** 小节（#45–#52，并把 #27/#28/#33 归并进去），本项记为 #53。
  6. **交叉链接**：`docs/BACKEND-API-REFERENCE.md`、`docs/BACKEND-API.md` 顶部都加了指向工作单的指引。
- **怎么验证的**：所有「数据/接口」类结论都在 `dev` 上**重新核实过** ——
  `get_route_detail()` 仍未 `SELECT s.lat, s.lng`；`data/examples/scenic_spots_*.json` 五个点都有 `lat`/`lng`；
  `src/api.py` 仍只有 `/health`、`/chat`、静态挂载（四个 `/api/travel/*` 仍缺）；
  根 `docker-compose.yml` = `san-guo-mcp`；`deploy/docker-compose.yml` 的 `context: .` 与缺 `VECTOR_BACKEND` 仍在。
- **改了哪些文件**：新增 `docs/BACKEND-TODO.md`；修改 `TESTING.md`、`ARCHITECTURE.md`、`AGENTS.md`、
  `docs/TASKS.md`、`docs/BACKEND-API-REFERENCE.md`、`docs/BACKEND-API.md`、`docs/HANDOFF.md`（本条）。
  **`src/**`、`frontend/**` 一行未改**（本轮只动文档）。
- **下一步**：队友按 `docs/BACKEND-TODO.md` 从 **P0 三条**开始（坐标 / 价格元数据 / 意图漏判）；
  前端按 `docs/FRONTEND-ISSUES.md` 的 **F 组**自改。
- **卡点**：**`data_status` 词表要由协调者拍板选一套**（现在三套并存：两份文档各一套 + 数据库实际一套），
  否则后端改了前端也不知道认哪个。
  → ✅ **已于同日拍板：用第一套 `sample|maintained|live|pending|stale`，见下一条记录。**

### 2026-09-20 DSH · `data_status` 词表拍板（协调者：**用第一套**）
- **决定**：全项目统一用 **`sample` / `maintained` / `live` / `pending` / `stale`**（= `docs/BACKEND-API.md` 那套，**唯一口径**）。
  另两套**作废/待迁移**：`ARCHITECTURE.md` 旧版的 `verified`/`manual_pending`/`simulated`/`manual_demo`；
  数据库与样例数据里实际的 `manual_demo` / `manual_demo_table` / `manual_fixed`。
- **依据（为什么选它）**：**前端已经把这一套硬编码实现在四处** ——
  `frontend/app.js`（`statuses`）、`frontend/travel-modules.js`（`names`）、`frontend/story-map.js`（`statuses`）、
  以及 `frontend/character-chat.js` / `cultural-node.js` 的"可靠"判定；`frontend/API-CONTRACT.md` 写的也是这套。
  换别的词表要动前端，而且前端判定还**绑定** `updated_at`（须带时区）与 `sources[]`（须有 A/B 级来源）。
- **落地（已同步 6 个文件）**：`ARCHITECTURE.md`、`docs/BACKEND-API.md`（标为唯一口径）、
  `docs/BACKEND-API-REFERENCE.md`（§6.2 顶部）、`docs/BACKEND-TODO.md`（P0-2：给出**迁移映射表** + 前端判定规则）、
  `docs/TASKS.md`（#46 备注）、`docs/HANDOFF.md`（本条）。`frontend/API-CONTRACT.md` 本来就是这套，**无需改**。
- **迁移映射（队友照这个改种子数据与 DB）**：`manual_demo`→`sample`、`manual_demo_table`→`sample`、
  `manual_fixed`→`maintained`；未知/未核验（米仓道坐标、待核验票价…）用 `pending`；外部 MCP 实时数据用 `live`；超期用 `stale`。
  另注意：`scenic_spots.ticket_source_status` 与 `hotel_budget_tiers.source_type` **不是** `data_status`（名字像但不同用途，建议改名）。
- **改了哪些文件**：上述 6 个 md；**`src/**`、`frontend/**` 一行未改**（本轮仍只动文档）。

### 2026-09-20 DSH · 用最新仓库构建可运行容器（8002）并在其上复测后端问题
- **做了什么**：新增 `D:\DSH Workspace\sgt-latest-dev\`（`docker-compose.latest.yml` + `README.md`）——
  构建上下文直接指向**主仓库**（`dockerfile_inline`，不碰仓库自带的 Docker 配置），
  构建出镜像 `sanguo-latest:dev`（约 440MB），启动容器 `sanguo-latest-api` @ **http://localhost:8002**，
  与 8001 上那个联调快照容器**并存互不干扰**。
- **验收（全部通过）**：`/health` = `ok`（`vector_backend=local`）；**四条意图全过**
  （route_planning 0.82 / culture_qa 0.55 / **history_vs_romance 0.72** / budget_ticket 0.78）；
  缺 `message` → **422**、空串 → 200 `culture_qa`、`GET /sse` → 404（MCP 不在 Web API，符合预期）；
  `/docs`、`/redoc`、`/openapi.json` 可用；前端 6 个资源（含 1.8MB 的县界 JSON）与仓库**逐字节一致**；
  容器内 `src/api.py`、`src/mcp_server.py`、`src/mcp_stdio_server.py`、`src/planning/route_planner.py`、
  `src/tools/travel_business_tools.py`、`frontend/index.html` 与仓库**逐字节一致**；
  容器内 MCP 工具数 = **8**；`data/processed/*` 写入后 **git 仍干净**（`.gitignore` 覆盖）；
  启动日志显示 seed → ingest → uvicorn 正常（`seed` 幂等，反复重启不堆重复数据）。
- **在最新代码上复测出的四件事（重要）**：
  1. **`route_planning` 多了三个顶层字段**：`planning_preferences`（已解析城市/时长/人群/交通/兴趣）、
     `notice`（"路线顺序和停留时间来自 Demo 模板…"的诚实提示）、`data_status: "demo_template"`。
     → 已写进 `docs/BACKEND-API-REFERENCE.md` **新增的 5.3 节**（本文 3.2.3 节的矩阵是 `4fcccad` 的，dev 上是 7 个键）。
  2. ⚠️ **`demo_template` 不在拍板词表里** → 已加为 `docs/BACKEND-TODO.md` P0-2 的第 5 条（要求改成 `sample`）。
     前端对它**安全降级**：`app.js` 的 `Object.hasOwn(statuses, …)` 判定失败 → 显示"回答 · 待核验"，不报错、不露原串。
  3. **P1-1 有进展但没修完**：`planning_preferences.duration_hours` 已正确解析成 **4**，
     但返回的模板仍是 **8/16 小时** → "**约束能解析、没生效**"（已更新 BACKEND-TODO P1-1 的证据）。
  4. **P0-1 未修**：`stops[]` 仍无坐标；**B3 意图漏判仍在**（"从南充出发，去阆中、剑阁，再到广元旅游" 仍落 `culture_qa`）。
  5. 前端新增待办 **F10**：把 `notice` 与 `planning_preferences` 展示出来，并标出与模板时长的冲突。
- **改了哪些文件**：新增（仓库外）`D:\DSH Workspace\sgt-latest-dev\docker-compose.latest.yml` 与 `README.md`；
  更新 `AGENTS.md`（§4 容器用法 + §8 导航）、`docs/TASKS.md`（#54）、`docs/BACKEND-API-REFERENCE.md`（5.3）、
  `docs/BACKEND-TODO.md`（P0-2/P1-1）、`docs/FRONTEND-ISSUES.md`（F10）、`docs/HANDOFF.md`（本条）。
  **`src/**`、`frontend/**` 一行未改。**
- **下一步**：直接开 http://localhost:8002 目视验收（前端与接口都在这一个容器里）；要换端口或改成"改完刷新即生效"见 `AGENTS.md` 第 4 节。
- **卡点**：无。

### 2026-09-20 DSH · 删旧镜像 + 容器合并到 8002 + 让队友「pull 后能直接开发」
- **① 删旧镜像（协调者指令）**：镜像总量 **5.98GB → 3.90GB**。
  - `sgt-preview-threekingdom-api:latest`（433MB，8 天前，无容器引用）→ 删；
  - 悬空镜像 `<none> a8764d4b6f74`（**2.03GB**，8 个月前）→ 删；
  - `sgt-snapshot-4fcccad-827adc8-threekingdom-api:latest`（433MB）→ 按协调者选择：
    **先停掉并删除 8001 容器**，再删镜像。（inventree/postgres/redis 的镜像**一个字都没动**。）
- **② 联调能力搬到 8002（成为唯一容器）**：给 `sgt-latest-dev\docker-compose.latest.yml` 加了
  **主仓库 `frontend/` 的只读挂载**并重建容器 → 现在 8002 同时是「跑最新 `dev` 代码」+「改前端刷新即生效」。
  验证：放一个临时标记文件进仓库 `frontend/`，容器内立刻能读到、删掉即消失，且**仓库 git 仍干净**。
  快照目录与它的 `Dockerfile.backend`/`compose` 仍保留，需要时可一键重建。
- **③ 队友「pull 后能直接开发」——实测通过（这是本轮重点）**：
  全新 `git clone -b dev` → 建**独立 venv**（不用仓库里被跟踪的 `.venv`）→
  `pip install -r requirements.docker.txt`（**68 秒**）→ `seed`（Business database seeded）→
  `ingest`（Indexed 8 chunks）→ `uvicorn` → **四条意图全过 + 首页 200**。整条链路只用 3 条命令。
- **④ 为此补齐的文档缺口**（原来是真会让队友踩坑的）：
  1. **没说装哪份依赖** → `requirements.txt` 含 `sentence-transformers`/`pymilvus`，会拖 torch（几个 GB）；
     实测够用的是 **`requirements.docker.txt`**。已写进 `docs/BACKEND-TODO.md` 新增的 **§1.0「从零到能跑」**、
     `TESTING.md`、`AGENTS.md` 第 2/4 节。
  2. **Python 版本自相矛盾**：`pyproject.toml` 写 `requires-python = ">=3.12"`，但**实测 3.11.4 完全能跑**
     （容器基底也是 3.11）→ 已写明"别用 `pip install -e .`"，并指出 DSH 遗留分支里的 `a370553` 可放宽。
  3. **文档引用的复现脚本全在仓库外**（`D:\DSH Workspace\.tmp-e2e\`）→ 队友克隆后拿不到。
     已**移进仓库** `docs/tools/`（`probe_api.py`、`inspect_db.py`、`measure_frontend.py`、`replay_frontend_map.cjs`）
     并改成**自动定位仓库根**（换机器不用改代码），4 个工具**全部实测通过**（含无浏览器回放地图）。
  4. **被跟踪的 `.venv`**（3.12、路径是上次那台机器的）克隆时会被带下来 → 已写明"别用、venv 建到仓库外"。
  5. **绝对路径是本机约定** → 已在 `BACKEND-TODO.md` §1.0 加说明。
- **⑤ 连带更新**：`AGENTS.md`（§1–§4/§8：容器改 8002、合并重复段落、本地运行改为系统 Python + 依赖说明、
  新增 `docs/tools` 导航）、`TESTING.md`、`frontend/START-HERE.md`、`docs/HANDOFF-TO-CODEX.md`、
  `docs/BACKEND-API.md`、`docs/BACKEND-API-REFERENCE.md`、`docs/TASKS.md`（#54 更新 + 新增 #55）、
  `D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8\SNAPSHOT.md`、`D:\DSH Workspace\sgt-latest-dev\README.md`。
- **改了哪些文件**：仓库内 8 个 md + 新增 `docs/tools/`（4 脚本 + README）；仓库外 2 个 md。
  **`src/**` 一行未改**（前端只动了 `frontend/START-HERE.md` 这一处指针说明）。
- **结论（回答协调者的问题）**：**现在队友 `pull` 之后可以直接开工** ——
  `clone → pip install -r requirements.docker.txt → seed → ingest → uvicorn`，实测约 2 分钟；
  待办、协议、证据、验收标准、自测脚本都在仓库里。
- **卡点**：无。
# 2026-09-21 Codex：老师资料 BGE RAG 首批

- 工作目录为用户本机 `D:\agent_threekingdom`，分支 `feat/bge-teacher-rag`；与本文其他 DSH 机器路径不同。
- 已接入 `E:\bge-large-zh` 实际本地 1024 维模型，离线加载，显式拒绝新旧模型索引混用；PDF 首批 13 篇 / 346 段已完成嵌入。
- 产物与逐文件清单位于 `E:\codex_workplace\sanguo-rag\teacher-bge-v1`；旧 hash 库未改，原PDF未改，1篇重复跳过、19篇待后续清洗/OCR。
- 8项 unittest 通过，5组真实混合检索命中预期论文；故里专题蔡东洲/刘敏两方同时召回。8011 `/health` 确认 bge/1024，`/chat` 实际调用现有LLM返回周国林论文相关答案和PDF页码。未经全量事实/引文人工评测。
- `.env` 仅更改本地嵌入配置，不提交；密钥未改。8010 老进程保留，8011 独立新验证服务由 `scripts/start_teacher_rag.ps1` 启动。新启动MCP会读取新配置，已运行MCP需用户重新加载。
- 未合并昨日其他分支，未推送。重启8010前须协调前端/后端集成分支；本轮不承诺旧前端REST缺口已处理。详细使用与边界见 `docs/TEACHER-RAG.md`。

## 2026-09-21 Codex：网页转接女娲智能体

- 工作目录 `D:\agent_threekingdom`，分支 `feat/nuwax-web-chat`。初始适配代码已随用户提交 `f032fce` 入库，本轮收尾流解析 CRLF 兼容、测试与说明，不推送、不合并。
- 新增后端女娲会话适配器及 `/chat/stream`，网页分对话保存不透明会话令牌，显示回答/执行进度/失败；保留 REST 景点与结构化路线表单。MCP 本地服务不走该适配器，避免递归。
- 26 项后端、16 组前端回归通过。真实浏览器请求到达女娲，但平台返回“智能体客户端已离线”；不能声称网页 → Agent → 本地 MCP 全链成功。
- 卡点：NuwaClaw 未运行，且 `.env` 电脑 ID 非数字（不输出实际内容）；实现已安全忽略并告警。用户上线并提供正确数字电脑 ID 后再联验。未改密钥或平台配置，未动 RAG 数据。
- 使用步骤、运行命令与单进程/本机安全边界见 `docs/NUWAX-WEB-CHAT.md`。8010 是本轮启动的本机服务；其他文档的 DSH 机器路径和 8002 容器不适用于本机。
- 浏览器模拟响应验证正文默认展开与工具状态显示；已撤掉模拟路由并刷新回真实后端。更新人物组件资源版本避免浏览器沿用旧折叠逻辑；该模拟验收不是智能体/MCP 实调成功。

## 2026-09-22 Codex：真实 MCP 联调完成

### 后续：修复回答呈现和阅读空间

### 项目提示词与故事线背景（2026-09-22）

- 2026-09-23 收尾：新建 `fix/story-prompt-handoff`（从用户 dev 最新提交开始），修复故事线讨论按钮仍将整段模板显示成用户消息的问题；现只显示自然提问，模板限制放入后端用户模板。Playwright 真实点击张飞故事卡 → 讨论按钮，拦截请求验证 `story_id=zhangfei`、message 只有自然问题、背景不在聊天中；模拟响应已撤销。未改窗口尺寸、页面布局或平台配置。启动本地 8010 服务；平台系统词仍需用户粘贴后发布，本轮不宣称新系统词已在线生效。

- 更新 `prompts/nuwax_agent_system_prompt.md`，替换通用电脑助手定位；优先直接文化检索/业务工具，取消机械空栏目，不默认浏览器/终端操作，明确证据、争议、模板和动态信息边界。该文件需在女娲 Agent 编辑页的系统提示词中替换并发布，本地文件不会自动更新平台。
- 新建 `prompts/nuwax_user_prompt.md`，由 `src/agent/web_prompt.py` 在每轮加载；五条故事线 ID 对应服务端自有指导，未知 ID 安全回退。前端每条请求快照传 story_id，后端注入模板；聊天气泡/历史标题继续只用原始问题。调整前端人物规则，取消强制四栏目。
- 背景只是用户层辅助，不伪装系统消息，不保证模型绝不复述；隐藏是 UI 不展示，不是保密机制。请求网络与女娲平台会话可能查看到模板，因此不得放密钥。
- 29 项 Python 和 17 组前端回归通过，覆盖故事线切换、未知 ID、原始问题显示、重试快照。重启本轮启动的 8010 服务使新增接口字段生效；用户需刷新并新建对话。未远程修改或发布 Agent、未推送/合并。

- 用户要求仅微调：撤掉 1921f01 的额外 flex/overflow/短屏布局修改，只保留聊天面板 `bottom:20px; height:calc(100dvh - 20px)`。此前浏览器测试残留 375px 模拟视口导致窄页面，已清理模拟并恢复桌面测试尺寸；后续不要将用户使用的测试浏览器留在手机尺寸。

- 第二轮底部裁切反馈：面板高度减去 space-4 安全间距，添加最大高度及整体 overflow 约束；输入/发送区不收缩，短窗口收起页脚。四组窗口尺寸与设置展开/折叠下验证发送按钮边界；未修改回答逻辑。浏览器资源版本升级为 nuwax-viewport-3。

- 女娲自然语言回复独立展示，不套旧 evidence_segments 的缺省“无可靠史料”模板；增加安全 DOM Markdown 子集（表格、标题、列表、粗体、代码、HTTPS/HTTP 链接），不执行模型 HTML，移除平台过程占位标签。未把正文推测为地图节点/结构化来源。
- PROCESSING 按工具名称展示最新状态（不是调用次数审计）；历史完整事件仍留在响应里。路线背景/人物设置默认折叠，明确章节引导操作会展开设置；单个背景滚动区替代多个卡片滚动区，压缩头像和输入区。
- 实际从网页调用景点 MCP，表格渲染成功；375/684/1440 截图及无横向页面溢出、正文区至少 300px 检查通过，17 组前端测试通过。布局遵循 impeccable 的内容优先/渐进展开，保留纸色和朱红/墨绿设计。
- `.idea/.name` 为用户改动，未纳入提交。仍未推送/合并。

- `D:\agent_threekingdom`，仍为 `feat/nuwax-web-chat`，代码工作树开始时干净。本轮未修改密钥、平台配置或业务数据。
- 启动本机 API（8010，PID 35500）和已安装 NuwaClaw；默认电脑绑定恢复。简单问答成功，真实网页发送景点查询成功，收到两条南充景点与 MCP FINISHED 事件。
- 文化检索经 `/chat/stream` 调用：首次 FAILED、平台自行重试后 FINISHED，回答报告 63 候选/5 命中，来源及页码见 NUWAX-WEB-CHAT.md。未直接保存原始 MCP result，论文内容仍需校验。
- 昨日“需先填数字电脑 ID 才能继续”的限制不适用于当前默认绑定；非数字值仍忽略/告警，但调用成功。本轮不猜测或替换 ID。
- 下一步可优化 BGE 冷启动、平台自定义标签清理/Markdown 排版和进度去重；核心联调已完成，不等于这些质量问题已解决。未推送、未合并，服务保持运行供用户体验。
# 2026-09-29 注释中文化

- 用户要求将代码英文说明改为中文。修改前后端、测试、入库脚本、Docker及依赖文件的说明注释，不修改算法、接口字段、配置值或密钥。BGE/MCP等技术名称和测试覆盖率指令保留。
- 15个已跟踪Python文件的可执行语法树与原版一致，8项RAG测试及全部前端回归通过。
- 本轮从当前dev创建feat/chinese-code-comments，不推送或合并。此前遗留的4个未跟踪文件保留；其中入库/验证脚本说明已中文化，但不随本轮已跟踪文件提交，以免混入未完成的入库任务。
- 这次仅调整注释，不代表新增文献索引已经完成验收或切换。

