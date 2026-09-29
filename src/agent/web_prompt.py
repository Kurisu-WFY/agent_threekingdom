"""故事引导由服务端维护，客户端标识绝不直接用作路径或系统角色。"""
from pathlib import Path
from string import Template

STORIES = {
    'chenshou': '从南充少年到三国史家：围绕陈寿、《三国志》编纂与南充文化记忆。故里争议并列检索不同观点；后世万卷楼展陈不直接认定为晋代遗迹。',
    'zhangfei': '镇守阆中·寻迹张飞：围绕阆中、张飞和汉桓侯祠，区分史书人物、演义形象、祭祀纪念与今天的游览空间；不默认游客选择张飞口吻。',
    'shudao-xunzong': '蜀汉北境·蜀道寻踪：关联剑门关、昭化与蜀道交通、防御文化；区分古代通道与现代导航，示意节点不代表实际可通行路线。',
    'history-to-place': '从史书到现场：先检索文本依据，再解释现实地点、遗址、纪念建筑的关联；关联不足就留白，不为景点强配历史事件。',
    'official-history': '正史里的三国：突出《三国志》记述和证据边界，按需对照演义；不编造原文引文，现代研究归属作者。',
}

def build_web_prompt(message, mode='大众', history=None, story_id=None):
    hints = [h['content'][:4000] for h in (history or [])[-2:]
             if h.get('role') == 'user' and isinstance(h.get('content'), str)]
    template = (Path(__file__).resolve().parents[2] / 'prompts' / 'nuwax_user_prompt.md').read_text(encoding='utf-8')
    return Template(template).substitute(mode=mode,
        story_guidance=STORIES.get(story_id, '未选择已识别的故事线；围绕用户问题回答。'),
        context='\n'.join(hints) or '无补充背景。', question=message)
