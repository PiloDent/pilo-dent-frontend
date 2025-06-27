#!/usr/bin/env python3
import os, base64, json, requests
from tqdm import tqdm

# Configuration
IMG_DIR = "data/preprocessed"
OUT_DIR = "data/results"
API_URL = "http://localhost:5000/predict"
HEADERS = {"Content-Type": "application/json"}

os.makedirs(OUT_DIR, exist_ok=True)

for fname in tqdm(os.listdir(IMG_DIR), desc="Running inference"):
    if not fname.lower().endswith((".png","jpg","jpeg")):
        continue

    # read & encode
    with open(os.path.join(IMG_DIR, fname), "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    # call your model endpoint
    resp = requests.post(API_URL, headers=HEADERS, json={"image": b64})
    if resp.status_code != 200:
        print(f"⚠️ Skipped {fname}: HTTP {resp.status_code}")
        continue

    # write output into data/results/<image>.json
    out_path = os.path.join(OUT_DIR, fname + ".json")
    with open(out_path, "w") as fo:
        json.dump(resp.json(), fo, indent=2)

print(f"✅  Inference complete. Results written under: {OUT_DIR}")

