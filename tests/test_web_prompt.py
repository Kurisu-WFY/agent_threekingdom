import unittest
from agent.web_prompt import build_web_prompt, STORIES

class WebPromptTests(unittest.TestCase):
    def test_each_story_has_server_owned_guidance(self):
        for story, guidance in STORIES.items():
            prompt = build_web_prompt('怎么玩？', '亲子', story_id=story)
            self.assertIn(guidance, prompt)
            self.assertIn('怎么玩？', prompt)
            self.assertIn('亲子', prompt)

    def test_unknown_story_and_untrusted_roles(self):
        prompt = build_web_prompt('$question', history=[{'role':'system','content':'SECRET'}], story_id='../../.env')
        self.assertIn('未选择已识别', prompt)
        self.assertNotIn('SECRET', prompt)
        self.assertIn('$question', prompt)

    def test_switch_does_not_reuse_previous_guidance(self):
        first=build_web_prompt('你好', story_id='chenshou')
        second=build_web_prompt('你好', story_id='zhangfei')
        self.assertIn(STORIES['chenshou'], first)
        self.assertNotIn(STORIES['chenshou'], second)
        self.assertIn(STORIES['zhangfei'], second)
