# 第九批文案 C11–C21 实施计划

**Goal:** 按协调者工作单完成11条显示文案修复，保留原回答与原数据。
**Architecture:** 在已有DOM渲染处补解释、区分来源类型及格式化摘要，不改API、事实、来源等级或存储数据。
**Tech Stack:** 原生HTML/CSS/JS、既有Node assert/vm测试，无新依赖。
**Spec:** frontend/COPY-AUDIT-20261003.md §3及本轮工作单。

## 约束

仅frontend/**，固定分支feat/frontend-acceptance-20260929，基线d342f9c1fb784d610ed5eff37877a2523e2a013c；1920×1080；不改docs/AGENTS、不push/merge/重置/清理。A=权威资料、B=较可靠资料、C=文学/传说，C不能支撑史实结论。

## 实施步骤

- [x] app.js/app.test.cjs：C11已确认住宿服务格式增加估算与人民币单位解释，未知币种不推断；C12历史等级与model/forecast分开；C16用已核对的route_stops.stay_minutes/scenic_spots.recommended_duration_min区分安排与参考；C21等待可见文字及辅助标签一致。先回归失败，再实现、复验及提交。
- [x] travel-modules.js/travel-modules.test.cjs：C12历史来源中文定义，天气卡不套史料等级；C15按air_quality.units实际值显示浓度单位，缺单位不猜。先失败，再实现、复验及提交。
- [x] character-chat.js/character-chat.test.cjs：C14只从明确可用时间/游玩时间字段或明确游客时间陈述取唯一半天/一天/两天；冲突或未给时间仍询问。推荐只影响前端固定文字，保留回答原文。先失败，再实现、复验及提交。
- [x] cultural-node.js、stories.js及既有测试：C17状态去重、列当前显示/待确认项/更新时间，来源与坐标边界保留；C18文学空态及来源标题独立，可靠正文与默认折叠保持。先失败，再实现、复验及提交。
- [x] index.html、journal.js及既有测试：C13章节完成图例、C19审慎开头、C20单段本地边界；200条上限/删除撤销/存储异常/非到访保持。先失败，再实现、复验及提交。
- [x] 24JS语法+19测试；真实浏览器逐项、五tab双聊天状态、Console、资源SHA256；截图与JSON入本目录；只读独立评审。验收提交仅显式暂存本目录。

## Review Focus

1. 已确认住宿格式与未知币种不混淆，原文本逐字保留。
2. model/forecast实时来源不被解释为文学传说；未知来源等级不擅自归类。
3. 未给单位的数值不添μg/m³，异常units值不致崩溃。
4. 一天与半天/两天冲突、建议段/历史背景不充当游客已确认条件。
5. 资料去重仍保留位置示意、入口待核对与来源链接；文学缺文本不冒充史料。

## 执行记录

开工：分支/完整HEAD匹配、暂存区空。AGENTS.md新增协调者现状说明已只读核对；既存docs/审计全部保留。直接按已授权工作单在当前分支实施，计划与进度放本目录；不创建其他工作区、不要求重复审批。

实现提交：f4f63ed（预算、来源、时长、单位与等待文案）、7fa7283（时间推荐、核验状态及文学空态）、4a3d35c（图例、读史提醒及探索志）。只读独立评审发现C14误认历史背景/先前建议，补充失败样本后在bb0124a修复；review-red.json/review-green.json记录复验。最终验证24JS/19测试全部通过，7资源HTTP哈希一致，31张原始桌面截图与DOM、10布局状态、Console零warn/error均归档；既存docs/AGENTS哈希与审计状态不变。
