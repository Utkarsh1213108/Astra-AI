import numpy as np
import pandas as pd
import ast
import matplotlib.pyplot as plt

BASE = "ml/data/raw/data/data"

# Load S-1
test = np.load(f"{BASE}/test/S-1.npy")

active_channels = np.any(test != 0, axis=0)
channels = np.where(active_channels)[0]
test = test[:, channels]

# NASA labels
labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[labels.chan_id == "S-1"].iloc[0]
intervals = ast.literal_eval(row.anomaly_sequences)

# Baseline
baseline_end = 5000
baseline = test[:baseline_end]

baseline_mean = baseline.mean(axis=0)
baseline_std = baseline.std(axis=0)
baseline_std[baseline_std < 1e-6] = 1e-6

# Rolling score
window = 50
scores = np.zeros(len(test))

for t in range(window, len(test)):

    current_window = test[t - window:t]

    rolling_mean = current_window.mean(axis=0)
    rolling_std = current_window.std(axis=0)

    mean_change = (
        np.abs(rolling_mean - baseline_mean)
        / baseline_std
    )

    std_change = (
        np.abs(rolling_std - baseline_std)
        / baseline_std
    )

    channel_score = mean_change + std_change

    scores[t] = np.mean(channel_score)

# Threshold
threshold = np.percentile(
    scores[window:baseline_end],
    99
)

# Plot
plt.figure(figsize=(14, 5))

plt.plot(
    scores,
    label="Adaptive anomaly score"
)

plt.axhline(
    threshold,
    linestyle="--",
    label=f"Threshold = {threshold:.3f}"
)

for start, end in intervals:
    plt.axvspan(
        start,
        end,
        alpha=0.25
    )

plt.xlabel("Time step")
plt.ylabel("Adaptive anomaly score")
plt.title("S-1 Adaptive Change Detector")

plt.legend()
plt.tight_layout()

plt.savefig(
    "ml/results/s1_adaptive_detector.png",
    dpi=150
)

print(
    "Saved: ml/results/s1_adaptive_detector.png"
)