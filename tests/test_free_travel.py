import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from tools import free_travel_tools as t


class FreeTravelTests(unittest.TestCase):
    def fixture(self, url, params, ttl, group):
        payload = {
            'geo': {'results': [{'name': params.get('name'), 'country_code': 'CN', 'admin1_id': 1794299, 'latitude': 30.8, 'longitude': 106.08}]},
            'weather': {'daily': {'time': ['2026-09-26'], 'temperature_2m_max': [29], 'temperature_2m_min': [21], 'precipitation_probability_max': [45], 'uv_index_max': [7]}},
            'air': {'current': {'time': '2026-09-26T12:00', 'pm2_5': 22, 'pm10': 28}, 'current_units': {'pm2_5': 'μg/m³', 'pm10': 'μg/m³'}},
            'osrm': {'code': 'Ok', 'routes': [{'distance': 1000, 'duration': 900}], 'waypoints': []}
        }[group]
        return {'payload': payload, 'fetched_at': '2026-09-26T04:00:00+00:00'}

    def test_forecast_and_air_have_different_labels(self):
        with patch.object(t, 'fetch', side_effect=self.fixture):
            result = t.get_travel_weather('南充', '2026-09-26')
        self.assertEqual(result['status'], 'ok')
        self.assertEqual([r['data_status'] for r in result['data']['items']], ['forecast', 'model'])
        self.assertIn('建议带伞', result['data']['items'][0]['summary'])
        self.assertEqual(result['data']['forecast'][0]['temperature_max_c'], 29)

    def test_out_of_range_not_replaced_with_today(self):
        with patch.object(t, 'fetch', side_effect=self.fixture):
            result = t.get_travel_weather('阆中', '2099-01-01')
        self.assertEqual(result['data']['forecast'], [])
        self.assertTrue(result['data']['warnings'])
        self.assertIn('不是出行日期', result['data']['items'][0]['summary'])

    def test_invalid_date_and_city_do_not_request(self):
        with patch.object(t, 'fetch') as fetch:
            self.assertEqual(t.get_travel_weather('南充', 'bad')['status'], 'unavailable')
            self.assertEqual(t.get_travel_weather('未知城市')['status'], 'unavailable')
            fetch.assert_not_called()

    def test_partial_failure_keeps_weather(self):
        def fetch(url, params, ttl, group):
            if group == 'air':
                raise t.httpx.ConnectError('offline')
            return self.fixture(url, params, ttl, group)
        with patch.object(t, 'fetch', side_effect=fetch):
            result = t.get_travel_weather('南充')
        self.assertEqual(result['status'], 'ok')
        self.assertIsNone(result['data']['air_quality'])
        self.assertTrue(result['data']['warnings'])

    def test_geo_failure_and_ambiguity(self):
        with patch.object(t, 'fetch', side_effect=t.httpx.ConnectError('offline')):
            self.assertEqual(t.lookup_travel_city('南充')['status'], 'unavailable')
        with patch.object(t, 'fetch', return_value={'payload': {'results': []}}):
            self.assertEqual(t.lookup_travel_city('南充')['status'], 'unavailable')

    def test_road_requires_coordinate_system(self):
        args = dict(origin_longitude=106, origin_latitude=30, destination_longitude=106.1, destination_latitude=30.1)
        self.assertEqual(t.get_road_route(**args)['status'], 'unavailable')
        self.assertEqual(t.get_road_route(**args, coordinate_system='GCJ02')['status'], 'unavailable')
        with patch.object(t, 'fetch', side_effect=self.fixture):
            result = t.get_road_route(**args, coordinate_system='WGS84')
        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['data']['distance_m'], 1000)
        self.assertIn('无实时路况', result['message'])

    def test_cache_avoids_duplicate_network_requests(self):
        import httpx
        with tempfile.TemporaryDirectory() as folder, patch.object(t, 'CACHE', Path(folder)/'cache.db'):
            with patch('httpx.Client.get', return_value=httpx.Response(200, json={'ok': True}, request=httpx.Request('GET', 'https://example.org'))) as get:
                first = t.fetch('https://example.org', {}, 60, 'test')
                second = t.fetch('https://example.org', {}, 60, 'test')
                self.assertEqual(first, second)
                self.assertEqual(get.call_count, 1)

    def test_http_adapter_and_mcp_registration(self):
        import asyncio
        from fastapi.testclient import TestClient
        from api import app
        from mcp_server import list_tools, call_tool
        with patch.object(t, 'fetch', side_effect=self.fixture), TestClient(app) as client:
            response = client.post('/api/travel/travel-info', json={'city': '南充', 'date': '2026-09-26'})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['status'], 'ok')
            content = asyncio.run(call_tool('get_travel_weather', {'city': '南充'}))
            self.assertEqual(json.loads(content[0].text)['status'], 'ok')
            self.assertEqual(client.post('/api/travel/road-route', json={}).status_code, 422)
        tools = asyncio.run(list_tools())
        self.assertEqual(len(tools), 11)
        self.assertTrue({'get_travel_weather', 'lookup_travel_city', 'get_road_route'} <= {r.name for r in tools})


if __name__ == '__main__':
    unittest.main()
