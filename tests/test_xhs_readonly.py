"""小红书只读入口的协议边界与失败处理测试，不使用真实账号。"""
import asyncio
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import AsyncMock, patch

spec = importlib.util.spec_from_file_location("xhs_readonly", Path(__file__).resolve().parents[1] / "src/xhs_readonly_mcp.py")
xhs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(xhs)
URL = "https://www.xiaohongshu.com/explore/0123456789abcdef01234567?xsec_token=test"


class ReadonlyTests(unittest.IsolatedAsyncioTestCase):
    def test_url(self):
        self.assertEqual(xhs.note_params(URL)[1], "test")
        for bad in ["https://example.com/a?xsec_token=x", "http://www.xiaohongshu.com/explore/a", URL.split("?")[0]]:
            with self.assertRaises(ValueError):
                xhs.note_params(bad)

    async def test_missing_login(self):
        with patch.dict(xhs.os.environ, {"XHS_COOKIE": ""}), patch.object(xhs, "dotenv_values", return_value={}):
            result = await xhs.search_travel_notes("南充 美食")
        self.assertEqual(result["status"], "login_required")

    async def test_readonly_tools(self):
        tools = await xhs.mcp.list_tools()
        self.assertEqual({t.name for t in tools}, {"check_xhs_connection", "search_travel_notes", "read_travel_note", "read_travel_comments"})

    async def test_content_metadata(self):
        data = {"status": "ok", "data": {"items": [{"note_card": {"title": "攻略", "desc": "两人晚餐120元", "user": {"nickname": "游客"}, "time": 1700000000000}}]}}
        with patch.object(xhs, "query", new=AsyncMock(return_value=data)):
            result = await xhs.read_travel_note(URL)
        self.assertEqual(result["source_level"], "C")
        self.assertEqual(result["text"], "两人晚餐120元")
        self.assertIn("预计费用", result["notice"])
        self.assertNotIn("price", result)

    async def test_empty_not_successful_quote(self):
        with patch.object(xhs, "query", new=AsyncMock(return_value={"status": "ok", "data": {}})):
            result = await xhs.read_travel_note(URL)
        self.assertEqual(result["status"], "empty")

    async def test_search_limit(self):
        mock = AsyncMock(return_value={"status": "ok", "data": {"items": []}})
        with patch.object(xhs, "query", new=mock):
            await xhs.search_travel_notes("攻略", 100)
        self.assertEqual(mock.call_args.kwargs["limit"], 10)


if __name__ == "__main__":
    unittest.main()
