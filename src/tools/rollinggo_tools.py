"""通过官方技能代理查询住宿，仅开放搜索和房型，不执行交易。"""
from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import date, datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from san_guo_core.settings import get_settings


class HotelSearch(BaseModel):
    place: str = Field(min_length=1, max_length=120, description='含城市的地点名，例如南充万卷楼')
    place_type: Literal['城市', '机场', '景点', '火车站', '地铁站', '酒店', '区/县', '详细地址'] = '城市'
    check_in: date
    stay_nights: int = Field(default=1, ge=1, le=30)
    adults: int = Field(default=2, ge=1, le=6)
    size: int = Field(default=3, ge=1, le=5)
    max_price_per_night: float | None = Field(default=None, gt=0, le=100000)

    @field_validator('place')
    @classmethod
    def safe_place(cls, value):
        value = value.strip()
        # 官方Windows代理使用命令解释器，拒绝解释器特殊字符。
        if re.search(r'[\x00-\x1f&|<>^%!"`()\\]', value) or value.startswith('-'):
            raise ValueError('地点包含不支持的字符')
        if not value:
            raise ValueError('地点不能为空')
        return value


class HotelDetail(BaseModel):
    hotel_id: int = Field(gt=0, description='必须使用酒店搜索真实返回的ID')
    check_in: date
    check_out: date
    adults: int = Field(default=2, ge=1, le=6)
    rooms: int = Field(default=1, ge=1, le=5)

    @model_validator(mode='after')
    def valid_dates(self):
        if not 1 <= (self.check_out - self.check_in).days <= 30:
            raise ValueError('入住与离店时间需要间隔1至30天')
        return self


def invoke(command, args=()):
    """固定命令集合，先读取实时帮助，再执行；绝不回显原始错误和凭据。"""
    settings = get_settings()
    prefix = [settings.rollinggo_node_path, str(settings.rollinggo_skill_dir / 'scripts/rgh.js')]
    env = dict(os.environ, NODE_NO_WARNINGS='1', DOTENV_CONFIG_QUIET='true')
    if command not in ('status', 'search-hotels', 'hotel-detail'):
        raise ValueError('不支持的酒店操作')
    for extra in ('--help', None):
        result = subprocess.run(prefix + [command] + (['--help'] if extra else list(args)),
                                capture_output=True, text=True, encoding='utf-8', errors='replace',
                                timeout=45, env=env, cwd=str(settings.rollinggo_skill_dir),
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        output = result.stdout + result.stderr
        if '有新版本可用' in output or '运行以下命令更新' in output:
            raise RuntimeError('酒店程序需要升级，请联系项目管理员后重试。')
        if result.returncode:
            raise RuntimeError('酒店查询未完成，请检查授权状态或稍后重试。')
    return result.stdout


def hotel_status():
    try:
        output = invoke('status')
        logged_in = '已登录' in output and '未登录' not in output
        return {'status': 'ok' if logged_in else 'authorization_required',
                'message': '住宿查询已授权。' if logged_in else '请先在本机完成RollingGo登录授权，再查询酒店。'}
    except Exception:
        return {'status': 'unavailable', 'message': '酒店程序不可用，请联系项目管理员。'}


def parse_output(output):
    decoder = json.JSONDecoder()
    for match in re.finditer(r'(?m)^\s*\{', output):
        try:
            data, _ = decoder.raw_decode(output[match.start():].lstrip())
            if isinstance(data, dict):
                return data
        except ValueError:
            continue
    raise RuntimeError('酒店服务返回格式异常，请稍后重试。')


def query(command, args):
    status = hotel_status()
    if status['status'] != 'ok':
        return status
    try:
        data = parse_output(invoke(command, args))
        if data.get('success') is False or data.get('isError') is True:
            raise RuntimeError('酒店服务未完成查询，请调整条件后重试。')
        return {'status': 'ok', 'source': 'RollingGo / 道旅',
                'queried_at': datetime.now(timezone.utc).isoformat(),
                'message': '展示价为参考价，最终金额以供应商确认时为准。', 'data': data}
    except (OSError, subprocess.SubprocessError):
        return {'status': 'unavailable', 'message': '酒店服务超时或程序未启动，请稍后重试。'}
    except RuntimeError as exc:
        return {'status': 'unavailable', 'message': str(exc)}


def search_hotels(request: HotelSearch):
    args = ['--origin-query', request.place + '酒店查询', '--place', request.place, '--place-type', request.place_type,
            '--check-in-date', request.check_in.isoformat(), '--stay-nights', str(request.stay_nights),
            '--adult-count', str(request.adults), '--size', str(request.size)]
    if request.max_price_per_night is not None:
        args += ['--max-price-per-night', str(request.max_price_per_night)]
    return query('search-hotels', args)


def hotel_detail(request: HotelDetail):
    return query('hotel-detail', ['--hotel-id', str(request.hotel_id), '--check-in-date', request.check_in.isoformat(),
                 '--check-out-date', request.check_out.isoformat(), '--adult-count', str(request.adults), '--room-count', str(request.rooms)])
