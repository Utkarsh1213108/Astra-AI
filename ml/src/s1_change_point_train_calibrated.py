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

train = np.load(f"{BASE}/train/S-1.npy")
test = np.load(f"{BASE}/test/S-1.npy")

# Common train/test channels
train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(
    train_active & test_active
)[0]

train = train[:, channels]
test = test[:, channels]

print("\n=== ASTRA: S-1 TRAIN-CALIBRATED CHANGE-POINT ===")
print(f"Channels used: {len(channels)}")
print(f"Train shape: {train.shape}")
print(f"Test shape:  {test.shape}")


# ============================================================
# PARAMETER
# ============================================================

WINDOW = 100


# ============================================================
# CHANGE-POINT SCORE FUNCTION
# ============================================================

def calculate_change_scores(data, window):

    scores = np.zeros(len(data))

    for t in range(
        window,
        len(data) - window
    ):

        left = data[
            t - window:t
        ]

        right = data[
            t:t + window
        ]

        left_mean = np.mean(
            left,
            axis=0
        )

        right_mean = np.mean(
            right,
            axis=0
        )

        left_std = np.std(
            left,
            axis=0
        )

        right_std = np.std(
            right,
            axis=0
        )

        mean_change = np.abs(
            right_mean - left_mean
        )

        std_change = np.abs(
            right_std - left_std
        )

        # Robust scale
        scale = np.maximum(
            (left_std + right_std) / 2,
            0.01
        )

        score_per_channel = (
            mean_change + std_change
        ) / scale

        scores[t] = np.mean(
            score_per_channel
        )

    return scores


# ============================================================
# TRAIN SCORES
# ============================================================

print("\nCalculating training change-point scores...")

train_scores = calculate_change_scores(
    train,
    WINDOW
)


# ============================================================
# VALID TRAINING REGION
# ============================================================

train_scores_valid = train_scores[
    WINDOW:len(train) - WINDOW
]


# ============================================================
# TRAIN-ONLY THRESHOLD
# ============================================================

median = np.median(
    train_scores_valid
)

mad = np.median(
    np.abs(
        train_scores_valid - median
    )
)

threshold = median + 4 * mad


print("\nTraining calibration:")
print(f"Training median: {median:.4f}")
print(f"Training MAD:    {mad:.4f}")
print(f"Threshold:       {threshold:.4f}")


# ============================================================
# TEST SCORES
# ============================================================

print("\nCalculating unseen test scores...")

test_scores = calculate_change_scores(
    test,
    WINDOW
)


# ============================================================
# APPLY FROZEN TRAIN THRESHOLD
# ============================================================

predicted = test_scores >= threshold


# ============================================================
# NASA LABELS
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

    y_true[
        start:end + 1
    ] = 1


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
    test_scores
)


# ============================================================
# RESULTS
# ============================================================

print("\n========================================")
print("TRAIN-CALIBRATED RESULTS")
print("========================================")

print(f"Window size: {WINDOW}")

print(
    "\nCalibration source: TRAIN DATA ONLY"
)

print(
    f"Threshold: {threshold:.4f}"
)

print(
    f"\nPredicted change points: "
    f"{predicted.sum()}"
)

print(
    f"Actual anomalous points: "
    f"{y_true.sum()}"
)

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")


# ============================================================
# NASA INTERVAL
# ============================================================

print("\nNASA anomaly interval:")

for start, end in intervals:

    print(
        f"[{start}, {end}]"
    )


# ============================================================
# TOP 20
# ============================================================

top_indices = np.argsort(
    test_scores
)[-20:][::-1]

print(
    "\nTop 20 detected change points:"
)

for idx in top_indices:

    print(
        f"Time {idx:4d} | "
        f"Score {test_scores[idx]:.4f}"
    )