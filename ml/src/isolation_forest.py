import numpy as np
import pandas as pd
import ast
from sklearn.ensemble import IsolationForest
from sklearn.metrics import precision_score, recall_score, f1_score, average_precision_score

BASE = "ml/data/raw/data/data"

# Load data
train = np.load(f"{BASE}/train/P-1.npy")
test = np.load(f"{BASE}/test/P-1.npy")

# Use channels active in both train and test
train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)
channels = np.where(train_active & test_active)[0]

train = train[:, channels]
test = test[:, channels]

# Train Isolation Forest only on normal TRAIN telemetry
model = IsolationForest(
    n_estimators=200,
    contamination="auto",
    random_state=42,
    n_jobs=-1
)

model.fit(train)

# Isolation Forest: lower decision_function = more anomalous
decision_score = model.decision_function(test)
anomaly_score = -decision_score

# Convert scores to binary predictions
threshold = np.percentile(anomaly_score, 90)
predicted = anomaly_score >= threshold

# Ground truth
labels = pd.read_csv("ml/data/raw/labeled_anomalies.csv")
row = labels[labels.chan_id == "P-1"].iloc[0]
intervals = ast.literal_eval(row.anomaly_sequences)

y_true = np.zeros(len(test), dtype=int)

for start, end in intervals:
    y_true[start:end + 1] = 1

# Metrics
precision = precision_score(y_true, predicted, zero_division=0)
recall = recall_score(y_true, predicted, zero_division=0)
f1 = f1_score(y_true, predicted, zero_division=0)
pr_auc = average_precision_score(y_true, anomaly_score)

print("\n=== ASTRA Baseline #2: Isolation Forest ===")
print(f"Channels used: {len(channels)}")
print(f"Trees: 200")
print(f"Test points: {len(test)}")
print(f"Threshold percentile: 90")
print(f"Predicted anomalies: {predicted.sum()}")
print(f"Actual anomalous points: {y_true.sum()}")
print(f"Precision: {precision:.4f}")
print(f"Recall: {recall:.4f}")
print(f"F1 Score: {f1:.4f}")
print(f"PR-AUC: {pr_auc:.4f}")
