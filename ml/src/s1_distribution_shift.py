import numpy as np
import pandas as pd

BASE = "ml/data/raw/data/data"

# Load S-1
train = np.load(f"{BASE}/train/S-1.npy")
test = np.load(f"{BASE}/test/S-1.npy")

# Keep channels active in both train and test
train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(train_active & test_active)[0]

train = train[:, channels]
test = test[:, channels]

print("\n=== S-1 DISTRIBUTION SHIFT ANALYSIS ===")
print(f"Channels analysed: {len(channels)}")
print(f"Train shape: {train.shape}")
print(f"Test shape: {test.shape}")

# Compare overall statistics
rows = []

for i, ch in enumerate(channels):

    train_mean = train[:, i].mean()
    test_mean = test[:, i].mean()

    train_std = train[:, i].std()
    test_std = test[:, i].std()

    mean_shift = abs(test_mean - train_mean)
    std_shift = abs(test_std - train_std)

    rows.append({
        "channel": ch,
        "train_mean": train_mean,
        "test_mean": test_mean,
        "train_std": train_std,
        "test_std": test_std,
        "mean_shift": mean_shift,
        "std_shift": std_shift
    })

df = pd.DataFrame(rows)

print("\n--- Channels with largest mean shift ---")

print(
    df.sort_values(
        "mean_shift",
        ascending=False
    ).head(10).to_string(index=False)
)

print("\n--- Channels with largest std shift ---")

print(
    df.sort_values(
        "std_shift",
        ascending=False
    ).head(10).to_string(index=False)
)

# Compare test before and during NASA anomaly
normal_test = test[:5300]
anomaly_test = test[5300:5748]

rows = []

for i, ch in enumerate(channels):

    normal_mean = normal_test[:, i].mean()
    anomaly_mean = anomaly_test[:, i].mean()

    normal_std = normal_test[:, i].std()
    anomaly_std = anomaly_test[:, i].std()

    rows.append({
        "channel": ch,
        "normal_mean": normal_mean,
        "anomaly_mean": anomaly_mean,
        "normal_std": normal_std,
        "anomaly_std": anomaly_std,
        "mean_change": abs(anomaly_mean - normal_mean),
        "std_change": abs(anomaly_std - normal_std)
    })

anomaly_df = pd.DataFrame(rows)

print("\n--- Changes inside NASA-labelled anomaly ---")

print(
    anomaly_df.sort_values(
        "std_change",
        ascending=False
    ).head(10).to_string(index=False)
)

print("\n=== ANALYSIS COMPLETE ===")