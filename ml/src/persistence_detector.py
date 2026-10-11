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

WINDOW = 20
PERSISTENCE_WINDOW = 10
MIN_ANOMALIES = 5


# ============================================================
# 1. Load data
# ============================================================

train = np.load(
    f"{BASE}/train/P-1.npy"
)

test = np.load(
    f"{BASE}/test/P-1.npy"
)


# ============================================================
# 2. Common channels
# ============================================================

train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(
    train_active & test_active
)[0]

train = train[:, channels]
test = test[:, channels]


# ============================================================
# 3. Temporal features
# ============================================================

train_features = create_temporal_features(
    train,
    window=WINDOW
)

test_features = create_temporal_features(
    test,
    window=WINDOW
)


# ============================================================
# 4. Train Isolation Forest
# ============================================================

model = IsolationForest(
    n_estimators=200,
    contamination="auto",
    random_state=42,
    n_jobs=-1
)

model.fit(train_features)


# ============================================================
# 5. Anomaly scores
# ============================================================

decision_score = model.decision_function(
    test_features
)

anomaly_score = -decision_score


# ============================================================
# 6. Base threshold
# ============================================================

threshold = np.percentile(
    anomaly_score,
    90
)

point_anomaly = (
    anomaly_score >= threshold
)


# ============================================================
# 7. Persistence filtering
# ============================================================

rolling_count = (
    pd.Series(point_anomaly.astype(int))
    .rolling(
        PERSISTENCE_WINDOW,
        min_periods=1
    )
    .sum()
)

persistent_anomaly = (
    rolling_count >= MIN_ANOMALIES
).to_numpy()


# ============================================================
# 8. NASA ground truth
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
# 9. Evaluate point-wise detector
# ============================================================

precision_point = precision_score(
    y_true,
    point_anomaly,
    zero_division=0
)

recall_point = recall_score(
    y_true,
    point_anomaly,
    zero_division=0
)

f1_point = f1_score(
    y_true,
    point_anomaly,
    zero_division=0
)


# ============================================================
# 10. Evaluate persistence detector
# ============================================================

precision_persistent = precision_score(
    y_true,
    persistent_anomaly,
    zero_division=0
)

recall_persistent = recall_score(
    y_true,
    persistent_anomaly,
    zero_division=0
)

f1_persistent = f1_score(
    y_true,
    persistent_anomaly,
    zero_division=0
)

pr_auc = average_precision_score(
    y_true,
    anomaly_score
)


# ============================================================
# 11. Results
# ============================================================

print("\n======================================")
print(" ASTRA: PERSISTENCE DETECTOR")
print("======================================")

print(f"Temporal window:       {WINDOW}")
print(f"Persistence window:    {PERSISTENCE_WINDOW}")
print(f"Required anomalies:    {MIN_ANOMALIES}")
print(f"Base threshold:        {threshold:.4f}")

print("\n--- Original Temporal IF ---")

print(
    f"Predicted anomalies: "
    f"{point_anomaly.sum()}"
)

print(
    f"Precision: {precision_point:.4f}"
)

print(
    f"Recall:    {recall_point:.4f}"
)

print(
    f"F1 Score:  {f1_point:.4f}"
)


print("\n--- Persistence Filter ---")

print(
    f"Predicted anomalies: "
    f"{persistent_anomaly.sum()}"
)

print(
    f"Precision: {precision_persistent:.4f}"
)

print(
    f"Recall:    {recall_persistent:.4f}"
)

print(
    f"F1 Score:  {f1_persistent:.4f}"
)

print(
    f"PR-AUC:    {pr_auc:.4f}"
)