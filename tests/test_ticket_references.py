"""参考票价、来源和接口传递检查，不联网、不重建现有数据库。"""
from __future__ import annotations

import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from tools.ticket_references import find_ticket_reference
from tools.travel_business_tools import get_spot_ticket


class TicketReferenceTests(unittest.TestCase):
    def test_prices_and_sources(self):
        for name, expected in [("万卷楼", (5, 5)), ("汉桓侯祠", (50, 50)),
                               ("剑门关", (100, 105)), ("昭化古城", (45, 52)),
                               ("成都武侯祠", (50, 50))]:
            with self.subTest(name=name):
                ticket = get_spot_ticket(name)
                self.assertEqual((ticket["price_min"], ticket["price_max"]), expected)
                self.assertEqual(ticket["data_status"], "reference")
                self.assertFalse(ticket["is_realtime"])
                self.assertTrue(ticket["sources"][0]["source_url"].startswith("https://"))
                self.assertTrue(ticket["scope"])

    def test_no_guess_for_unknown(self):
        self.assertIsNone(find_ticket_reference("王平墓"))
        self.assertIsNone(find_ticket_reference("武侯祠"))
        self.assertIsNone(find_ticket_reference("剑门"))

    def test_no_mutation_shared_data(self):
        reference = find_ticket_reference("万卷楼")
        reference["price_min"] = 900
        self.assertEqual(find_ticket_reference("万卷楼")["price_min"], 5)

    def test_scope(self):
        self.assertIn("索道", get_spot_ticket("剑门关")["price_note"])
        self.assertIn("110", get_spot_ticket("汉桓侯祠")["price_note"])
        self.assertIn("不代表", get_spot_ticket("昭化古城")["price_note"])

    def test_ticket_does_not_require_seeding(self):
        with patch("tools.travel_business_tools.ensure_demo_data", side_effect=AssertionError("不能重建业务库")):
            self.assertEqual(get_spot_ticket("万卷楼")["price_min"], 5)


if __name__ == "__main__":
    unittest.main()
