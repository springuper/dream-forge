#!/usr/bin/env python3
"""将原始文本转换为真正的问答格式训练数据。"""

import json
import re
from pathlib import Path
from typing import Iterator, List, Dict

# 关键人物名（用于提取事实）
PEOPLE_PATTERNS = [
    '沛公', '刘邦', '項羽', '项羽', '韓信', '韩信', '張良', '张良',
    '萧何', '樊噲', '樊哙', '章邯', '范增', '曹無伤', '曹无伤',
    '田榮', '田荣', '彭越', '陈余', '张耳', '黥布', '英布',
]

# 问句模板
QUESTION_TEMPLATES = [
    ("{person}是谁？", "{person}是{desc}"),
    ("{person}做了什么？", "根据记载，{action}"),
    ("{event}的结果是什么？", "结果：{result}"),
]

def extract_events(text: str) -> List[Dict]:
    """从文本中提取事件（人物+动作+结果）。"""
    events = []

    # 分割段落
    paragraphs = [p.strip() for p in text.split('\n') if p.strip() and len(p) > 20]

    for para in paragraphs:
        # 跳过元数据行（如"起旃蒙協洽，盡柔兆涒灘，凡二年"）
        if re.match(r'^起.+盡.+，凡\d+年', para):
            continue

        # 提取人物和动作
        for person in PEOPLE_PATTERNS:
            if person in para:
                # 找到包含该人物的句子
                sentences = re.split(r'[。；]', para)
                for sent in sentences:
                    if person in sent and len(sent) > 10:
                        events.append({
                            'person': person,
                            'sentence': sent,
                            'full_para': para
                        })
                        break

    return events

def generate_qa_from_event(event: Dict) -> Iterator[dict]:
    """从事件生成问答对。"""

    person = event['person']
    sentence = event['sentence']

    # 生成不同类型的问题
    qa_templates = [
        # 人物相关问题
        {
            'q': f"資治通鉴中提到的{person}是谁？",
            'a': f"{person}，据資治通鉴记载：{sentence}"
        },
        {
            'q': f"{person}在楚汉战争期间做了什么？",
            'a': f"关于{person}的记载：{sentence}"
        },
        # 事件相关问题
        {
            'q': f"請根據資治通鉴描述：{sentence[:30]}...",
            'a': sentence
        },
    ]

    for template in qa_templates:
        if len(template['q']) > 5 and len(template['a']) > 10:
            yield {
                "messages": [
                    {"role": "user", "content": template['q']},
                    {"role": "assistant", "content": template['a']}
                ]
            }

def extract_battle_events(text: str) -> Iterator[dict]:
    """专门提取战役/重要事件。"""
    # 战争相关词汇
    battle_patterns = [
        r'（([^）]+)）',  # 括号内的补充说明
        r'冬.+?月',
        r'春.+?月',
        r'夏.+?月',
        r'秋.+?月',
    ]

    paragraphs = [p.strip() for p in text.split('\n') if p.strip() and len(p) > 20]

    for para in paragraphs:
        # 跳过元数据
        if re.match(r'^起.+盡.+，凡\d+年', para):
            continue

        # 提取具体事件句
        sentences = re.split(r'[。；]', para)
        for sent in sentences:
            if len(sent) > 15:
                # 生成问题
                q = f"請根據資治通鉴回答：{sent}"
                yield {
                    "messages": [
                        {"role": "user", "content": q},
                        {"role": "assistant", "content": sent}
                    ]
                }

def main():
    raw_dir = Path(__file__).parent.parent / 'data' / 'raw'
    out_dir = Path(__file__).parent.parent / 'data' / 'processed'
    out_dir.mkdir(parents=True, exist_ok=True)

    all_data = []
    for txt_file in sorted(raw_dir.glob('chapter_*.txt')):
        text = txt_file.read_text(encoding='utf-8')

        # 方法1：从事件生成QA
        events = extract_events(text)
        for event in events:
            for qa in generate_qa_from_event(event):
                all_data.append(qa)

        # 方法2：从段落生成更自然的问答
        paragraphs = [p.strip() for p in text.split('\n') if p.strip() and len(p) > 30]
        for para in paragraphs:
            if re.match(r'^起.+盡.+，凡\d+年', para):
                continue

            # 生成概括性问题
            if '，' in para:
                parts = para.split('，')
                if len(parts) >= 2:
                    q = f"資治通鉴中提到「{parts[0]}」，具体内容是什么？"
                    a = '，'.join(parts[:3])  # 取前几句作为答案
                    if len(q) > 10 and len(a) > 10:
                        all_data.append({
                            "messages": [
                                {"role": "user", "content": q},
                                {"role": "assistant", "content": a}
                            ]
                        })

    # 去重
    seen = set()
    unique_data = []
    for item in all_data:
        key = item['messages'][0]['content'][:50]
        if key not in seen:
            seen.add(key)
            unique_data.append(item)

    out_file = out_dir / 'train.jsonl'
    with open(out_file, 'w', encoding='utf-8') as f:
        for item in unique_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"Formatted {len(unique_data)} unique QA pairs -> {out_file}")

if __name__ == '__main__':
    main()