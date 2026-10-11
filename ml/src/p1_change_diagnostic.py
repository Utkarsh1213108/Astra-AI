import numpy as np

BASE = "ml/data/raw/data/data"

test = np.load(f"{BASE}/test/P-1.npy")

train = np.load(f"{BASE}/train/P-1.npy")

# Use common train/test channels
train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(train_active & test_active)[0]
test = test[:, channels]

print("\n=== ASTRA: P-1 CHANGE-POINT DIAGNOSTIC ===")
print(f"Channels: {len(channels)}")
print(f"Test shape: {test.shape}")


def analyse_region(name, start, end, window=100):

    before = test[start-window:start]
    after = test[end:end+window]

    before_mean = np.mean(before, axis=0)
    after_mean = np.mean(after, axis=0)

    before_std = np.std(before, axis=0)
    after_std = np.std(after, axis=0)

    mean_change = np.abs(after_mean - before_mean)
    std_change = np.abs(after_std - before_std)

    print(f"\n{'='*60}")
    print(name)
    print(f"Before: {start-window} → {start}")
    print(f"After:  {end} → {end+window}")
    print(f"{'='*60}")

    # Largest mean changes
    top_mean = np.argsort(mean_change)[::-1][:5]

    print("\nTop 5 mean changes:")

    for ch in top_mean:
        print(
            f"Channel {channels[ch]:2d} | "
            f"Before mean {before_mean[ch]: .4f} | "
            f"After mean {after_mean[ch]: .4f} | "
            f"Change {mean_change[ch]: .4f}"
        )

    # Largest std changes
    top_std = np.argsort(std_change)[::-1][:5]

    print("\nTop 5 std changes:")

    for ch in top_std:
        print(
            f"Channel {channels[ch]:2d} | "
            f"Before std {before_std[ch]: .4f} | "
            f"After std {after_std[ch]: .4f} | "
            f"Change {std_change[ch]: .4f}"
        )


# Strong false-positive region
analyse_region(
    "Detector peak around 1300",
    1300,
    1340
)

# NASA anomaly 1
analyse_region(
    "NASA anomaly 1",
    2149,
    2350
)

# NASA anomaly 2
analyse_region(
    "NASA anomaly 2",
    3539,
    3780
)

# NASA anomaly 3
analyse_region(
    "NASA anomaly 3",
    4536,
    4845
)