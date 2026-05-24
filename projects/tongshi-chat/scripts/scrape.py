#!/usr/bin/env python3
"""Scrape 资治通鉴·汉纪 from wikisource."""

import ssl
import re
from pathlib import Path

try:
    from urllib.request import urlopen, Request
except ImportError:
    from urllib.request import urlopen, Request

from bs4 import BeautifulSoup

# 直接使用用户提供的 4 个卷链接
CHAPTER_URLS = [
    "https://zh.wikisource.org/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%91/%E5%8D%B7009",
    "https://zh.wikisource.org/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%91/%E5%8D%B7010",
    "https://zh.wikisource.org/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%91/%E5%8D%B7011",
    "https://zh.wikisource.org/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%91/%E5%8D%B7012",
]

# SSL context to bypass certificate verification
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

def make_request(url: str) -> str:
    """Make HTTP request with SSL disabled and User-Agent header."""
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; TongshiChatBot/1.0)'})
    return urlopen(req, context=ssl_context).read().decode('utf-8')

def scrape_chapter(url: str) -> str:
    """抓取单个章节内容。"""
    html = make_request(url)
    soup = BeautifulSoup(html, 'html.parser')

    # Find all p tags with actual content (Chinese text)
    paragraphs = []
    for p in soup.find_all('p'):
        text = p.get_text(strip=True)
        # Filter: must have Chinese characters and be substantial
        if re.search(r'[一-鿿]', text) and len(text) > 10:
            # Remove footnote references (sup tags)
            for sup in p.find_all('sup'):
                sup.decompose()
            clean_text = p.get_text(strip=True)
            paragraphs.append(clean_text)

    return '\n\n'.join(paragraphs)

def main():
    out_dir = Path(__file__).parent.parent / 'data' / 'raw'
    out_dir.mkdir(parents=True, exist_ok=True)

    for i, url in enumerate(CHAPTER_URLS):
        try:
            text = scrape_chapter(url)
            fname = out_dir / f"chapter_{i:03d}.txt"
            fname.write_text(text, encoding='utf-8')
            print(f"Saved {fname} ({len(text)} chars)")
        except Exception as e:
            print(f"Failed to scrape {url}: {e}")

if __name__ == '__main__':
    main()