import numpy as np
import pandas as pd
import ast
from sklearn.metrics import precision_score, recall_score, f1_score, average_precision_score

BASE = "ml/data/raw/data/data"

# ============================================================
# 1. LOAD S-1 TEST DATA
# ============================================================

test = np.load(f"{BASE}/test/S-1.npy")

# Keep only channels active in test
active_channels = np.any(test != 0, axis=0)
channels = np.where(active_channels)[0]

test = test[:, channels]

print("\n=== ASTRA: S-1 ADAPTIVE CHANGE DETECTOR ===")
print(f"Channels used: {len(channels)}")
print(f"Test shape: {test.shape}")


# ============================================================
# 2. NASA GROUND TRUTH
# ============================================================

labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[labels.chan_id == "S-1"].iloc[0]

intervals = ast.literal_eval(row.anomaly_sequences)

y_true = np.zeros(len(test), dtype=int)

for start, end in intervals:
    y_true[start:end + 1] = 1


# ============================================================
# 3. ESTABLISH NORMAL BASELINE
# ============================================================

# First 5000 points are used as the normal operating baseline.
# The NASA anomaly begins later at 5300.

baseline_end = 5000

baseline = test[:baseline_end]

baseline_mean = baseline.mean(axis=0)
baseline_std = baseline.std(axis=0)

# Prevent division by zero
baseline_std[baseline_std < 1e-6] = 1e-6


# ============================================================
# 4. ROLLING WINDOW STATISTICS
# ============================================================

window = 50

scores = np.zeros(len(test))

for t in range(window, len(test)):

    current_window = test[t - window:t]

    rolling_mean = current_window.mean(axis=0)
    rolling_std = current_window.std(axis=0)

    # Difference from established normal baseline
    mean_change = np.abs(
        rolling_mean - baseline_mean
    ) / baseline_std

    std_change = np.abs(
        rolling_std - baseline_std
    ) / baseline_std

    # Combine mean and variance changes
    channel_score = mean_change + std_change

    # Overall spacecraft anomaly score
    scores[t] = np.mean(channel_score)


# ============================================================
# 5. THRESHOLD
# ============================================================

# Threshold learned only from the normal baseline period
normal_scores = scores[window:baseline_end]

threshold = np.percentile(
    normal_scores,
    99
)

predicted = scores >= threshold


# ============================================================
# 6. METRICS
# ============================================================

precision = precision_score(
    y_true,
    predicted,
    zero_division=0
)

recall = recall_score(
    y_true,
    predicted,
    zero_division=0
)

f1 = f1_score(
    y_true,
    predicted,
    zero_division=0
)

pr_auc = average_precision_score(
    y_true,
    scores
)


# ============================================================
# 7. RESULTS
# ============================================================

print("\n========================================")
print("RESULTS")
print("========================================")

print(f"Baseline period: 0 - {baseline_end}")
print(f"Rolling window: {window}")
print(f"Threshold percentile: 99")
print(f"Threshold: {threshold:.4f}")

print(f"\nTest points: {len(test)}")
print(f"Predicted anomalies: {predicted.sum()}")
print(f"Actual anomalies: {y_true.sum()}")

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")

print("\nNASA anomaly intervals:")
for interval in intervals:
    print(interval)