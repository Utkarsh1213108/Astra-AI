import numpy as np
import pandas as pd
import ast

from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    average_precision_score
)

from temporal_features import create_temporal_features


BASE = "ml/data/raw/data/data"

SPACECRAFT = "S-1"

WINDOW = 20

# Fixed from P-1 analysis.
# DO NOT tune this using S-1 labels.
THRESHOLD_PERCENTILE = 72.5


# ============================================================
# 1. Load data
# ============================================================

train = np.load(
    f"{BASE}/train/{SPACECRAFT}.npy"
)

test = np.load(
    f"{BASE}/test/{SPACECRAFT}.npy"
)

print("======================================")
print(" ASTRA: S-1 GENERALISATION TEST")
print("======================================")

print("Original train shape:", train.shape)
print("Original test shape: ", test.shape)


# ============================================================
# 2. Select common active channels
# ============================================================

train_active = np.any(
    train != 0,
    axis=0
)

test_active = np.any(
    test != 0,
    axis=0
)

channels = np.where(
    train_active & test_active
)[0]

train = train[:, channels]
test = test[:, channels]

print("Channels used:", len(channels))
print("Train shape:", train.shape)
print("Test shape: ", test.shape)


# ============================================================
# 3. Create temporal features
# ============================================================

train_features = create_temporal_features(
    train,
    window=WINDOW
)

test_features = create_temporal_features(
    test,
    window=WINDOW
)

print(
    "Temporal train shape:",
    train_features.shape
)

print(
    "Temporal test shape:",
    test_features.shape
)


# ============================================================
# 4. Train Temporal Isolation Forest
# ============================================================

model = IsolationForest(
    n_estimators=200,
    contamination="auto",
    random_state=42,
    n_jobs=-1
)

model.fit(train_features)


# ============================================================
# 5. Generate anomaly scores
# ============================================================

decision_score = model.decision_function(
    test_features
)

anomaly_score = -decision_score


# ============================================================
# 6. Ground truth
# ============================================================

labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[
    labels.chan_id == SPACECRAFT
].iloc[0]

intervals = ast.literal_eval(
    row.anomaly_sequences
)

y_true = np.zeros(
    len(test),
    dtype=int
)

for start, end in intervals:

    # Protect against any indexing mismatch
    start = max(0, start)
    end = min(len(test) - 1, end)

    y_true[start:end + 1] = 1


# ============================================================
# 7. Fixed threshold from P-1
# ============================================================

# IMPORTANT:
# We use the same percentile rule here,
# but the threshold value is calculated from S-1
# score distribution.
#
# This tests the detector methodology, not
# a threshold value learned from P-1.

threshold = np.percentile(
    anomaly_score,
    THRESHOLD_PERCENTILE
)

predicted = (
    anomaly_score >= threshold
)


# ============================================================
# 8. Metrics
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
    anomaly_score
)


# ============================================================
# 9. Results
# ============================================================

print("\n======================================")
print(" RESULTS")
print("======================================")

print(
    f"Threshold percentile: {THRESHOLD_PERCENTILE}"
)

print(
    f"Threshold value:      {threshold:.4f}"
)

print(
    f"Test points:          {len(test)}"
)

print(
    f"Predicted anomalies:  {predicted.sum()}"
)

print(
    f"Actual anomalies:     {y_true.sum()}"
)

print(
    f"Precision:            {precision:.4f}"
)

print(
    f"Recall:               {recall:.4f}"
)

print(
    f"F1 Score:             {f1:.4f}"
)

print(
    f"PR-AUC:               {pr_auc:.4f}"
)

print("\nNASA anomaly intervals:")

for interval in intervals:
    print(interval)

import matplotlib.pyplot as plt

plt.figure(figsize=(14, 5))

plt.plot(
    anomaly_score,
    label="Anomaly score"
)

for start, end in intervals:
    plt.axvspan(
        start,
        end,
        alpha=0.25
    )

plt.axhline(
    threshold,
    linestyle="--",
    label="Threshold"
)

plt.xlabel("Time step")
plt.ylabel("Anomaly score")

plt.title(
    "S-1 Temporal Isolation Forest Anomaly Score"
)

plt.legend()

plt.tight_layout()

plt.savefig(
    "ml/results/s1_temporal_isolation_forest.png",
    dpi=150
)

print(
    "\nSaved: "
    "ml/results/s1_temporal_isolation_forest.png"
)