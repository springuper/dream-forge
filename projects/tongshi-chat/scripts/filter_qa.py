#!/usr/bin/env python3
"""过滤低质量问答对。"""

import json
from pathlib import Path

# 需要过滤的问题模式
FILTER_PATTERNS = [
    r'^什么',  # 什么开头但不够具体
    r'^[是不是有没有]',  # 是不是开头
    r'事件',
    r'结果',
    r'最终',
    r'^如何$',
    r'^为什么$',
    r'^何时$',
    r'^怎样$',
]

# 问题太短或太长
MIN_Q_LEN = 8
MAX_Q_LEN = 100

def is_good_question(q: str) -> bool:
    """判断问题是否足够具体。"""
    q = q.strip()

    # 长度检查
    if len(q) < MIN_Q_LEN or len(q) > MAX_Q_LEN:
        return False

    # 过滤模式
    for pattern in FILTER_PATTERNS:
        import re
        if re.search(pattern, q):
            return False

    # 问题应该包含具体名词或专有词汇
    specific_words = [
        '刘邦', '项羽', '韩信', '张良', '萧何', '樊哙', '范增',
        '沛公', '韩信', '章邯', '彭越', '田荣', '田横',
        '資治通鉴', '约法三章', '鸿门宴', '彭城',
        '霸上', '咸阳', '咸阳宫', '荥阳', '彭城',
        '人彘', '項莊', '項伯', '張良',
        '汉王', '西楚', '雍王', '塞王', '翟王',
        '周勃', '灌婴', '陈平', '曹参',
        '蒯通', '陳餘', '張耳',
        '季布', '鍾離昧', '龍且',
    ]

    has_specific = any(word in q for word in specific_words)
    return has_specific

def main():
    out_file = Path(__file__).parent.parent / 'data' / 'processed' / 'train.jsonl'

    # 读取现有数据
    with open(out_file, 'r', encoding='utf-8') as f:
        data = [json.loads(line) for line in f if line.strip()]

    print(f"原始数据: {len(data)} 对")

    # 过滤
    good_data = []
    removed = []
    for item in data:
        q = item['messages'][0]['content']
        if is_good_question(q):
            good_data.append(item)
        else:
            removed.append(q)

    print(f"过滤后: {len(good_data)} 对")
    print(f"移除: {len(removed)} 对")

    # 显示移除的问题
    if removed:
        print("\n移除的问题:")
        for q in removed[:10]:
            print(f"  - {q[:60]}...")

    # 保存
    with open(out_file, 'w', encoding='utf-8') as f:
        for item in good_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"\n已更新 {out_file}")

    # 显示保留的样本
    print("\n保留的样本:")
    for item in good_data[:10]:
        q = item['messages'][0]['content']
        a = item['messages'][1]['content']
        print(f"  Q: {q[:60]}...")
        print(f"  A: {a[:40]}...")
        print()

if __name__ == '__main__':
    main()