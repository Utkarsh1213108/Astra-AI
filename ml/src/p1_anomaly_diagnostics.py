import numpy as np
import pandas as pd
import ast


BASE = "ml/data/raw/data/data"


# --------------------------------------------------
# 1. Load train and test data
# --------------------------------------------------

train = np.load(
    f"{BASE}/train/P-1.npy"
)

test = np.load(
    f"{BASE}/test/P-1.npy"
)


# --------------------------------------------------
# 2. Use ONLY channels present in both datasets
# --------------------------------------------------

train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(
    train_active & test_active
)[0]

test = test[:, channels]


print("\n=== P-1 CORRECTED ANOMALY DIAGNOSTICS ===")
print(f"Common channels analysed: {len(channels)}")
print(f"Channel indices: {channels.tolist()}")


# --------------------------------------------------
# 3. Load NASA anomaly labels
# --------------------------------------------------

labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[
    labels.chan_id == "P-1"
].iloc[0]

intervals = ast.literal_eval(
    row.anomaly_sequences
)


# --------------------------------------------------
# 4. Create anomaly mask
# --------------------------------------------------

anomaly_mask = np.zeros(
    len(test),
    dtype=bool
)

for start, end in intervals:
    anomaly_mask[start:end + 1] = True


normal = test[~anomaly_mask]
anomalous = test[anomaly_mask]


print(f"Normal points: {len(normal)}")
print(f"Anomalous points: {len(anomalous)}")


# --------------------------------------------------
# 5. Compare channels
# --------------------------------------------------

results = []

for i, channel in enumerate(channels):

    normal_mean = normal[:, i].mean()
    anomaly_mean = anomalous[:, i].mean()

    normal_std = normal[:, i].std()
    anomaly_std = anomalous[:, i].std()

    mean_difference = abs(
        anomaly_mean - normal_mean
    )

    std_difference = abs(
        anomaly_std - normal_std
    )

    # Pooled standard deviation
    pooled_std = np.sqrt(
        (
            normal_std ** 2
            +
            anomaly_std ** 2
        ) / 2
    )

    if pooled_std > 0:
        standardised_mean_change = (
            mean_difference / pooled_std
        )
    else:
        standardised_mean_change = 0

    results.append({
        "channel": int(channel),
        "normal_mean": normal_mean,
        "anomaly_mean": anomaly_mean,
        "normal_std": normal_std,
        "anomaly_std": anomaly_std,
        "mean_difference": mean_difference,
        "std_difference": std_difference,
        "standardised_mean_change":
            standardised_mean_change
    })


df = pd.DataFrame(results)


# --------------------------------------------------
# 6. Rank by standardised mean change
# --------------------------------------------------

print("\n--- Ranked by standardised mean change ---")

print(
    df.sort_values(
        "standardised_mean_change",
        ascending=False
    ).to_string(index=False)
)


# --------------------------------------------------
# 7. Rank by standard deviation change
# --------------------------------------------------

print("\n--- Ranked by standard deviation change ---")

print(
    df.sort_values(
        "std_difference",
        ascending=False
    ).to_string(index=False)
)