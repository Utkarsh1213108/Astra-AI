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

print("\n=== ASTRA: S-1 FROZEN ADAPTIVE BASELINE ===")
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
# 3. INITIAL NORMAL BASELINE
# ============================================================

initial_baseline = 5000
window = 50

baseline_data = test[:initial_baseline]

baseline_mean = baseline_data.mean(axis=0)
baseline_std = baseline_data.std(axis=0)

baseline_std[baseline_std < 1e-6] = 1e-6


# ============================================================
# 4. CALCULATE INITIAL NORMAL SCORES
# ============================================================

initial_scores = []

for t in range(window, initial_baseline):

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

    score = np.mean(
        mean_change + std_change
    )

    initial_scores.append(score)


initial_scores = np.array(initial_scores)


# ============================================================
# 5. ROBUST THRESHOLD
# ============================================================

median = np.median(initial_scores)

mad = np.median(
    np.abs(initial_scores - median)
)

threshold = median + 4 * mad

print(f"\nInitial median: {median:.4f}")
print(f"Initial MAD: {mad:.4f}")
print(f"Threshold: {threshold:.4f}")


# ============================================================
# 6. FROZEN ADAPTIVE DETECTION
# ============================================================

scores = np.zeros(len(test))

predicted = np.zeros(len(test), dtype=bool)

# How quickly the normal baseline adapts
adaptation_rate = 0.01

for t in range(window, len(test)):

    current_window = test[t - window:t]

    rolling_mean = current_window.mean(axis=0)
    rolling_std = current_window.std(axis=0)

    # --------------------------------------------
    # Compare current state with current baseline
    # --------------------------------------------

    mean_change = (
        np.abs(rolling_mean - baseline_mean)
        / baseline_std
    )

    std_change = (
        np.abs(rolling_std - baseline_std)
        / baseline_std
    )

    score = np.mean(
        mean_change + std_change
    )

    scores[t] = score

    # --------------------------------------------
    # Detect anomaly
    # --------------------------------------------

    if score >= threshold:

        predicted[t] = True

        # IMPORTANT:
        # Do NOT update baseline.
        # The baseline is frozen during anomaly.

    else:

        # ----------------------------------------
        # Normal state:
        # slowly adapt baseline
        # ----------------------------------------

        baseline_mean = (
            (1 - adaptation_rate) * baseline_mean
            + adaptation_rate * rolling_mean
        )

        baseline_std = (
            (1 - adaptation_rate) * baseline_std
            + adaptation_rate * rolling_std
        )

        baseline_std[
            baseline_std < 1e-6
        ] = 1e-6


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

print(f"Rolling window: {window}")
print(f"Adaptation rate: {adaptation_rate}")
print(f"Threshold: {threshold:.4f}")

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
# 9. PLOT
# ============================================================

plt.figure(figsize=(14, 5))

plt.plot(
    scores,
    label="Frozen adaptive anomaly score"
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

plt.title(
    "S-1 Frozen Adaptive Baseline Detector"
)

plt.legend()

plt.tight_layout()

plt.savefig(
    "ml/results/s1_frozen_baseline.png",
    dpi=150
)

print(
    "\nSaved: ml/results/s1_frozen_baseline.png"
)