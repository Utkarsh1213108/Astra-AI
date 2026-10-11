import json
import numpy as np

from change_point_detector import detect_change_points


BASE = "ml/data/raw/data/data"

# ============================================================
# LOAD CONFIGURATION
# ============================================================

CONFIG_PATH = "ml/models/s1_change_point_config.json"

with open(CONFIG_PATH, "r") as f:
    config = json.load(f)

spacecraft = config["spacecraft"]
window = config["window"]
threshold = config["threshold"]


# ============================================================
# LOAD TELEMETRY
# ============================================================

train = np.load(
    f"{BASE}/train/{spacecraft}.npy"
)

test = np.load(
    f"{BASE}/test/{spacecraft}.npy"
)


# ============================================================
# COMMON CHANNELS
# ============================================================

train_active = np.any(
    train != 0,
    axis=0
)

test_active = np.any(
    test != 0,
    axis=0
)

channels = np.where(
    train_active & test_active
)[0]

test = test[:, channels]


# ============================================================
# RUN DETECTOR
# ============================================================

scores, predicted = detect_change_points(
    test,
    threshold=threshold,
    window=window
)


# ============================================================
# RESULTS
# ============================================================

print("\n=== ASTRA: CONFIG-BASED S-1 DETECTOR ===")

print(f"Spacecraft: {spacecraft}")
print(f"Channels: {len(channels)}")
print(f"Window: {window}")
print(f"Threshold: {threshold:.4f}")

print(
    f"\nDetected change points: "
    f"{predicted.sum()}"
)


# ============================================================
# TOP 10
# ============================================================

print("\nTop 10 change points:")

top_indices = np.argsort(
    scores
)[-10:][::-1]

for idx in top_indices:

    print(
        f"Time {idx:4d} | "
        f"Score {scores[idx]:.4f}"
    )