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


# --------------------------------------------------
# 1. Load P-1 training and test data
# --------------------------------------------------

train = np.load(f"{BASE}/train/P-1.npy")
test = np.load(f"{BASE}/test/P-1.npy")


# --------------------------------------------------
# 2. Use only channels present in both datasets
# --------------------------------------------------

train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(train_active & test_active)[0]

train = train[:, channels]
test = test[:, channels]


print("Channels used:", len(channels))
print("Train shape:", train.shape)
print("Test shape:", test.shape)


# --------------------------------------------------
# 3. Create temporal features
# --------------------------------------------------

train_features = create_temporal_features(train, window=20)
test_features = create_temporal_features(test, window=20)

print("Temporal train shape:", train_features.shape)
print("Temporal test shape:", test_features.shape)


# --------------------------------------------------
# 4. Train Isolation Forest
# --------------------------------------------------

model = IsolationForest(
    n_estimators=200,
    contamination="auto",
    random_state=42,
    n_jobs=-1
)

model.fit(train_features)


# --------------------------------------------------
# 5. Calculate anomaly scores
# --------------------------------------------------

decision_score = model.decision_function(test_features)

anomaly_score = -decision_score


# --------------------------------------------------
# 6. Select threshold
# --------------------------------------------------

threshold = np.percentile(anomaly_score, 90)

predicted = anomaly_score >= threshold


# --------------------------------------------------
# 7. Load NASA ground-truth labels
# --------------------------------------------------

labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[labels.chan_id == "P-1"].iloc[0]

intervals = ast.literal_eval(
    row.anomaly_sequences
)


# --------------------------------------------------
# 8. Create true labels
# --------------------------------------------------

y_true = np.zeros(len(test), dtype=int)

for start, end in intervals:
    y_true[start:end + 1] = 1


# --------------------------------------------------
# 9. Evaluate model
# --------------------------------------------------

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


# --------------------------------------------------
# 10. Print results
# --------------------------------------------------

print("\n=== ASTRA: Temporal Isolation Forest ===")

print(f"Window size: 20")
print(f"Trees: 200")
print(f"Threshold percentile: 90")

print(f"Test points: {len(test)}")
print(f"Predicted anomalies: {predicted.sum()}")
print(f"Actual anomalous points: {y_true.sum()}")

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")