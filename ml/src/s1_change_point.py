import numpy as np
import pandas as pd
import ast
import matplotlib.pyplot as plt
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    average_precision_score
)

BASE = "ml/data/raw/data/data"

# ============================================================
# 1. LOAD S-1
# ============================================================

test = np.load(f"{BASE}/test/S-1.npy")

active_channels = np.any(test != 0, axis=0)
channels = np.where(active_channels)[0]

test = test[:, channels]

print("\n=== ASTRA: S-1 ROBUST CHANGE-POINT DETECTOR ===")
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
# 3. CHANGE-POINT SCORE
# ============================================================

window = 100

scores = np.zeros(len(test))

for t in range(window, len(test) - window):

    left = test[t - window:t]
    right = test[t:t + window]

    # Distribution statistics
    left_mean = left.mean(axis=0)
    right_mean = right.mean(axis=0)

    left_std = left.std(axis=0)
    right_std = right.std(axis=0)

    # --------------------------------------------------------
    # ROBUST SCALE
    # --------------------------------------------------------

    # Use both sides to estimate natural variation
    scale = np.maximum(
        (left_std + right_std) / 2,
        0.01
    )

    # --------------------------------------------------------
    # MEAN SHIFT
    # --------------------------------------------------------

    mean_change = (
        np.abs(right_mean - left_mean)
        / scale
    )

    # --------------------------------------------------------
    # STD SHIFT
    # --------------------------------------------------------

    std_change = (
        np.abs(right_std - left_std)
        / scale
    )

    # --------------------------------------------------------
    # COMBINED SCORE
    # --------------------------------------------------------

    scores[t] = np.mean(
        mean_change + std_change
    )


# ============================================================
# 4. BASELINE
# ============================================================

baseline_scores = scores[
    window:5000
]

median = np.median(
    baseline_scores
)

mad = np.median(
    np.abs(
        baseline_scores - median
    )
)

# Robust threshold
threshold = median + 4 * mad

print(f"\nBaseline median: {median:.4f}")
print(f"Baseline MAD: {mad:.4f}")
print(f"Threshold: {threshold:.4f}")


# ============================================================
# 5. DETECTION
# ============================================================

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

print(f"Window size: {window}")
print(f"Threshold: {threshold:.4f}")

print(f"\nPredicted change points: {predicted.sum()}")
print(f"Actual anomalous points: {y_true.sum()}")

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")

print("\nNASA anomaly intervals:")

for interval in intervals:
    print(interval)


# ============================================================
# 8. TOP CHANGE POINTS
# ============================================================

top_indices = np.argsort(
    scores
)[-20:][::-1]

print("\nTop 20 detected change points:")

for idx in top_indices:
    print(
        f"Time {idx:5d} | "
        f"Score {scores[idx]:.4f}"
    )


# ============================================================
# 9. GRAPH
# ============================================================

plt.figure(figsize=(14, 5))

plt.plot(
    scores,
    label="Change-point score"
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
plt.ylabel("Distribution change score")

plt.title(
    "S-1 Robust Change-Point Detection"
)

plt.legend()

plt.tight_layout()

plt.savefig(
    "ml/results/s1_change_point.png",
    dpi=150
)

print(
    "\nSaved: ml/results/s1_change_point.png"
)