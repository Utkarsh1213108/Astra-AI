import numpy as np
import pandas as pd
import ast

from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score
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
# 6. Load NASA ground truth
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
# 7. Test multiple thresholds
# ============================================================

percentiles = [
    70,
    72.5,
    75,
    77.5,
    80,
    82.5,
    85
]

results = []


for percentile in percentiles:

    threshold = np.percentile(
        anomaly_score,
        percentile
    )

    predicted = (
        anomaly_score >= threshold
    )

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

    results.append({
        "Percentile": percentile,
        "Threshold": threshold,
        "Predicted": predicted.sum(),
        "Precision": precision,
        "Recall": recall,
        "F1": f1
    })


# ============================================================
# 8. Display results
# ============================================================

results_df = pd.DataFrame(results)

print("\n======================================")
print(" ASTRA: THRESHOLD ANALYSIS")
print("======================================")

print(
    results_df.to_string(
        index=False,
        formatters={
            "Threshold": "{:.4f}".format,
            "Precision": "{:.4f}".format,
            "Recall": "{:.4f}".format,
            "F1": "{:.4f}".format
        }
    )
)


# ============================================================
# 9. Best F1 threshold
# ============================================================

best = results_df.loc[
    results_df["F1"].idxmax()
]

print("\n======================================")
print(" BEST F1 THRESHOLD")
print("======================================")

print(
    f"Percentile: {best['Percentile']}"
)

print(
    f"Threshold:  {best['Threshold']:.4f}"
)

print(
    f"Predicted:  {int(best['Predicted'])}"
)

print(
    f"Precision:  {best['Precision']:.4f}"
)

print(
    f"Recall:     {best['Recall']:.4f}"
)

print(
    f"F1 Score:   {best['F1']:.4f}"
)