"""高德地点与路线工具，前端和 MCP 共用，密钥不进入返回结果。"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
import re

import httpx
from pydantic import BaseModel, Field
from san_guo_core.settings import get_settings


class AmapSearch(BaseModel):
    keywords: str = Field(min_length=1, max_length=100)
    city: str = Field(default='南充', min_length=1, max_length=60)


class AmapRoute(BaseModel):
    origin_id: str = Field(pattern=r'^[A-Za-z0-9]{5,40}$')
    destination_id: str = Field(pattern=r'^[A-Za-z0-9]{5,40}$')
    mode: Literal['walking', 'driving', 'transit'] = 'transit'


class AmapError(Exception):
    pass


def request(client, path, params):
    key = get_settings().amap_web_service_key
    if not key:
        raise AmapError('请先配置高德 Web 服务密钥。')
    try:
        response = client.get('https://restapi.amap.com' + path, params={**params, 'key': key})
        response.raise_for_status()
        data = response.json()
    except Exception:
        raise AmapError('高德连接失败，请稍后重试。') from None
    if data.get('status') != '1':
        code = str(data.get('infocode', ''))
        code = code if re.fullmatch(r'\d{5}', code) else '未知'
        raise AmapError(f'高德请求未通过（错误码 {code}），请检查服务权限、配额或参数。')
    return data


def poi(item):
    location = str(item.get('location', ''))
    try:
        lon, lat = map(float, location.split(','))
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValueError()
    except ValueError:
        raise AmapError('地点没有有效坐标，请换一个地点。') from None
    return {'id': item['id'], 'name': item['name'], 'address': item.get('address') or '',
            'city': item.get('cityname') or '', 'citycode': item.get('citycode') or '',
            'location': location, 'coordinate_system': 'GCJ02'}


def envelope(status, message, data=None):
    return {'status': status, 'message': message, 'data': data}


def search_amap_places(keywords: str, city: str = '南充'):
    try:
        p = AmapSearch(keywords=keywords.strip(), city=city.strip())
        with httpx.Client(timeout=12, follow_redirects=False) as client:
            data = request(client, '/v3/place/text', {'keywords': p.keywords, 'city': p.city, 'citylimit': 'true', 'offset': 8})
        items = []
        for item in data.get('pois', []):
            try:
                items.append(poi(item))
            except AmapError:
                continue
        return envelope('ok' if items else 'empty', '请确认具体地点，景区中心不一定是入口。' if items else '没有匹配地点，请补充城市或更换关键词。', {'items': items})
    except (AmapError, ValueError) as exc:
        return envelope('unavailable', str(exc) if isinstance(exc, AmapError) else '地点查询参数不正确。')


def number(value):
    try:
        result = float(value)
        return result if 0 <= result < 1e10 else None
    except (ValueError, TypeError):
        return None


def get_amap_route(origin_id: str, destination_id: str, mode: str = 'transit'):
    try:
        p = AmapRoute(origin_id=origin_id, destination_id=destination_id, mode=mode)
        if p.origin_id == p.destination_id:
            raise AmapError('起点与终点相同，请重新选择。')
        with httpx.Client(timeout=12, follow_redirects=False) as client:
            points = []
            for identifier in [p.origin_id, p.destination_id]:
                found = request(client, '/v3/place/detail', {'id': identifier}).get('pois') or []
                if not found:
                    raise AmapError('地点已失效，请重新搜索并确认。')
                points.append(poi(found[0]))
            origin, destination = points
            params = {'origin': origin['location'], 'destination': destination['location']}
            if p.mode == 'transit':
                if not origin['citycode'] or not destination['citycode']:
                    raise AmapError('地点缺少城市信息，无法查询公交。')
                params.update(city=origin['citycode'], cityd=destination['citycode'])
                path = '/v3/direction/transit/integrated'
            else:
                params['show_fields'] = 'cost'
                path = '/v5/direction/' + p.mode
            route = request(client, path, params).get('route') or {}
        alternatives = []
        for raw in (route.get('transits') if p.mode == 'transit' else route.get('paths')) or []:
            steps = []
            if p.mode == 'transit':
                for segment in raw.get('segments', []):
                    walk = segment.get('walking') or {}
                    steps.extend(x.get('instruction', '') for x in walk.get('steps', []))
                    for bus in (segment.get('bus') or {}).get('buslines', [])[:1]:
                        steps.append(f"乘坐{bus.get('name', '')}：{(bus.get('departure_stop') or {}).get('name', '')} → {(bus.get('arrival_stop') or {}).get('name', '')}")
                    railway = segment.get('railway') or {}
                    if railway.get('name'):
                        steps.append('铁路：' + railway['name'] + '，请另行核验班次与余票。')
            else:
                steps = [x.get('instruction', '') for x in raw.get('steps', [])]
            cost = raw.get('cost')
            alternatives.append({'distance_m': number(raw.get('distance')),
                'duration_seconds': number(raw.get('duration') or (cost.get('duration') if isinstance(cost, dict) else None)),
                'fare_yuan': number(cost) if p.mode == 'transit' else None,
                'walking_distance_m': number(raw.get('walking_distance')),
                'steps': [s for s in steps if s][:100]})
        return envelope('ok' if alternatives else 'empty', '高德查询结果，时间及费用为估计；出发前请复核，不代表实时到站或已购票。' if alternatives else '当前条件没有可用路线，请换交通方式或具体入口。',
                        {'origin': origin, 'destination': destination, 'mode': p.mode, 'alternatives': alternatives[:3],
                         'source': '高德地图', 'coordinate_system': 'GCJ02', 'queried_at': datetime.now(timezone.utc).isoformat()})
    except (AmapError, ValueError) as exc:
        return envelope('unavailable', str(exc) if isinstance(exc, AmapError) else '路线参数不正确，请重新选择地点。')
