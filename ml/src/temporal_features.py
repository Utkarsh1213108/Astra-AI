import numpy as np
import pandas as pd


def create_temporal_features(data, window=20):
    """
    Create temporal features from multivariate telemetry data.

    Features:
    1. Rolling mean
    2. Rolling standard deviation
    3. Change from previous timestep
    4. Difference from rolling mean
    5. Short-term trend
    """

    df = pd.DataFrame(data)

    features = []

    # 1. Rolling mean
    rolling_mean = df.rolling(window=window, min_periods=1).mean()
    features.append(rolling_mean.add_suffix("_mean"))

    # 2. Rolling standard deviation
    rolling_std = df.rolling(window=window, min_periods=2).std()
    rolling_std = rolling_std.fillna(0)
    features.append(rolling_std.add_suffix("_std"))

    # 3. Change from previous timestep
    difference = df.diff().fillna(0)
    features.append(difference.add_suffix("_diff"))

    # 4. Difference from rolling mean
    deviation = df - rolling_mean
    features.append(deviation.add_suffix("_deviation"))

    # 5. Short-term trend
    trend = df.diff(periods=5).fillna(0)
    features.append(trend.add_suffix("_trend"))

    # Combine everything
    result = pd.concat(features, axis=1)

    return result.to_numpy()


if __name__ == "__main__":

    # Load P-1 training data
    train = np.load(
        "ml/data/raw/data/data/train/P-1.npy"
    )

    print("Original shape:", train.shape)

    # Use only active channels
    active_channels = np.any(train != 0, axis=0)
    train = train[:, active_channels]

    # Create temporal features
    temporal_data = create_temporal_features(train)

    print("Temporal feature shape:", temporal_data.shape)
    print("Temporal features created successfully!")