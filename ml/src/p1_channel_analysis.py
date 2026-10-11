import numpy as np
import pandas as pd
import ast
import matplotlib.pyplot as plt


BASE = "ml/data/raw/data/data"

# Load P-1 test data
test = np.load(
    f"{BASE}/test/P-1.npy"
)

# Load NASA labels
labels = pd.read_csv(
    "ml/data/raw/labeled_anomalies.csv"
)

row = labels[
    labels.chan_id == "P-1"
].iloc[0]

intervals = ast.literal_eval(
    row.anomaly_sequences
)


# Channels we want to inspect
channels = [0, 12, 13, 14, 9]


# Create one plot for each channel
for channel in channels:

    plt.figure(figsize=(14, 4))

    plt.plot(
        test[:, channel],
        linewidth=0.8
    )

    # Shade NASA-labelled anomalies
    for start, end in intervals:
        plt.axvspan(
            start,
            end,
            alpha=0.25
        )

    plt.xlabel("Time step")
    plt.ylabel("Telemetry value")

    plt.title(
        f"P-1 Channel {channel} — "
        f"NASA-labelled anomalies"
    )

    plt.tight_layout()

    plt.savefig(
        f"ml/results/p1_channel_{channel}.png",
        dpi=150
    )

    plt.close()

    print(
        f"Saved: ml/results/p1_channel_{channel}.png"
    )