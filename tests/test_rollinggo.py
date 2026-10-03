"""验证酒店工具只查询、参数安全及登录失败时的行为。"""
import unittest
from unittest.mock import patch
from pydantic import ValidationError
from tools import rollinggo_tools as r


class HotelToolsTests(unittest.TestCase):
    def test_shell_characters_rejected(self):
        for place in ['x&whoami', '%TOKEN%', 'x\nwhoami', 'x"y', '-danger', '  -danger', '   ']:
            with self.assertRaises(ValidationError):
                r.HotelSearch(place=place, check_in='2026-10-04')

    def test_date_order(self):
        with self.assertRaises(ValidationError):
            r.HotelDetail(hotel_id=1, check_in='2026-10-04', check_out='2026-10-03')

    def test_authorization_required_does_not_search(self):
        with patch.object(r, 'hotel_status', return_value={'status':'authorization_required'}), patch.object(r, 'invoke') as invoke:
            self.assertEqual(r.search_hotels(r.HotelSearch(place='南充',check_in='2026-10-04'))['status'],'authorization_required')
            invoke.assert_not_called()

    def test_json_after_cli_logs(self):
        self.assertEqual(r.parse_output('程序启动\n{ "hotelInformationList": [] }\n')['hotelInformationList'],[])

    def test_query_keeps_parameters(self):
        with patch.object(r,'query',return_value={'status':'ok'}) as query:
            r.search_hotels(r.HotelSearch(place='南充万卷楼',place_type='景点',check_in='2026-10-04',max_price_per_night=300))
            args=query.call_args.args[1]
            self.assertEqual(args[args.index('--max-price-per-night')+1],'300.0')
            self.assertEqual(args[args.index('--place')+1],'南充万卷楼')


if __name__ == '__main__':
    unittest.main()
