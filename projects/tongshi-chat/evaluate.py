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