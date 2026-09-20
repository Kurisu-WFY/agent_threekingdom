"""Local contract regression; temporary database, no external model calls."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from fastapi.testclient import TestClient
from api import app
from san_guo_core.settings import get_settings
from tools.travel_business_tools import get_spot_ticket


class TravelApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.settings = get_settings().model_copy(update={"business_db_path": Path(self.temp.name) / "business.db"})
        self.patcher = patch("db.get_settings", return_value=self.settings)
        self.patcher.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.patcher.stop()
        self.temp.cleanup()

    def test_spots_and_empty_city(self):
        data = self.client.get('/api/travel/spots', params={'city': '南充'}).json()
        self.assertEqual(data['status'], 'ok')
        self.assertTrue(data['data']['spots'])
        self.assertEqual(data['data']['spots'][0]['data_status'], 'sample')
        self.assertEqual(self.client.get('/api/travel/spots?city=不存在').json()['status'], 'empty')

    def test_structured_destination_overrides_departure(self):
        data = self.client.post('/chat', json={'message':'从南充出发到广元', 'route_preferences':{'city':'广元','days':2}}).json()
        self.assertEqual(data['intent']['intent'], 'route_planning')
        self.assertEqual(data['route']['route']['city'], '广元')
        self.assertLessEqual(data['route']['route']['duration_hours'], 16)

    def test_halfday_does_not_return_full_day(self):
        data = self.client.post('/api/travel/plans/preview', json={'city':'广元','days':.5}).json()
        self.assertEqual(data['status'], 'empty')

    def test_excluded_nodes_are_not_reintroduced(self):
        data = self.client.post('/chat', json={'message':'规划南充', 'route_preferences':{'city':'南充','days':1,'excluded_place_ids':['wanjuanlou']}}).json()
        self.assertNotIn('nanchong_xishan_wanjuanlou', [s['spot_id'] for s in data['route']['stops']])

    def test_preview_budget_and_unavailable(self):
        p = {'city':'南充','days':2,'date':'','hotel_tier':'高档型'}
        self.assertEqual(self.client.post('/api/travel/plans/preview', json=p).json()['status'], 'ok')
        data = self.client.post('/api/travel/budget/estimate', json=p).json()
        self.assertEqual(data['status'], 'ok')
        self.assertTrue(all(i['amount'] is None for i in data['data']['items']))
        self.assertNotIn('total', data['data'])
        self.assertEqual(self.client.post('/api/travel/travel-info', json=p).json()['status'], 'unavailable')

    def test_invalid_preferences(self):
        for field, value in [('days',0),('rooms',0),('people',51),('date','bad')]:
            self.assertEqual(self.client.post('/api/travel/budget/estimate',json={'city':'南充',field:value}).status_code,422)
        self.assertEqual(self.client.post('/chat',json={'message':'  '}).status_code,422)

    def test_unknown_ticket_not_free(self):
        ticket = get_spot_ticket('万卷楼')
        self.assertTrue(ticket['found'])
        self.assertNotEqual(ticket['price_min'], 0)


if __name__ == '__main__':
    unittest.main()
