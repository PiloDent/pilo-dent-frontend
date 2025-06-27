#!/usr/bin/env python3
import os
from PIL import Image

# Configuration
RAW_DIR     = "data/raw/Dental OPG (Classification)"  # your raw images root
PRE_DIR     = "data/preprocessed"
TARGET_SIZE = (512, 512)   # model’s expected size

os.makedirs(PRE_DIR, exist_ok=True)

for root, _, files in os.walk(RAW_DIR):
    for fname in files:
        if not fname.lower().endswith((".png", ".jpg", ".jpeg")):
            continue

        src = os.path.join(root, fname)
        dst = os.path.join(PRE_DIR, fname)  # flat output

        try:
            with Image.open(src) as im:
                im = im.convert("L")  # grayscale
                im = im.resize(TARGET_SIZE, resample=Image.Resampling.LANCZOS)
                im.save(dst)
        except Exception as e:
            print(f"⚠️  Failed {src}: {e}")

