# 单故事替换验收 · 2026-10-05

开工基点：dev / 74038e9；本批只提交 frontend，不 push / merge / 强推。

## 结果

- `SGT_STORIES.length === 1`；首页真实 DOM 只有1张故事卡：陈寿编书史 / chenshou-book-history / chapters=[]。原五条数据已删除。
- 缺章节明示待补充 / 待核验；详情开始探索与选中故事的地图入口禁用。未选故事时的独立四川地图保留，文化地点与“让陈寿推荐”保留。
- 新 id 没有进度迁移。旧 id 的本地记录不纳入当前目录统计，探索志没有旧故事、空标题、旧足迹/人物事件或下一条推荐；保留用户真实提问文字。本批不破坏或伪造旧用户记录。
- 陈寿关联新故事；张飞/诸葛亮仅文化与地点动作。旧消息的章节压缩动作不再指向已删除故事。旧保存活动正文仍可读，旧故事关联与章节快照不恢复为当前目录。
- 阶段筛选与单卡横滑控件、推荐代码及相关样式已删除；故事线三档的内部 mode 和 POST 值保持原契约。
- 多章节进度、地图、完成/撤销、地点动作及内容适配均使用标明用途的测试夹具，真实故事保持空章节，没有编造正文、节点或路线。

## 执行证据

- 最终递归 `node --check`：25/25 个 *.js 通过；全部 *.test.cjs：24/24 通过。保留全部测试文件，旧期望按新需求调整。
- 真实 localhost:8002 / Edge Chromium / Asia/Shanghai / 1920×1080：13项浏览器检查通过，health=ok，Console/Page errors=[]。
- welcome/story/destinations/map/planner/plan/journal/node × 聊天开/关，16组文档及当前面板无横向溢出。n8-n9、n10-n17浏览器脚本实际执行通过。
- 真实页面目录与1卡/空章节禁用实测。旧进度孤儿、人物动作、旧保存活动、地图适配失败均为隔离浏览器上下文中的**显式夹具**，不冒充后台内容或真实游客记录。
- 目视检查首页、探索志1920截图；空章节地图按钮呈禁用灰态。截图/JSON仅用于临时取证，验收后清理。
- 本地与 HTTP 9/9 改动 JS/CSS/HTML SHA256一致，具体哈希见下表。

## 审查与裁定

- 独立只读审查发现1个 Important：有效地图适配数据被撤销时，空目录不能清掉旧章。先补回归确认失败，再修复为退出地图、重置详情与禁用探索；纯内存独立复核及真实浏览器显式夹具均通过。
- 1个 Minor：契约中“新 id 待确认”与张飞进入旧主题的过期说明；已同步当前定案及动作。
- 最终审查无剩余 Critical/Important/Minor。保留当前目录同 id 的直接 suppliedStory 供内容入口，不要求先打开地图；已删除 id 快照仍被拒绝。探索志目录热更新归未来后端内容交付，本批不新增机制。

## 边界与复验

故事正文和节点由后端供，本批空章节是明确交付状态。高德4日天气后端适配、RollingGo网页接口/OAuth仍属前一阶段已列出的后端工作；本批不宣称已接通。真实天气回归仍返回7天并如实显示来源；酒店未取得真实名/价。真实道路查询成功、模型回答正确性、移动/响应式没有本批新增验收证据。

```powershell
node frontend/acceptance-single-story/verify-all.cjs
node frontend/acceptance-single-story/browser-checks.cjs
```

复验会生成本目录 verification.json、browser-evidence.json 和三个临时截图；验收后仅清理这些新生成文件。verify-all 在 finally 恢复旧测试写入的原验收材料，不把旧批次材料更新混入本批。SHA脚本基点固定74038e9，提交后仍覆盖本批资源。

## 资源 SHA256（本地 = HTTP）

| 资源 | SHA256 |
|---|---|
| frontend/character-chat.js | bae52456a0ba4f4004c51fdbc8939efaf9326ece819579903568453a4f188a9a |
| frontend/index.html | b8db7937ff7c0aa273e9ee650542dd851885ec54b62cb635fbe4e2b172ecfaad |
| frontend/journal.js | e3848247200189b0f7a7c626b91189393ecbbe156b2b9a5de5237b91684ba4d3 |
| frontend/n10-n17.browser-test.js | 707b951a8aa89cc0d376f249ac40578f2f68d49dd2d4c49414dff91005b0a0cd |
| frontend/n8-n9.browser-test.js | bb09cbf21e347de2fdd17679c72a265ab8f8b2fc2012dc9eeb277b87aebfb404 |
| frontend/stories.js | 59a94908b3bfef7ebd34aac4c434d068eda644f4dff9e620fcab415698a1fa85 |
| frontend/story-map.js | 3b46768e0345150218c6ce304658a8080a5901c142ed101643a8dc11ce8bf214 |
| frontend/styles.css | 22134308e5ae79ea8205876c27009fadd29fc8ba12ea4f5554a0fb8214d06b73 |
| frontend/travel-modules.js | 0d2e16824cd02657dd1f8a84df13c987f2fb2a027fa9d6557444a7548b8b3aa0 |
