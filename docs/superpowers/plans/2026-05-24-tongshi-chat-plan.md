# Tongshi Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 微调 Qwen2-0.5B 使其能回答刘邦/楚汉战争相关历史问题

**Architecture:** 用 MLX + QLoRA 在本地训练，数据来自 wikisource 资治通鉴·汉纪，聚焦刘邦相关章节

**Tech Stack:** MLX, mlx-lm, Python, Qwen2-0.5B

---

## 文件结构

```
projects/tongshi-chat/
├── DESIGN.md                    # 设计文档（已有）
├── requirements.txt             # Python 依赖
├── scripts/
│   ├── scrape.py               # 爬取 wikisource 汉纪
│   └── format_data.py          # 格式化数据为对话格式
├── data/
│   ├── raw/                    # 原始 HTML/文本
│   └── processed/               # 格式化后的训练数据
├── train.py                     # 训练脚本
└── evaluate.py                  # 验证脚本
```

---

## 任务列表

### Task 1: 项目初始化

**Files:**
- Create: `projects/tongshi-chat/requirements.txt`
- Create: `projects/tongshi-chat/.gitignore`

- [ ] **Step 1: 创建 requirements.txt**

```txt
mlx
mlx-lm
huggingface_hub
beautifulsoup4
lxml
```

- [ ] **Step 2: 创建 .gitignore**

```txt
__pycache__/
*.pyc
data/raw/*
data/processed/*
models/*
```

- [ ] **Step 3: 提交**

```bash
cd projects/tongshi-chat
git add requirements.txt .gitignore
git commit -m "chore: initialize project structure"
```

---

### Task 2: 爬取数据脚本

**Files:**
- Create: `scripts/scrape.py`

- [ ] **Step 1: 创建 scrape.py**

```python
#!/usr/bin/env python3
"""Scrape 资治通鉴·汉纪 from wikisource."""

import re
from pathlib import Path

try:
    from urllib.request import urlopen
except ImportError:
    from urllib.request import urlopen

from bs4 import BeautifulSoup

WIKI_BASE = "https://zh.wikisource.org"
HAN_JI_URL = f"{WIKI_BASE}/wiki/资治通鉴#汉纪"

def get_han_ji_links():
    """找到汉纪的所有章节链接。"""
    html = urlopen(HAN_JI_URL).read().decode('utf-8')
    soup = BeautifulSoup(html, 'html.parser')

    links = []
    # 找所有指向汉纪内部的链接
    for a in soup.find_all('a', href=True):
        href = a['href']
        if '资治通鉴' in href and '汉纪' in a.get_text():
            full_url = WIKI_BASE + href if href.startswith('/') else href
            links.append(full_url)
    return links

def scrape_chapter(url: str) -> str:
    """抓取单个章节内容。"""
    html = urlopen(url).read().decode('utf-8')
    soup = BeautifulSoup(html, 'html.parser')

    # 获取正文内容（通常在 mw-parser-output 下）
    content = soup.find('div', class_='mw-parser-output')
    if not content:
        content = soup

    # 移除注释、目录等
    for tag in content.find_all(['sup', 'div', 'table']):
        tag.decompose()

    # 提取纯文本
    text = content.get_text(separator='\n', strip=True)
    # 清理多余空行
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text

def main():
    out_dir = Path(__file__).parent.parent / 'data' / 'raw'
    out_dir.mkdir(parents=True, exist_ok=True)

    links = get_han_ji_links()
    print(f"Found {len(links)} chapters")

    for i, url in enumerate(links):
        try:
            text = scrape_chapter(url)
            fname = out_dir / f"chapter_{i:03d}.txt"
            fname.write_text(text, encoding='utf-8')
            print(f"Saved {fname}")
        except Exception as e:
            print(f"Failed to scrape {url}: {e}")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 运行测试**

```bash
cd projects/tongshi-chat
python scripts/scrape.py
```

Expected: 输出 "Found N chapters"，然后保存多个 chapter_*.txt 文件到 data/raw/

- [ ] **Step 3: 提交**

```bash
git add scripts/scrape.py
git commit -m "feat: add wikisource scraper for 资治通鉴·汉纪"
```

---

### Task 3: 数据格式化脚本

**Files:**
- Create: `scripts/format_data.py`

- [ ] **Step 1: 创建 format_data.py**

```python
#!/usr/bin/env python3
"""将原始文本转换为对话格式的训练数据。"""

