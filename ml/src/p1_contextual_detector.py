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

# Common channels
train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(train_active & test_active)[0]

train = train[:, channels]
test = test[:, channels]

print("\n=== ASTRA: P-1 CONTEXTUAL DETECTOR ===")
print(f"Channels used: {len(channels)}")
print(f"Test shape: {test.shape}")


# =========================
# PARAMETERS
# =========================

WINDOW = 50


# =========================
# TRAIN DISTRIBUTION
# =========================

train_mean = np.mean(train, axis=0)
train_std = np.std(train, axis=0)

train_std[train_std < 0.01] = 0.01


# =========================
# CONTEXTUAL SCORE
# =========================

scores = np.zeros(len(test))

for t in range(WINDOW, len(test)):

    current = test[t]

    # Recent local context
    context = test[t - WINDOW:t]

    context_mean = np.mean(context, axis=0)
    context_std = np.std(context, axis=0)

    context_std[context_std < 0.01] = 0.01

    # How unusual is the current point
    # relative to its local context?
    local_deviation = np.abs(
        current - context_mean
    ) / context_std

    # How different is the local context
    # from the normal training distribution?
    contextual_shift = np.abs(
        context_mean - train_mean
    ) / train_std

    # Combine both signals
    score_per_channel = (
        0.5 * local_deviation +
        0.5 * contextual_shift
    )

    scores[t] = np.mean(score_per_channel)


# =========================
# THRESHOLD
# =========================

# Use the first 5000 test points only
# to estimate a normal score distribution.
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
print(f"Threshold percentile: 95")
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

print("\nTop 20 contextual anomaly points:")

for idx in top_indices:
    print(
        f"Time {idx:4d} | Score {scores[idx]:.4f}"
    )