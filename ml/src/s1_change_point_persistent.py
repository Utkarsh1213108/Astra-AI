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

WINDOW = 100
PERSISTENCE = 20


# ============================================================
# 1. LOAD S-1
# ============================================================

test = np.load(
    f"{BASE}/test/S-1.npy"
)

active_channels = np.any(
    test != 0,
    axis=0
)

channels = np.where(
    active_channels
)[0]

test = test[:, channels]

print("\n=== ASTRA: ROBUST CHANGE-POINT + PERSISTENCE ===")
print(f"Channels used: {len(channels)}")
print(f"Test shape: {test.shape}")


# ============================================================
# 2. NASA GROUND TRUTH
# ============================================================

labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[
    labels.chan_id == "S-1"
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
# 3. ROBUST CHANGE-POINT SCORE
# ============================================================

scores = np.zeros(
    len(test)
)

for t in range(
    WINDOW,
    len(test) - WINDOW
):

    left = test[
        t - WINDOW:t
    ]

    right = test[
        t:t + WINDOW
    ]

    left_mean = left.mean(axis=0)
    right_mean = right.mean(axis=0)

    left_std = left.std(axis=0)
    right_std = right.std(axis=0)

    # Robust scale
    scale = np.maximum(
        (left_std + right_std) / 2,
        0.01
    )

    mean_change = (
        np.abs(
            right_mean - left_mean
        )
        / scale
    )

    std_change = (
        np.abs(
            right_std - left_std
        )
        / scale
    )

    scores[t] = np.mean(
        mean_change + std_change
    )


# ============================================================
# 4. LEARN THRESHOLD FROM NORMAL REGION
# ============================================================

baseline_scores = scores[
    WINDOW:5000
]

median = np.median(
    baseline_scores
)

mad = np.median(
    np.abs(
        baseline_scores - median
    )
)

threshold = (
    median + 4 * mad
)

print(f"\nBaseline median: {median:.4f}")
print(f"Baseline MAD: {mad:.4f}")
print(f"Threshold: {threshold:.4f}")


# ============================================================
# 5. INITIAL CHANGE-POINT FLAGS
# ============================================================

above_threshold = (
    scores >= threshold
)


# ============================================================
# 6. PERSISTENCE FILTER
# ============================================================

predicted = np.zeros(
    len(test),
    dtype=bool
)

count = 0

for i in range(
    len(test)
):

    if above_threshold[i]:

        count += 1

    else:

        count = 0

    if count >= PERSISTENCE:

        predicted[
            i - PERSISTENCE + 1:i + 1
        ] = True


# ============================================================
# 7. METRICS
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
# 8. RESULTS
# ============================================================

print("\n========================================")
print("RESULTS")
print("========================================")

print(f"Change-point window: {WINDOW}")
print(f"Persistence: {PERSISTENCE}")
print(f"Threshold: {threshold:.4f}")

print(
    f"\nPredicted anomalies: "
    f"{predicted.sum()}"
)

print(
    f"Actual anomalies: "
    f"{y_true.sum()}"
)

print(
    f"\nPrecision: {precision:.4f}"
)

print(
    f"Recall:    {recall:.4f}"
)

print(
    f"F1 Score:  {f1:.4f}"
)

print(
    f"PR-AUC:    {pr_auc:.4f}"
)

print("\nNASA anomaly intervals:")

for interval in intervals:
    print(interval)


# ============================================================
# 9. PLOT
# ============================================================

plt.figure(
    figsize=(14, 5)
)

plt.plot(
    scores,
    label="Robust change-point score"
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

plt.xlabel(
    "Time step"
)

plt.ylabel(
    "Change score"
)

plt.title(
    "S-1 Robust Change-Point + Persistence"
)

plt.legend()

plt.tight_layout()

plt.savefig(
    "ml/results/s1_change_point_persistent.png",
    dpi=150
)

print(
    "\nSaved: "
    "ml/results/s1_change_point_persistent.png"
)