#!/usr/bin/env python3
"""用 MLX 训练 QLoRA 模型。"""

import mlx.core as mx
from pathlib import Path

def main():
    from mlx_lm import load, train
    from mlx_lm.utils import get_model_path

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