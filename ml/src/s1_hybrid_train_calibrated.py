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

# Use only channels active in BOTH train and test
train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(train_active & test_active)[0]

train = train[:, channels]
test = test[:, channels]

print("\n=== ASTRA: S-1 TRAIN-CALIBRATED HYBRID ===")
print(f"Channels used: {len(channels)}")
print(f"Train shape: {train.shape}")
print(f"Test shape:  {test.shape}")


# ============================================================
# PARAMETERS
# ============================================================

WINDOW = 50
CHANGE_WINDOW = 100


# ============================================================
# PERCENTILE NORMALISATION
# ============================================================

def percentile_normalise(scores, reference_scores):

    reference_scores = np.sort(reference_scores)

    ranks = np.searchsorted(
        reference_scores,
        scores,
        side="right"
    )

    return ranks / len(reference_scores)


# ============================================================
# LOCAL TEMPORAL SCORE
# ============================================================

def calculate_local_scores(data, window):

    scores = np.zeros(len(data))

    for t in range(window, len(data)):

        context = data[t - window:t]
        current = data[t]

        context_mean = np.mean(
            context,
            axis=0
        )

        context_std = np.std(
            context,
            axis=0
        )

        context_std[
            context_std < 0.01
        ] = 0.01

        deviation = np.abs(
            current - context_mean
        ) / context_std

        scores[t] = np.mean(deviation)

    return scores


# ============================================================
# CONTEXTUAL SCORE
# ============================================================

def calculate_contextual_scores(
    data,
    reference_mean,
    reference_std,
    window
):

    scores = np.zeros(len(data))

    for t in range(window, len(data)):

        context = data[t - window:t]

        context_mean = np.mean(
            context,
            axis=0
        )

        context_std = np.std(
            context,
            axis=0
        )

        context_std[
            context_std < 0.01
        ] = 0.01

        local_deviation = np.abs(
            data[t] - context_mean
        ) / context_std

        contextual_shift = np.abs(
            context_mean - reference_mean
        ) / reference_std

        scores[t] = np.mean(
            0.5 * local_deviation +
            0.5 * contextual_shift
        )

    return scores


# ============================================================
# ROBUST CHANGE-POINT SCORE
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
# TRAIN DISTRIBUTION
# ============================================================

train_mean = np.mean(
    train,
    axis=0
)

train_std = np.std(
    train,
    axis=0
)

train_std[
    train_std < 0.01
] = 0.01


# ============================================================
# TRAIN SCORES
# ============================================================

print("\nCalculating training scores...")

train_local = calculate_local_scores(
    train,
    WINDOW
)

train_contextual = calculate_contextual_scores(
    train,
    train_mean,
    train_std,
    WINDOW
)

train_change = calculate_change_scores(
    train,
    CHANGE_WINDOW
)


# ============================================================
# VALID TRAINING REGION
# ============================================================

train_valid_start = max(
    WINDOW,
    CHANGE_WINDOW
)

train_valid_end = (
    len(train) - CHANGE_WINDOW
)

train_local_reference = train_local[
    train_valid_start:train_valid_end
]

train_contextual_reference = train_contextual[
    train_valid_start:train_valid_end
]

train_change_reference = train_change[
    train_valid_start:train_valid_end
]


# ============================================================
# NORMALISE TRAIN SCORES
# ============================================================

train_local_norm = percentile_normalise(
    train_local,
    train_local_reference
)

train_contextual_norm = percentile_normalise(
    train_contextual,
    train_contextual_reference
)

train_change_norm = percentile_normalise(
    train_change,
    train_change_reference
)


# ============================================================
# TRAIN HYBRID
# ============================================================

train_hybrid = (
    train_local_norm +
    train_contextual_norm +
    train_change_norm
) / 3

train_hybrid_reference = train_hybrid[
    train_valid_start:train_valid_end
]


# ============================================================
# TEST SCORES
# ============================================================

print("Calculating unseen test scores...")

test_local = calculate_local_scores(
    test,
    WINDOW
)

test_contextual = calculate_contextual_scores(
    test,
    train_mean,
    train_std,
    WINDOW
)

test_change = calculate_change_scores(
    test,
    CHANGE_WINDOW
)


# ============================================================
# NORMALISE TEST USING TRAINING DISTRIBUTION
# ============================================================

test_local_norm = percentile_normalise(
    test_local,
    train_local_reference
)

test_contextual_norm = percentile_normalise(
    test_contextual,
    train_contextual_reference
)

test_change_norm = percentile_normalise(
    test_change,
    train_change_reference
)


# ============================================================
# TEST HYBRID
# ============================================================

test_hybrid = (
    test_local_norm +
    test_contextual_norm +
    test_change_norm
) / 3


# ============================================================
# THRESHOLD — TRAIN ONLY
# ============================================================

threshold = np.percentile(
    train_hybrid_reference,
    95
)

predicted = test_hybrid >= threshold


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
    test_hybrid
)


# ============================================================
# RESULTS
# ============================================================

print("\n========================================")
print("TRAIN-CALIBRATED HYBRID RESULTS")
print("========================================")

print(f"Local window:        {WINDOW}")
print(f"Change-point window: {CHANGE_WINDOW}")
print("Detector weights:    1/3 each")

print(
    "\nCalibration source:   TRAIN DATA ONLY"
)

print(
    f"Training threshold:  {threshold:.4f}"
)

print(
    f"\nPredicted anomalies: {predicted.sum()}"
)

print(
    f"Actual anomalies:    {y_true.sum()}"
)

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")


# ============================================================
# NASA INTERVALS
# ============================================================

print("\nNASA anomaly intervals:")

for start, end in intervals:

    print(
        f"[{start}, {end}]"
    )


# ============================================================
# TOP 20
# ============================================================

top_indices = np.argsort(
    test_hybrid
)[-20:][::-1]

print(
    "\nTop 20 test anomaly points:"
)

for idx in top_indices:

    print(
        f"Time {idx:4d} | "
        f"Hybrid {test_hybrid[idx]:.4f} | "
        f"Local {test_local_norm[idx]:.3f} | "
        f"Context {test_contextual_norm[idx]:.3f} | "
        f"Change {test_change_norm[idx]:.3f}"
    )