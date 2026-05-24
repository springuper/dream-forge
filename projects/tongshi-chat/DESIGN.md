# Tongshi Chat — 资治通鉴 LLM 微调项目

## 概述

用 QLoRA 在 Apple Silicon (MLX) 上微调 Qwen2-0.5B，创建一个能回答刘邦/楚汉战争相关历史问题的中文 LLM。

## 范围

**MVP 验证目标：**
- 训练数据：资治通鉴·汉纪中刘邦相关章节（~1-2万字）
- 模型能力：能准确回答关于楚汉战争的基础历史问题
- 对话风格：现代白话文

**排除范围：**
- 不做全文训练（只做验证性测试）
- 不做模型量化评估
- 第一版不做 Web UI

---

## 技术架构

### 技术栈

| 组件 | 选择 | 理由 |
|------|------|------|
| Base Model | Qwen2-0.5B | 内存友好，M5 可跑 |
| 微调方法 | QLoRA (4-bit) | 高效，显存需求低 |
| 框架 | MLX | Apple Silicon 优化 |
| 数据源 | wikisource 资治通鉴·汉纪 | 开源可爬 |

### 项目结构

```
dream-forge/projects/tongshi-chat/
├── data/
│   ├── raw/           # 原始 HTML/文本
│   └── processed/    # 格式化后的对话数据
├── scripts/
│   ├── scrape.py         # 爬取 wikisource
│   ├── format_data.py    # 转成对话格式
│   └── train.py          # 训练脚本
├── models/            # 训练产物
└── README.md
```

### 数据流程

```
wikisource (汉纪) → scrape.py → raw text → format_data.py → 对话格式 → train.py → LoRA adapter
```

---

## 数据规格

### 训练数据格式

```json
{
  "messages": [
    {"role": "user", "content": "刘邦在彭城之战后如何重整旗鼓？"},
    {"role": "assistant", "content": "彭城之战后，刘邦退守荥阳，收集残部，并让韩信开辟北方战场，垓下之战最终灭了项羽。"}
  ]
}
```

### 训练配置

- Context length: 512
- Batch size: 1 (gradient accumulation 4)
- Learning rate: 1e-4
- Epochs: 3
- LoRA rank: 8

---

## 环境依赖

```txt
mlx
mlx-lm
huggingface_hub
beautifulsoup4
```

安装：`pip install mlx mlx-lm huggingface_hub beautifulsoup4`

---

## 验证方式

训练完成后，运行以下问题测试：

1. "刘邦是什么时候去世的？"
2. "彭城之战是怎么败的？"
3. "韩信是怎么帮刘邦的？"

---

## 风险与限制

- 网络爬取 wikisource 可能失败，需要备用方案（Hugging Face 开源语料）
- 训练需要 ~2-3 小时（MBP 风扇会响）
- 数据量小，模型不会很"聪明"，但能验证流程