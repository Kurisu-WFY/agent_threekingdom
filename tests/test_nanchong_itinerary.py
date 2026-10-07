import json
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
from pydantic import ValidationError
from san_guo_core.models import NanchongPlanRequest
from planning.nanchong_itinerary import plan_nanchong_itinerary, direction_url


class ItineraryTests(unittest.TestCase):
    def setUp(self):
        for target in ('search_amap_places', 'get_amap_route'):
            mock = patch('planning.itinerary_transport.' + target, return_value={'status': 'unavailable', 'message': '测试中的服务缺口'})
            mock.start()
            self.addCleanup(mock.stop)

    def test_no_fake_metrics(self):
        p = plan_nanchong_itinerary(NanchongPlanRequest(origin="南充站"))
        self.assertIsNone(p['budget']['total'])
        self.assertEqual(p['budget']['items']['门票'], 60)
        self.assertEqual(p['budget']['item_status']['门票'], 'demo_estimate')
        self.assertEqual(p['budget']['estimated_total'], 150)
        self.assertEqual(len(p['days'][0]['legs']), 3)
        self.assertTrue(all(x['minutes'] is None for x in p['days'][0]['legs']))

    def test_two_days_budget(self):
        p = plan_nanchong_itinerary(NanchongPlanRequest(origin="南充站", days=2, rooms=2, people=3, hotel_per_room=200, meals_per_person_day=50, transport_total=100, budget_limit=500))
        self.assertEqual(p['budget']['subtotal'], 980)
        self.assertTrue(p['budget']['over_limit'])
        self.assertEqual(p['days'][1]['legs'][0]['origin'], '南充北湖宾馆')

    def test_half_day_selection(self):
        p = plan_nanchong_itinerary(NanchongPlanRequest(origin="南充站", days=.5, places=['wanjuanlou']))
        self.assertEqual(len(p['days'][0]['stops']), 1)
        self.assertEqual(p['lodging']['nights'], 0)
        self.assertEqual(p['days'][0]['remaining_before_transport'], 120)

    def test_bad_inputs(self):
        for values in [{'origin':' '}, {'origin':'车站','days':3}, {'origin':'车站','places':[]}, {'origin':'车站','transport_total':float('nan')}]:
            with self.assertRaises(ValidationError): NanchongPlanRequest(**values)

    def test_demo_defaults_and_zero_override(self):
        p = plan_nanchong_itinerary(NanchongPlanRequest(origin='南充站', days=2, people=2, rooms=2))
        self.assertEqual(p['budget']['estimated_total'], 880)
        p = plan_nanchong_itinerary(NanchongPlanRequest(origin='南充站', days=.5, places=['wanjuanlou'], hotel_per_room=0, meals_per_person_day=0, transport_total=0))
        self.assertEqual(p['budget']['estimated_total'], 30)
        self.assertEqual(p['budget']['item_status']['交通'], 'user_allowance')
        self.assertEqual(p['budget']['items']['住宿'], 0)

    def test_url_encoded(self):
        qs=parse_qs(urlparse(direction_url('车站&mode=evil','万卷楼','walking')).query)
        self.assertEqual(qs['origin'], ['车站&mode=evil'])
        self.assertEqual(qs['mode'], ['walking'])

    def test_http(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from travel_api import router
        app=FastAPI();app.include_router(router)
        with TestClient(app) as client:
            self.assertEqual(client.get('/api/travel/nanchong/catalog').status_code, 200)
            self.assertEqual(client.post('/api/travel/nanchong/plan', json={'origin':'南充站'}).json()['status'],'ok')
            self.assertEqual(client.post('/api/travel/nanchong/plan', json={'origin':''}).status_code,422)

    def test_mcp(self):
        import asyncio
        from mcp_server import list_tools, call_tool
        self.assertIn('plan_nanchong_itinerary', [t.name for t in asyncio.run(list_tools())])
        response=asyncio.run(call_tool('plan_nanchong_itinerary', {'origin':'南充站'}))
        self.assertEqual(json.loads(response[0].text)['city'], '南充')