import json
from pathlib import Path
from typing import Iterator

def extract_qa_pairs(text: str) -> Iterator[dict]:
    """从章节文本中提取问答对。"""
    # 简化版本：按段落分割，相邻段落组成 Q-A
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]

    for i in range(len(paragraphs) - 1):
        q = paragraphs[i]
        a = paragraphs[i + 1]
        # 过滤太短或太长的段落
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

    # 保存为 JSONL
    out_file = out_dir / 'train.jsonl'
    with open(out_file, 'w', encoding='utf-8') as f:
        for item in all_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"Formatted {len(all_data)} QA pairs -> {out_file}")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 运行格式化**

```bash
cd projects/tongshi-chat
python scripts/format_data.py
```

Expected: 创建 data/processed/train.jsonl，包含 N 条 QA 对

- [ ] **Step 3: 检查输出**

```bash
head -1 data/processed/train.jsonl
```

Expected: JSON 格式的对话数据

- [ ] **Step 4: 提交**

```bash
git add scripts/format_data.py
git commit -m "feat: add data formatting script for training"
```

---

### Task 4: 训练脚本

**Files:**
- Create: `train.py`

- [ ] **Step 1: 创建 train.py**

```python
#!/usr/bin/env python3
"""用 MLX 训练 QLoRA 模型。"""

import mlx.core as mx
from mlx_lm import load, train
from mlx_lm.utils import get_model_path

def main():
    # 模型：Qwen2-0.5B
    model_path = "Qwen/Qwen2-0.5B"

    # 训练参数
    train_config = {
        "model": model_path,
        "train_data": "data/processed/train.jsonl",
        "batch_size": 1,
        "num_epochs": 3,
        "learning_rate": 1e-4,
        "lora_rank": 8,
        "adapter_path": "models/tongshi-adapter",
    }

    print("Starting training...")
    train(**train_config)
    print("Training complete!")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: （可选）先测试模型加载**

如果网络不好，可以先下载模型或跳过此步骤，直接进入 Task 5 验证

- [ ] **Step 3: 提交**

```bash
git add train.py
git commit -m "feat: add training script with QLoRA config"
```

---

### Task 5: 验证脚本

**Files:**
- Create: `evaluate.py`

- [ ] **Step 1: 创建 evaluate.py**

```python
#!/usr/bin/env python3
"""验证微调后的模型是否能正确回答历史问题。"""

from mlx_lm import load, generate

MODEL_PATH = "Qwen/Qwen2-0.5B"
ADAPTER_PATH = "models/tongshi-adapter"

TEST_QUESTIONS = [
    "刘邦是什么时候去世的？",
    "彭城之战是怎么败的？",
    "韩信是怎么帮刘邦的？",
]

def main():
    print("Loading model...")
    model, tokenizer = load(MODEL_PATH, adapter_path=ADAPTER_PATH)

    for q in TEST_QUESTIONS:
        print(f"\nQ: {q}")
        prompt = f"用户: {q}\n助手:"
        response = generate(model, tokenizer, prompt=prompt, max_tokens=100)
        print(f"A: {response}")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 提交**

```bash
git add evaluate.py
git commit -m "feat: add evaluation script"
```

---

## 验证步骤

所有任务完成后，运行：

```bash
cd projects/tongshi-chat
python train.py        # 开始训练
python evaluate.py     # 验证结果
```

---

## 风险与备选方案

- 如果 wikisource 爬取失败：改用 Hugging Face 上的中文古文数据集
- 如果 MLX 训练失败：降级到更小的模型或更少的训练轮次