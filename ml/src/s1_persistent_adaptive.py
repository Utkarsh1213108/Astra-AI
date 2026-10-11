import numpy as np
import pandas as pd
import ast
import matplotlib.pyplot as plt
from sklearn.metrics import precision_score, recall_score, f1_score, average_precision_score

BASE = "ml/data/raw/data/data"

# ============================================================
# 1. LOAD DATA
# ============================================================

test = np.load(f"{BASE}/test/S-1.npy")

active_channels = np.any(test != 0, axis=0)
channels = np.where(active_channels)[0]

test = test[:, channels]

print("\n=== ASTRA: S-1 PERSISTENT ADAPTIVE DETECTOR ===")
print(f"Channels used: {len(channels)}")
print(f"Test shape: {test.shape}")


# ============================================================
# 2. NASA GROUND TRUTH
# ============================================================

labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[labels.chan_id == "S-1"].iloc[0]

intervals = ast.literal_eval(
    row.anomaly_sequences
)

y_true = np.zeros(len(test), dtype=int)

for start, end in intervals:
    y_true[start:end + 1] = 1


# ============================================================
# 3. NORMAL BASELINE
# ============================================================

baseline_end = 5000
window = 50

baseline = test[:baseline_end]

baseline_mean = baseline.mean(axis=0)
baseline_std = baseline.std(axis=0)

baseline_std[baseline_std < 1e-6] = 1e-6


# ============================================================
# 4. RAW ADAPTIVE SCORE
# ============================================================

raw_score = np.zeros(len(test))

for t in range(window, len(test)):

    current_window = test[t - window:t]

    rolling_mean = current_window.mean(axis=0)
    rolling_std = current_window.std(axis=0)

    mean_change = (
        np.abs(rolling_mean - baseline_mean)
        / baseline_std
    )

    std_change = (
        np.abs(rolling_std - baseline_std)
        / baseline_std
    )

    channel_score = mean_change + std_change

    raw_score[t] = np.mean(channel_score)


# ============================================================
# 5. SMOOTH THE SCORE
# ============================================================

smooth_window = 100

smooth_score = (
    pd.Series(raw_score)
    .rolling(smooth_window, min_periods=1)
    .mean()
    .values
)


# ============================================================
# 6. ROBUST THRESHOLD
# ============================================================

normal_scores = smooth_score[
    window:baseline_end
]

median = np.median(normal_scores)

mad = np.median(
    np.abs(normal_scores - median)
)

# Robust threshold
threshold = median + 4 * mad

print(f"\nBaseline median: {median:.4f}")
print(f"Baseline MAD: {mad:.4f}")
print(f"Threshold: {threshold:.4f}")


# ============================================================
# 7. PERSISTENCE RULE
# ============================================================

above_threshold = smooth_score >= threshold

persistence = 50

predicted = np.zeros(len(test), dtype=bool)

count = 0

for i in range(len(test)):

    if above_threshold[i]:
        count += 1
    else:
        count = 0

    if count >= persistence:
        predicted[
            i - persistence + 1:i + 1
        ] = True


# ============================================================
# 8. METRICS
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
    smooth_score
)


# ============================================================
# 9. RESULTS
# ============================================================

print("\n========================================")
print("RESULTS")
print("========================================")

print(f"Rolling window: {window}")
print(f"Smoothing window: {smooth_window}")
print(f"Persistence: {persistence}")

print(f"\nPredicted anomalies: {predicted.sum()}")
print(f"Actual anomalies: {y_true.sum()}")

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")

print("\nNASA anomaly intervals:")
for interval in intervals:
    print(interval)


# ============================================================
# 10. PLOT
# ============================================================

plt.figure(figsize=(14, 5))

plt.plot(
    smooth_score,
    label="Smoothed adaptive score"
)

plt.axhline(
    threshold,
    linestyle="--",
    label=f"Threshold = {threshold:.3f}"
)

for start, end in intervals:
    plt.axvspan(
        start,
        end,
        alpha=0.25
    )

plt.xlabel("Time step")
plt.ylabel("Anomaly score")
plt.title("S-1 Persistent Adaptive Anomaly Detector")

plt.legend()
plt.tight_layout()

plt.savefig(
    "ml/results/s1_persistent_adaptive.png",
    dpi=150
)

print(
    "\nSaved: ml/results/s1_persistent_adaptive.png"
)