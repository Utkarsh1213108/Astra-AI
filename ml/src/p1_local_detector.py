import numpy as np
import pandas as pd
import ast
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    average_precision_score
)

BASE = "ml/data/raw/data/data"

# =========================
# LOAD DATA
# =========================

train = np.load(f"{BASE}/train/P-1.npy")
test = np.load(f"{BASE}/test/P-1.npy")

# Common train/test channels
train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(train_active & test_active)[0]

train = train[:, channels]
test = test[:, channels]

print("\n=== ASTRA: P-1 LOCAL TEMPORAL DETECTOR ===")
print(f"Channels used: {len(channels)}")
print(f"Test shape: {test.shape}")


# =========================
# PARAMETERS
# =========================

WINDOW = 50


# =========================
# LOCAL TEMPORAL SCORE
# =========================

scores = np.zeros(len(test))

for t in range(WINDOW, len(test)):

    context = test[t - WINDOW:t]
    current = test[t]

    context_mean = np.mean(context, axis=0)
    context_std = np.std(context, axis=0)

    # Avoid division by zero
    context_std[context_std < 0.01] = 0.01

    # Current point's deviation from recent behaviour
    deviation = np.abs(
        current - context_mean
    ) / context_std

    # Average across channels
    scores[t] = np.mean(deviation)


# =========================
# THRESHOLD
# =========================

# Estimate threshold from early test period
baseline_scores = scores[WINDOW:5000]

threshold = np.percentile(
    baseline_scores,
    95
)

predicted = scores >= threshold


# =========================
# NASA LABELS
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

y_true = np.zeros(
    len(test),
    dtype=int
)

for start, end in intervals:
    y_true[start:end + 1] = 1


# =========================
# METRICS
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

print("\n========================================")
print("RESULTS")
print("========================================")

print(f"Window size: {WINDOW}")
print("Threshold percentile: 95")
print(f"Threshold: {threshold:.4f}")

print(f"\nPredicted anomalies: {predicted.sum()}")
print(f"Actual anomalies: {y_true.sum()}")

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

print("\nTop 20 local anomaly points:")

for idx in top_indices:
    print(
        f"Time {idx:4d} | Score {scores[idx]:.4f}"
    )