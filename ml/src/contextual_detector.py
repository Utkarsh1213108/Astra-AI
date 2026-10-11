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

WINDOW = 20


# ============================================================
# 1. Load P-1 train and test data
# ============================================================

train = np.load(
    f"{BASE}/train/P-1.npy"
)

test = np.load(
    f"{BASE}/test/P-1.npy"
)


# ============================================================
# 2. Use only channels present in BOTH datasets
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
# 3. Standardise using TRAINING statistics
# ============================================================

mean = train.mean(axis=0)
std = train.std(axis=0)

std[std == 0] = 1.0

train_scaled = (train - mean) / std
test_scaled = (test - mean) / std


# ============================================================
# 4. Calculate normal local behaviour from TRAIN
# ============================================================

train_df = pd.DataFrame(train_scaled)

rolling_mean_train = (
    train_df
    .rolling(WINDOW)
    .mean()
)

rolling_std_train = (
    train_df
    .rolling(WINDOW)
    .std()
)


# Remove initial incomplete windows
rolling_mean_train = rolling_mean_train.dropna()
rolling_std_train = rolling_std_train.dropna()


# ============================================================
# 5. Define normal operating limits
# ============================================================

normal_mean = rolling_mean_train.mean().to_numpy()
normal_std = rolling_mean_train.std().to_numpy()

normal_std[normal_std == 0] = 1.0


# ============================================================
# 6. Calculate LOCAL behaviour on TEST
# ============================================================

test_df = pd.DataFrame(test_scaled)

local_mean = (
    test_df
    .rolling(WINDOW)
    .mean()
)

local_std = (
    test_df
    .rolling(WINDOW)
    .std()
)


# ============================================================
# 7. Contextual anomaly score
# ============================================================

# Difference between current local mean
# and normal training behaviour

mean_score = np.abs(
    (
        local_mean
        - normal_mean
    )
    / normal_std
)


# Difference in local volatility

std_score = np.abs(
    (
        local_std
        - train_df.std().to_numpy()
    )
    / (
        train_df.std().to_numpy()
        + 1e-8
    )
)


# Replace invalid values
mean_score = mean_score.fillna(0)
std_score = std_score.fillna(0)


# Combine the two contextual signals

anomaly_score = (
    mean_score.mean(axis=1)
    +
    std_score.mean(axis=1)
)


anomaly_score = anomaly_score.to_numpy()


# ============================================================
# 8. Load NASA ground-truth labels
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


# ============================================================
# 9. Create true labels
# ============================================================

y_true = np.zeros(
    len(test),
    dtype=int
)

for start, end in intervals:
    y_true[start:end + 1] = 1


# ============================================================
# 10. Choose threshold using TRAINING distribution
# ============================================================

train_mean_score = (
    np.abs(
        (
            rolling_mean_train
            - normal_mean
        )
        / normal_std
    ).mean(axis=1)
)

train_std_score = (
    np.abs(
        (
            rolling_std_train
            - train_df.std().to_numpy()
        )
        / (
            train_df.std().to_numpy()
            + 1e-8
        )
    ).mean(axis=1)
)

train_context_score = (
    train_mean_score
    +
    train_std_score
).to_numpy()


threshold = np.percentile(
    train_context_score,
    95
)


# ============================================================
# 11. Predict anomalies
# ============================================================

predicted = (
    anomaly_score >= threshold
)


# ============================================================
# 12. Evaluate
# ============================================================

valid_start = WINDOW - 1

precision = precision_score(
    y_true[valid_start:],
    predicted[valid_start:],
    zero_division=0
)

recall = recall_score(
    y_true[valid_start:],
    predicted[valid_start:],
    zero_division=0
)

f1 = f1_score(
    y_true[valid_start:],
    predicted[valid_start:],
    zero_division=0
)

pr_auc = average_precision_score(
    y_true[valid_start:],
    anomaly_score[valid_start:]
)


# ============================================================
# 13. Results
# ============================================================

print("\n======================================")
print(" ASTRA: CONTEXTUAL DETECTOR")
print("======================================")

print(f"Window size: {WINDOW}")
print(f"Threshold:   {threshold:.4f}")

print(
    f"\nPredicted anomalies: "
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