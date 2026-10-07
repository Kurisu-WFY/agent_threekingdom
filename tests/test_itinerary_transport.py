"""交通回填、缺口与时间预算的离线回归测试。"""
import unittest
from unittest.mock import patch
from planning.nanchong_itinerary import plan_nanchong_itinerary
from san_guo_core.models import NanchongPlanRequest


def route(seconds=601):
    return {'status': 'ok', 'data': {'alternatives': [{'duration_seconds': seconds, 'distance_m': 2000}], 'queried_at': '测试时间'}}


class TransportTests(unittest.TestCase):
    def plan(self, response, **values):
        with patch('planning.itinerary_transport.get_amap_route', return_value=response) as called:
            p = plan_nanchong_itinerary(NanchongPlanRequest(origin='已确认起点', origin_poi_id='ORIGIN123', **values))
        return p, called

    def test_rounding_and_time_budget(self):
        p, called = self.plan(route())
        day = p['days'][0]
        self.assertEqual(called.call_count, 3)
        self.assertEqual(day['transport_minutes'], 33)
        self.assertEqual(day['total_minutes'], 243)
        self.assertTrue(day['time_feasible'])
        self.assertEqual(day['opening_status'], 'not_checked')
        self.assertTrue(all('amap_origin=' in leg['url'] for leg in day['legs']))

    def test_over_budget(self):
        p, _ = self.plan(route(4000), days=.5)
        self.assertEqual(p['days'][0]['feasibility'], 'exceeds_time_budget')
        self.assertFalse(p['days'][0]['time_feasible'])

    def test_missing_duration_is_not_zero(self):
        for value in (None, 0, -1, float('nan'), float('inf'), True, '600'):
            p, _ = self.plan(route(value))
            day = p['days'][0]
            self.assertIsNone(day['transport_minutes'])
            self.assertIsNone(day['total_minutes'])
            self.assertIsNone(day['time_feasible'])
            self.assertEqual(day['unknown_leg_count'], 3)

    def test_partial_failure(self):
        with patch('planning.itinerary_transport.get_amap_route', side_effect=lambda a, b, mode: route(600) if a == 'B0331005E8' else {'status': 'empty', 'message': '无公交方案'}):
            p = plan_nanchong_itinerary(NanchongPlanRequest(origin='起点', origin_poi_id='ORIGIN123'))
        day = p['days'][0]
        self.assertEqual(day['known_transport_minutes'], 10)
        self.assertEqual(day['unknown_leg_count'], 2)
        self.assertIsNone(day['remaining_minutes'])

    def test_ambiguous_origin(self):
        items = [{'id': 'CAMPUS1', 'name': '大学（新区）'}, {'id': 'CAMPUS2', 'name': '大学（老区）'}]
        with patch('planning.itinerary_transport.search_amap_places', return_value={'status': 'ok', 'data': {'items': items}}), patch('planning.itinerary_transport.get_amap_route', return_value=route()) as called:
            p = plan_nanchong_itinerary(NanchongPlanRequest(origin='大学'))
        self.assertEqual(called.call_count, 1)
        self.assertEqual(p['point_resolution']['大学']['status'], 'needs_confirmation')
        self.assertEqual(p['days'][0]['unknown_leg_count'], 2)

    def test_exact_origin_and_two_days(self):
        def search(name, city):
            return {'status': 'ok', 'data': {'items': [{'id': 'HOTEL123' if '宾馆' in name else 'ORIGIN123', 'name': name}]}}
        with patch('planning.itinerary_transport.search_amap_places', side_effect=search), patch('planning.itinerary_transport.get_amap_route', return_value=route(600)):
            p = plan_nanchong_itinerary(NanchongPlanRequest(origin='南充站', days=2))
        self.assertEqual(len(p['days']), 2)
        self.assertTrue(all(day['transport_minutes'] == 20 for day in p['days']))

    def test_same_place_is_explicit(self):
        with patch('planning.itinerary_transport.get_amap_route') as called:
            p = plan_nanchong_itinerary(NanchongPlanRequest(origin='南充市北湖公园', places=['beihu']))
        called.assert_not_called()
        self.assertEqual(p['days'][0]['transport_minutes'], 0)
        self.assertTrue(all(leg['data_status'] == 'same_place' for leg in p['days'][0]['legs']))
