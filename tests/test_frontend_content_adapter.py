"""验证新版目录、资料链接与活动计划字段的适配。"""
from fastapi import FastAPI
from fastapi.testclient import TestClient
from travel_api import router, Preferences
from unittest.mock import patch
from tools.story_content import get_story_content


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


def test_nested_content_references():
    payload = get_story_content()['data']
    for chapter in payload['story']['chapters']:
        assert chapter['people'] and chapter['events']
        for record in [chapter['compilation'], chapter['relationships'], *chapter.get('disputes', [])]:
            assert record['narrative_type'] == 'research'
            assert record['data_status'] == 'maintained'
            assert record['sources']
            assert 'references' not in record
            assert all(s['pdf_page'] > 0 and '/pdf#page=' in s['source_url'] for s in record['sources'])
        assert 'history' not in chapter and 'romance' not in chapter
    assert len(payload['story']['chapters'][2]['disputes']) == 2
    assert all(place['coordinates'] is None for place in payload['places'])
    assert all(s['source_level'] == 'C' for place in payload['places'] if place['id'] != 'micangdao' for s in place['overview']['sources'])
    assert next(p for p in payload['places'] if p['id'] == 'micangdao')['overview']['sources'][0]['pdf_page'] == 16


def test_missing_index_does_not_promote_nested_content():
    with patch('tools.story_content.document_catalog', return_value={}):
        payload = get_story_content()['data']
    for chapter in payload['story']['chapters']:
        assert chapter['data_status'] == 'pending'
        for record in [chapter['compilation'], chapter['relationships'], *chapter.get('disputes', [])]:
            assert record['data_status'] == 'pending' and record['sources'] == []


def test_place_primary_sources():
    payload = get_story_content()['data']
    expected = {'hanhuanhouci': {714, 715}, 'jianmenguan': {794}, 'zhaohua': {753}}
    for place in payload['places']:
        if place['id'] not in expected:
            continue
        record = place['history']
        assert record['data_status'] == 'maintained'
        assert {s['pdf_page'] for s in record['sources']} == expected[place['id']]
        assert all(s['source_level'] == 'A' for s in record['sources'])
        assert 'source_file' not in str(record) and 'references' not in record
    with patch('tools.story_content.document_catalog', return_value={}):
        places = get_story_content()['data']['places']
    assert all(p['history']['data_status'] == 'pending' and not p['history']['sources'] for p in places if 'history' in p)


def test_place_ticket_references():
    places = get_story_content()['data']['places']
    expected = {'wanjuanlou': (5,5), 'hanhuanhouci': (50,50), 'jianmenguan': (100,105), 'zhaohua': (45,52)}
    for place in places:
        if place['id'] in expected:
            ticket = place['travel']['ticket']
            assert (ticket['price_min'],ticket['price_max']) == expected[place['id']]
            assert ticket['data_status'] == 'reference' and ticket['is_realtime'] is False
            assert ticket['sources'] and ticket['scope']
        else:
            assert 'ticket' not in place.get('travel', {})
