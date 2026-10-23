#!/usr/bin/env python3
"""Stamp every page's CSS/JS links with a content hash (?v=…).

Run before each deploy. A changed file gets a new URL, so no browser can
pair a new page with a stylesheet or script it cached from an old one.
"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
assets = {p.name: hashlib.md5(p.read_bytes()).hexdigest()[:8]
          for p in (root / "assets").glob("*") if p.suffix in (".css", ".js")}
pages = [p for p in root.rglob("*.html") if "scripts" not in p.parts and ".vercel" not in p.parts]
for page in pages:
    text = page.read_text()
    new = re.sub(r'(/assets/([\w.-]+\.(?:css|js)))(\?v=\w+)?',
                 lambda m: f"{m.group(1)}?v={assets[m.group(2)]}" if m.group(2) in assets else m.group(0),
                 text)
    if new != text:
        page.write_text(new)
        print("stamped", page.relative_to(root))
