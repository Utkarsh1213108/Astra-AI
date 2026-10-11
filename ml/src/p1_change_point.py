import numpy as np
import pandas as pd
import ast
from sklearn.metrics import precision_score, recall_score, f1_score, average_precision_score


# =========================
# LOAD DATA
# =========================

BASE = "ml/data/raw/data/data"

train = np.load(f"{BASE}/train/P-1.npy")
test = np.load(f"{BASE}/test/P-1.npy")


# =========================
# COMMON CHANNELS
# =========================

train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(train_active & test_active)[0]

train = train[:, channels]
test = test[:, channels]

print("\n=== ASTRA: P-1 ROBUST CHANGE-POINT DETECTOR ===")
print(f"Channels used: {len(channels)}")
print(f"Test shape: {test.shape}")


# =========================
# PARAMETERS
# =========================

WINDOW = 100


# =========================
# CHANGE-POINT SCORE
# =========================

scores = np.zeros(len(test))

for t in range(WINDOW, len(test) - WINDOW):

    left = test[t - WINDOW:t]
    right = test[t:t + WINDOW]

    left_mean = np.mean(left, axis=0)
    right_mean = np.mean(right, axis=0)

    left_std = np.std(left, axis=0)
    right_std = np.std(right, axis=0)

    mean_change = np.abs(right_mean - left_mean)

    std_change = np.abs(right_std - left_std)

    scale = np.maximum(
        (left_std + right_std) / 2,
        0.01
    )

    score_per_channel = (
        mean_change + std_change
    ) / scale

    scores[t] = np.mean(score_per_channel)


# =========================
# ROBUST THRESHOLD
# =========================

baseline_scores = scores[WINDOW:5000]

median = np.median(baseline_scores)
mad = np.median(np.abs(baseline_scores - median))

threshold = median + 4 * mad

predicted = scores >= threshold


# =========================
# LOAD NASA LABELS
# =========================

labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[
    labels.chan_id == "P-1"
].iloc[0]

intervals = ast.literal_eval(
    row.anomaly_sequences
)

y_true = np.zeros(len(test), dtype=int)

for start, end in intervals:
    y_true[start:end + 1] = 1


# =========================
# EVALUATION
# =========================

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


# =========================
# RESULTS
# =========================

print("\nBaseline median:", round(median, 4))
print("Baseline MAD:", round(mad, 4))
print("Threshold:", round(threshold, 4))

print("\n========================================")
print("RESULTS")
print("========================================")

print(f"Window size: {WINDOW}")
print(f"Threshold: {threshold:.4f}")

print(f"\nPredicted change points: {predicted.sum()}")
print(f"Actual anomalous points: {y_true.sum()}")

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")

print("\nNASA anomaly intervals:")

for start, end in intervals:
    print(f"[{start}, {end}]")


# =========================
# TOP 20
# =========================

top_indices = np.argsort(scores)[-20:][::-1]

print("\nTop 20 detected change points:")

for idx in top_indices:
    print(
        f"Time {idx:4d} | Score {scores[idx]:.4f}"
    )