#!/usr/bin/env python3
"""将原始文本转换为对话格式的训练数据。"""

import json
from pathlib import Path
from typing import Iterator

def extract_qa_pairs(text: str) -> Iterator[dict]:
    """从章节文本中提取问答对。"""
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]

    for i in range(len(paragraphs) - 1):
        q = paragraphs[i]
        a = paragraphs[i + 1]
        if len(q) > 10 and len(q) < 200 and len(a) > 10:
            yield {
                "messages": [
                    {"role": "user", "content": q},
                    {"role": "assistant", "content": a}
                ]
            }

def main():
    raw_dir = Path(__file__).parent.parent / 'data' / 'raw'
    out_dir = Path(__file__).parent.parent / 'data' / 'processed'
    out_dir.mkdir(parents=True, exist_ok=True)

    all_data = []
    for txt_file in sorted(raw_dir.glob('chapter_*.txt')):
        text = txt_file.read_text(encoding='utf-8')
        for pair in extract_qa_pairs(text):
            all_data.append(pair)

    out_file = out_dir / 'train.jsonl'
    with open(out_file, 'w', encoding='utf-8') as f:
        for item in all_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"Formatted {len(all_data)} QA pairs -> {out_file}")

if __name__ == '__main__':
    main()