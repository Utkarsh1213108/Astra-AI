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


# ============================================================
# 1. Load P-1 data
# ============================================================

train = np.load(
    f"{BASE}/train/P-1.npy"
)

test = np.load(
    f"{BASE}/test/P-1.npy"
)


# ============================================================
# 2. Use common active channels
# ============================================================

train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(
    train_active & test_active
)[0]

train = train[:, channels]
test = test[:, channels]

print("Channels used:", len(channels))
print("Train shape:", train.shape)
print("Test shape:", test.shape)


# ============================================================
# 3. Temporal features
# ============================================================

train_temporal = create_temporal_features(
    train,
    window=WINDOW
)

test_temporal = create_temporal_features(
    test,
    window=WINDOW
)


# ============================================================
# 4. Temporal Isolation Forest
# ============================================================

temporal_model = IsolationForest(
    n_estimators=200,
    contamination="auto",
    random_state=42,
    n_jobs=-1
)

temporal_model.fit(train_temporal)

temporal_score = -temporal_model.decision_function(
    test_temporal
)


# ============================================================
# 5. Contextual detector
# ============================================================

# Rolling mean
train_df = pd.DataFrame(train)
test_df = pd.DataFrame(test)

train_mean = (
    train_df
    .rolling(WINDOW)
    .mean()
    .bfill()
)

test_mean = (
    test_df
    .rolling(WINDOW)
    .mean()
    .bfill()
)

# Rolling standard deviation
train_std = (
    train_df
    .rolling(WINDOW)
    .std()
    .bfill()
    .fillna(0)
)

test_std = (
    test_df
    .rolling(WINDOW)
    .std()
    .bfill()
    .fillna(0)
)

# Contextual deviation
train_context = (
    (train_df - train_mean) /
    (train_std + 1e-6)
)

test_context = (
    (test_df - test_mean) /
    (test_std + 1e-6)
)

train_context = train_context.replace(
    [np.inf, -np.inf],
    0
)

test_context = test_context.replace(
    [np.inf, -np.inf],
    0
)

context_model = IsolationForest(
    n_estimators=200,
    contamination="auto",
    random_state=42,
    n_jobs=-1
)

context_model.fit(
    train_context
)

context_score = -context_model.decision_function(
    test_context
)


# ============================================================
# 6. Normalise both scores
# ============================================================

def minmax_scale(score):

    minimum = score.min()
    maximum = score.max()

    return (
        (score - minimum) /
        (maximum - minimum + 1e-8)
    )


temporal_normalised = minmax_scale(
    temporal_score
)

context_normalised = minmax_scale(
    context_score
)


# ============================================================
# 7. Combine scores
# ============================================================

combined_score = (
    0.5 * temporal_normalised +
    0.5 * context_normalised
)


# ============================================================
# 8. Threshold
# ============================================================

threshold = np.percentile(
    combined_score,
    90
)

predicted = (
    combined_score >= threshold
)


# ============================================================
# 9. NASA ground truth
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
# 10. Metrics
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
    combined_score
)


# ============================================================
# 11. Results
# ============================================================

print("\n======================================")
print(" ASTRA: ENSEMBLE DETECTOR")
print("======================================")

print("Temporal weight:  0.50")
print("Contextual weight: 0.50")

print(
    f"Threshold: {threshold:.4f}"
)

print(
    f"Predicted anomalies: {predicted.sum()}"
)

print(
    f"Actual anomalies:    {y_true.sum()}"
)

print(
    f"Precision: {precision:.4f}"
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