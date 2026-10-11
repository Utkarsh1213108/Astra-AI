import numpy as np


def calculate_change_scores(
    telemetry,
    window=100
):
    """
    Calculate robust change-point scores.

    Parameters
    ----------
    telemetry : np.ndarray
        Shape: (time_steps, channels)

    window : int
        Number of points used on each side
        of a potential change point.

    Returns
    -------
    scores : np.ndarray
        Change-point score for every time step.
    """

    scores = np.zeros(len(telemetry))

    for t in range(
        window,
        len(telemetry) - window
    ):

        left = telemetry[
            t - window:t
        ]

        right = telemetry[
            t:t + window
        ]

        # Mean of each channel
        left_mean = np.mean(
            left,
            axis=0
        )

        right_mean = np.mean(
            right,
            axis=0
        )

        # Standard deviation of each channel
        left_std = np.std(
            left,
            axis=0
        )

        right_std = np.std(
            right,
            axis=0
        )

        # Distribution changes
        mean_change = np.abs(
            right_mean - left_mean
        )

        std_change = np.abs(
            right_std - left_std
        )

        # Robust scaling
        scale = np.maximum(
            (left_std + right_std) / 2,
            0.01
        )

        # Channel-level score
        channel_score = (
            mean_change + std_change
        ) / scale

        # Average across channels
        scores[t] = np.mean(
            channel_score
        )

    return scores


def detect_change_points(
    telemetry,
    threshold,
    window=100
):
    """
    Detect change points using a fixed threshold.

    Parameters
    ----------
    telemetry : np.ndarray
        Telemetry matrix.

    threshold : float
        Threshold calibrated from training data.

    window : int
        Change-point window.

    Returns
    -------
    scores : np.ndarray
        Change-point scores.

    predicted : np.ndarray
        Binary anomaly predictions.
    """

    scores = calculate_change_scores(
        telemetry,
        window
    )

    predicted = (
        scores >= threshold
    )

    return scores, predicted


if __name__ == "__main__":

    # Simple test using S-1 test telemetry
    BASE = "ml/data/raw/data/data"

    train = np.load(
        f"{BASE}/train/S-1.npy"
    )

    test = np.load(
        f"{BASE}/test/S-1.npy"
    )

    # Common channels
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

    test = test[:, channels]

    # Threshold learned previously
    threshold = 0.9524

    scores, predicted = detect_change_points(
        test,
        threshold=threshold,
        window=100
    )

    print(
        "\n=== ASTRA REUSABLE CHANGE-POINT DETECTOR ==="
    )

    print(
        f"Channels: {len(channels)}"
    )

    print(
        f"Window: 100"
    )

    print(
        f"Threshold: {threshold}"
    )

    print(
        f"Detected change points: "
        f"{predicted.sum()}"
    )

    print(
        "\nTop 10 change points:"
    )

    top = np.argsort(
        scores
    )[-10:][::-1]

    for idx in top:

        print(
            f"Time {idx:4d} | "
            f"Score {scores[idx]:.4f}"
        )