"""验证新版目录、资料链接与活动计划字段的适配。"""
from fastapi import FastAPI
from fastapi.testclient import TestClient
from travel_api import router, Preferences


def test_new_frontend_preferences():
    for tier in ('', '经济型', '舒适型', '高档型', '豪华型'):
        assert Preferences(city='南充', hotel_tier=tier, adcode='511300').city == '南充'


def test_story_links_and_unknown_document():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    payload = client.get('/api/travel/stories/chenshou-book-history').json()['data']
    assert len(payload['story']['chapters']) == 3
    for chapter in payload['story']['chapters']:
        assert chapter['narrative_type'] == 'research'
        assert 'references' not in chapter
        assert 'source_file' not in str(chapter)
    assert client.get('/api/travel/sources/unknown/pdf').status_code == 404
