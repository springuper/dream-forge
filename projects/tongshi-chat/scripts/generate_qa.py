#!/usr/bin/env python3
"""用本地 LLM (LM Studio) 生成高质量问答对。"""

import json
import re
import fcntl
import time
from pathlib import Path

import requests

LM_STUDIO_URL = "http://localhost:1234/api/v1/chat"
MODEL = "google/gemma-4-e4b"

LOG_FILE = Path(__file__).parent.parent / 'data' / 'processed' / 'generate_qa_log.jsonl'
OUT_FILE = Path(__file__).parent.parent / 'data' / 'processed' / 'train.jsonl'

def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def load_checkpoint() -> set:
    if LOG_FILE.exists():
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            return {json.loads(line)['hash'] for line in f if line.strip()}
    return set()

def save_checkpoint(paragraph_hash: str):
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps({'hash': paragraph_hash}) + '\n')

def append_result(qa: dict, original_text: str):
    """线程安全地追加结果到文件（包含原文context）。"""
    item = {
        "messages": [
            {"role": "user", "content": f"原文：{original_text}\n问：{qa['q']}"},
            {"role": "assistant", "content": qa["a"]}
        ]
    }
    with open(OUT_FILE, 'a', encoding='utf-8') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        f.write(json.dumps(item, ensure_ascii=False) + '\n')
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)

def call_llm(text: str) -> list:
    prompt = f"""根据原文生成3个问答对，格式：[{{"q":"...","a":"..."}}]

原文：{text}

要求：
1. 问题必须基于原文中的具体事实，不能泛泛而问
2. 答案必须来自原文，不能凭空编造
3. 问题要具体，包含时间、地点、人物等要素

只返回JSON数组。"""

    try:
        response = requests.post(
            LM_STUDIO_URL,
            json={
                "model": MODEL,
                "system_prompt": "你是资治通鉴研究专家。只返回JSON数组。",
                "input": prompt,
                "reasoning": "off"
            },
            timeout=60
        )
        result = response.json()
        output = result.get('output', [])
        qa_text = "".join(item.get('content', '') for item in output if item.get('type') == 'message')

        if not qa_text:
            return []

        json_match = re.search(r'\[[\s\S]*\]', qa_text)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    return []

def main():
    processed_hashes = load_checkpoint()
    existing_count = 0
    if OUT_FILE.exists():
        with open(OUT_FILE, 'r', encoding='utf-8') as f:
            existing_count = sum(1 for _ in f)

    log(f"Checkpoint: {len(processed_hashes)}, Existing: {existing_count}")

    for txt_file in sorted((Path(__file__).parent.parent / 'data' / 'raw').glob('chapter_*.txt')):
        log(f"Processing {txt_file.name}...")
        text = txt_file.read_text(encoding='utf-8')

        lines = [l.strip() for l in text.split('\n') if l.strip() and len(l) > 15]
        lines = [l for l in lines if not re.match(r'^起.+盡.+，凡\d+年', l)]
        lines = [l for l in lines if not l.startswith('此北宋作品')]

        paragraphs = [l for l in lines if len(l) > 30]
        log(f"  {len(paragraphs)} paragraphs")

        for i, para in enumerate(paragraphs):
            para_hash = str(hash(para))

            if para_hash in processed_hashes:
                continue

            pairs = call_llm(para)
            for qa in pairs:
                if 'q' in qa and 'a' in qa and len(qa['q']) > 5 and len(qa['a']) > 5:
                    append_result(qa, para)

            save_checkpoint(para_hash)
            processed_hashes.add(para_hash)

            if (i + 1) % 20 == 0:
                log(f"  {i+1}/{len(paragraphs)}")

    # 统计最终结果
    with open(OUT_FILE, 'r', encoding='utf-8') as f:
        final_count = sum(1 for _ in f)
    log(f"\n=== Done: {final_count} Q&A pairs ===")

if __name__ == '__main__':
    main()