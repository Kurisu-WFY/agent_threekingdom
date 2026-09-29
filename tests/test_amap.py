"""高德接口回归测试，不发送外部请求。"""
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import httpx
from fastapi.testclient import TestClient
from fastapi import FastAPI
from tools import amap_tools as a
from travel_api import router


class AmapTests(unittest.TestCase):
    def test_geometry_preserves_segments(self):
        raw={'steps':[{'polyline':'106,30;106.1,30.1'}, {'polyline':'bad'}, {'polyline':'107,31;107.1,31.1'}]}
        self.assertEqual(len(a.route_lines(raw,'walking')),2)
        self.assertEqual(a.route_lines({'steps':[{'polyline':'nan,30;106,30'}]},'walking'),[])

    def test_map_proxy_boundary_and_secrets(self):
        import amap_map_api as maps
        app=FastAPI();app.include_router(maps.router)
        settings=SimpleNamespace(amap_js_api_key='public-key',amap_js_security_code='private-code')
        with patch.object(maps,'get_settings',return_value=settings), TestClient(app) as client:
            config=client.get('/api/travel/amap/map-config')
            self.assertTrue(config.json()['enabled'])
            self.assertNotIn('private-code',config.text)
            self.assertEqual(client.get('/_AMapService/https://example.com').status_code,404)
            self.assertEqual(client.get('/_AMapService/v3/place/text',headers={'Sec-Fetch-Site':'cross-site'}).status_code,403)
            with patch.object(httpx.AsyncClient,'get',side_effect=RuntimeError('private-code')):
                failure=client.get('/_AMapService/v3/place/text')
                self.assertEqual(failure.status_code,502)
                self.assertNotIn('private-code',failure.text)

    def test_missing_key(self):
        with patch.object(a, 'get_settings', return_value=SimpleNamespace(amap_web_service_key=None)):
            self.assertEqual(a.search_amap_places('万卷楼')['status'], 'unavailable')

    def test_error_does_not_expose_key(self):
        with patch.object(a, 'get_settings', return_value=SimpleNamespace(amap_web_service_key='secret-test-key')):
            with patch.object(httpx.Client, 'get', side_effect=RuntimeError('secret-test-key')):
                self.assertNotIn('secret-test-key', str(a.search_amap_places('万卷楼')))

    def test_no_results(self):
        with patch.object(a, 'request', return_value={'pois': []}):
            self.assertEqual(a.search_amap_places('不存在')['status'], 'empty')

    def test_invalid_route(self):
        self.assertEqual(a.get_amap_route('bad', 'bad')['status'], 'unavailable')
        self.assertEqual(a.get_amap_route('B033101UDZ', 'B033101UDZ')['status'], 'unavailable')

    def test_invalid_coordinate(self):
        for coord in ['nan,20', '200,20', '', '106,inf']:
            with self.assertRaises(a.AmapError):
                a.poi({'location':coord})

    def test_route_uses_official_poi_and_transit_steps(self):
        points=[{'pois':[{'id':'B033101UDZ','name':'起点','location':'106,30','citycode':'0817'}]},
                {'pois':[{'id':'B0331005E8','name':'终点','location':'106.1,30.1','citycode':'0817'}]},
                {'route':{'transits':[{'distance':'1000','duration':'600','cost':'2','segments':[{'bus':{'buslines':[{'name':'1路','departure_stop':{'name':'甲站'},'arrival_stop':{'name':'乙站'}}]}}]}]}}]
        with patch.object(a,'request',side_effect=points) as call:
            r=a.get_amap_route('B033101UDZ','B0331005E8')
        self.assertEqual(r['status'],'ok')
        self.assertEqual(r['data']['coordinate_system'],'GCJ02')
        self.assertEqual(r['data']['alternatives'][0]['steps'],['乘坐1路：甲站 → 乙站'])
        self.assertEqual(call.call_args.args[2]['origin'],'106,30')

    def test_rest_validation(self):
        app=FastAPI(); app.include_router(router)
        with TestClient(app) as client:
            self.assertEqual(client.post('/api/travel/amap/route',json={'origin_id':'http://evil'}).status_code,422)
            with patch('travel_api.search_amap_places',return_value={'status':'ok','data':{'items':[]}}):
                self.assertEqual(client.post('/api/travel/amap/places',json={'keywords':'万卷楼','city':'南充'}).status_code,200)


if __name__=='__main__':
    unittest.main()
