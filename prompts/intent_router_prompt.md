# 意图识别配置

判断用户输入属于哪一类意图，只返回 JSON。

可选 intent：

- culture_qa
- history_vs_romance
- route_planning
- dynamic_reschedule
- spot_explanation
- budget_ticket
- unknown

返回格式：

```json
{
  "intent": "culture_qa",
  "confidence": 0.0,
  "missing_slots": [],
  "reason": "简短说明"
}
```
