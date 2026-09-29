"""网页地图配置与固定上游代理，不向浏览器发送安全密钥。"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
import httpx
import re
from san_guo_core.settings import get_settings

router = APIRouter()


@router.get('/api/travel/amap/map-config')
def map_config():
    settings = get_settings()
    return {'enabled': bool(settings.amap_js_api_key and settings.amap_js_security_code),
            'key': settings.amap_js_api_key or '', 'serviceHost': '/_AMapService'}


@router.get('/_AMapService/{path:path}')
async def map_proxy(path: str, request: Request):
    # 只允许本地页面调用固定高德服务，禁止任意URL、路径穿越和上游重定向。
    if request.headers.get('sec-fetch-site') == 'cross-site':
        raise HTTPException(403, '地图代理仅供本站使用')
    if not path.startswith(('v3/', 'v4/', 'v5/')) or '..' in path or '\\' in path or len(path) > 180:
        raise HTTPException(404, '不支持的地图路径')
    settings = get_settings()
    if not settings.amap_js_api_key or not settings.amap_js_security_code:
        raise HTTPException(503, '请配置网页地图密钥')
    params = dict(request.query_params)
    callback = params.get('callback')
    if callback and not re.fullmatch(r'[A-Za-z_$][\w$]{0,120}', callback):
        raise HTTPException(400, '无效的地图回调')
    params.update(key=settings.amap_js_api_key, jscode=settings.amap_js_security_code)
    upstream = 'https://webapi.amap.com/' if path == 'v4/map/styles' else 'https://restapi.amap.com/'
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.get(upstream + path, params=params)
            response.raise_for_status()
        body = response.content
        if settings.amap_js_security_code.encode() in body:
            raise ValueError('上游返回敏感内容')
        media_type = 'application/javascript' if callback else response.headers.get('content-type', 'application/json')
        return Response(body, media_type=media_type,
                        headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})
    except Exception:
        raise HTTPException(502, '地图服务暂时不可用，请重试') from None
