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

# ============================================================
# LOAD DATA
# ============================================================

train = np.load(f"{BASE}/train/P-1.npy")
test = np.load(f"{BASE}/test/P-1.npy")

train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(train_active & test_active)[0]

train = train[:, channels]
test = test[:, channels]

print("\n=== ASTRA: P-1 HYBRID ANOMALY DETECTOR ===")
print(f"Channels used: {len(channels)}")
print(f"Test shape: {test.shape}")


# ============================================================
# PARAMETERS
# ============================================================

WINDOW = 50
CHANGE_WINDOW = 100
BASELINE_END = 5000


# ============================================================
# SCORE 1 — LOCAL TEMPORAL
# ============================================================

local_scores = np.zeros(len(test))

for t in range(WINDOW, len(test)):

    context = test[t - WINDOW:t]
    current = test[t]

    context_mean = np.mean(context, axis=0)
    context_std = np.std(context, axis=0)

    context_std[context_std < 0.01] = 0.01

    deviation = np.abs(
        current - context_mean
    ) / context_std

    local_scores[t] = np.mean(deviation)


# ============================================================
# SCORE 2 — CONTEXTUAL
# ============================================================

train_mean = np.mean(train, axis=0)
train_std = np.std(train, axis=0)

train_std[train_std < 0.01] = 0.01

contextual_scores = np.zeros(len(test))

for t in range(WINDOW, len(test)):

    context = test[t - WINDOW:t]

    context_mean = np.mean(context, axis=0)
    context_std = np.std(context, axis=0)

    context_std[context_std < 0.01] = 0.01

    local_deviation = np.abs(
        test[t] - context_mean
    ) / context_std

    contextual_shift = np.abs(
        context_mean - train_mean
    ) / train_std

    contextual_scores[t] = np.mean(
        0.5 * local_deviation +
        0.5 * contextual_shift
    )


# ============================================================
# SCORE 3 — ROBUST CHANGE-POINT
# ============================================================

change_scores = np.zeros(len(test))

for t in range(CHANGE_WINDOW, len(test) - CHANGE_WINDOW):

    left = test[
        t - CHANGE_WINDOW:t
    ]

    right = test[
        t:t + CHANGE_WINDOW
    ]

    left_mean = np.mean(left, axis=0)
    right_mean = np.mean(right, axis=0)

    left_std = np.std(left, axis=0)
    right_std = np.std(right, axis=0)

    mean_change = np.abs(
        right_mean - left_mean
    )

    std_change = np.abs(
        right_std - left_std
    )

    scale = np.maximum(
        (left_std + right_std) / 2,
        0.01
    )

    score_per_channel = (
        mean_change + std_change
    ) / scale

    change_scores[t] = np.mean(
        score_per_channel
    )


# ============================================================
# BASELINE SCORE DISTRIBUTIONS
# ============================================================

local_baseline = local_scores[
    WINDOW:BASELINE_END
]

contextual_baseline = contextual_scores[
    WINDOW:BASELINE_END
]

change_baseline = change_scores[
    CHANGE_WINDOW:BASELINE_END
]


# ============================================================
# PERCENTILE NORMALISATION
# ============================================================

def percentile_score(scores, baseline):

    sorted_baseline = np.sort(baseline)

    ranks = np.searchsorted(
        sorted_baseline,
        scores,
        side="right"
    )

    return ranks / len(sorted_baseline)


local_normalised = percentile_score(
    local_scores,
    local_baseline
)

contextual_normalised = percentile_score(
    contextual_scores,
    contextual_baseline
)

change_normalised = percentile_score(
    change_scores,
    change_baseline
)


# ============================================================
# HYBRID SCORE
# ============================================================

hybrid_score = (
    local_normalised +
    contextual_normalised +
    change_normalised
) / 3


# ============================================================
# THRESHOLD
# ============================================================

hybrid_baseline = hybrid_score[
    CHANGE_WINDOW:BASELINE_END
]

threshold = np.percentile(
    hybrid_baseline,
    95
)

predicted = hybrid_score >= threshold


# ============================================================
# NASA LABELS
# ============================================================

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


# ============================================================
# METRICS
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
    hybrid_score
)


# ============================================================
# RESULTS
# ============================================================

print("\n========================================")
print("HYBRID RESULTS")
print("========================================")

print(f"Local window:       {WINDOW}")
print(f"Change-point window: {CHANGE_WINDOW}")
print("Detector weights:   1/3 each")
print("Baseline period:    first 5000 points")
print("Threshold:          95th percentile")

print(f"\nHybrid threshold: {threshold:.4f}")

print(
    f"\nPredicted anomalies: {predicted.sum()}"
)

print(
    f"Actual anomalies:    {y_true.sum()}"
)

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")


# ============================================================
# NASA INTERVALS
# ============================================================

print("\nNASA anomaly intervals:")

for start, end in intervals:
    print(f"[{start}, {end}]")


# ============================================================
# TOP 20 HYBRID SCORES
# ============================================================

top_indices = np.argsort(
    hybrid_score
)[-20:][::-1]

print("\nTop 20 hybrid anomaly points:")

for idx in top_indices:

    print(
        f"Time {idx:4d} | "
        f"Hybrid {hybrid_score[idx]:.4f} | "
        f"Local {local_normalised[idx]:.3f} | "
        f"Context {contextual_normalised[idx]:.3f} | "
        f"Change {change_normalised[idx]:.3f}"
    )