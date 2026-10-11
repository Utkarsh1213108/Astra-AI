from pathlib import Path
import json

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ============================================================
# APP CONFIGURATION
# ============================================================

app = FastAPI(
    title="ASTRA AI Anomaly Detection API",
    description="Real ML-powered spacecraft telemetry anomaly detection",
    version="1.0.0",
)


# Allow the ASTRA frontend to communicate with the ML API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent


CONFIG_PATH = (
    BASE_DIR
    / "models"
    / "s1_change_point_config.json"
)


# ============================================================
# LOAD MODEL CONFIGURATION
# ============================================================

if not CONFIG_PATH.exists():
    raise FileNotFoundError(
        f"Model configuration not found: {CONFIG_PATH}"
    )


with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)


WINDOW = int(CONFIG["window"])
THRESHOLD = float(CONFIG["threshold"])


# ============================================================
# NASA S-1 CHANNELS
# ============================================================

# These are the 18 channels used during validation.
CHANNELS = [
    0,
    1,
    2,
    3,
    5,
    6,
    7,
    8,
    9,
    11,
    12,
    13,
    14,
    17,
    18,
    19,
    21,
    22,
]


# ============================================================
# REQUEST MODEL
# ============================================================

class TelemetryRequest(BaseModel):
    telemetry: list[list[float]]


# ============================================================
# CHANGE-POINT DETECTOR
# ============================================================

def calculate_change_scores(
    data: np.ndarray,
    window: int,
) -> np.ndarray:

    scores = np.zeros(len(data))

    for t in range(
        window,
        len(data) - window,
    ):

        left = data[
            t - window:t
        ]

        right = data[
            t:t + window
        ]

        left_mean = np.mean(
            left,
            axis=0,
        )

        right_mean = np.mean(
            right,
            axis=0,
        )

        left_std = np.std(
            left,
            axis=0,
        )

        right_std = np.std(
            right,
            axis=0,
        )

        mean_change = np.abs(
            right_mean - left_mean
        )

        std_change = np.abs(
            right_std - left_std
        )

        scale = np.maximum(
            (left_std + right_std) / 2,
            0.01,
        )

        score_per_channel = (
            mean_change + std_change
        ) / scale

        scores[t] = np.mean(
            score_per_channel
        )

    return scores


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "service": "ASTRA AI Anomaly Detection API",
        "status": "online",
        "detector": "S-1 Train-Calibrated Change-Point",
        "dataset": "NASA SMAP S-1",
        "window": WINDOW,
        "threshold": THRESHOLD,
        "channels": len(CHANNELS),
    }


# ============================================================
# GENERIC TELEMETRY DETECTION
# ============================================================

@app.post("/detect")
def detect(request: TelemetryRequest):

    telemetry = np.asarray(
        request.telemetry,
        dtype=float,
    )

    if telemetry.ndim != 2:

        raise HTTPException(
            status_code=400,
            detail="Telemetry must be a 2D array.",
        )

    if len(telemetry) < WINDOW * 2:

        raise HTTPException(
            status_code=400,
            detail=(
                f"At least {WINDOW * 2} telemetry "
                "points are required."
            ),
        )

    # --------------------------------------------------------
    # Accept either:
    #
    # 1. Full NASA 25-channel telemetry
    # 2. Already-selected 18 channels
    # --------------------------------------------------------

    if telemetry.shape[1] == 25:

        telemetry = telemetry[:, CHANNELS]

    elif telemetry.shape[1] == len(CHANNELS):

        pass

    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Telemetry must contain either "
                f"25 channels or {len(CHANNELS)} "
                "selected channels."
            ),
        )

    # --------------------------------------------------------
    # Calculate ML anomaly scores
    # --------------------------------------------------------

    scores = calculate_change_scores(
        telemetry,
        WINDOW,
    )

    anomaly_mask = scores >= THRESHOLD

    detected_indices = np.where(
        anomaly_mask
    )[0].tolist()

    # --------------------------------------------------------
    # Remove invalid warm-up / ending regions
    # --------------------------------------------------------

    valid_start = WINDOW
    valid_end = len(telemetry) - WINDOW

    detected_indices = [
        int(i)
        for i in detected_indices
        if valid_start <= i < valid_end
    ]

    # --------------------------------------------------------
    # Current point = latest valid telemetry point
    # --------------------------------------------------------

    current_index = valid_end - 1

    current_score = float(
        scores[current_index]
    )

    return {
        "anomaly": bool(
            current_score >= THRESHOLD
        ),
        "score": round(
            current_score,
            4,
        ),
        "threshold": round(
            THRESHOLD,
            4,
        ),
        "window": WINDOW,
        "channels": len(CHANNELS),
        "detected_points": len(
            detected_indices
        ),
        "detected_indices": detected_indices,
        "max_score": round(
            float(np.max(scores)),
            4,
        ),
        "detector": (
            "S-1 Train-Calibrated "
            "Change-Point"
        ),
    }


# ============================================================
# NASA S-1 DEMO / REAL TELEMETRY REPLAY
# ============================================================

@app.get("/demo/s1")
def demo_s1():

    """
    Real NASA SMAP S-1 telemetry replay.

    The telemetry comes directly from the local NASA
    SMAP S-1 test dataset.

    The same validated train-calibrated change-point
    detector used during model evaluation is applied
    to this telemetry.
    """

    # --------------------------------------------------------
    # NASA S-1 TEST DATASET
    # --------------------------------------------------------

    test_path = (
        BASE_DIR
        / "data"
        / "raw"
        / "data"
        / "data"
        / "test"
        / "S-1.npy"
    )

    if not test_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "S-1 telemetry dataset not found: "
                f"{test_path}"
            ),
        )

    # --------------------------------------------------------
    # LOAD REAL NASA TELEMETRY
    # --------------------------------------------------------

    raw_data = np.load(
        test_path
    )

    # Use exactly the same 18 channels
    # used during model validation.
    telemetry = raw_data[:, CHANNELS]

    # --------------------------------------------------------
    # RUN THE VALIDATED ML DETECTOR
    # --------------------------------------------------------

    scores = calculate_change_scores(
        telemetry,
        WINDOW,
    )

    anomaly_mask = (
        scores >= THRESHOLD
    )

    detected_indices = np.where(
        anomaly_mask
    )[0].tolist()

    # --------------------------------------------------------
    # VALID DETECTION REGION
    # --------------------------------------------------------

    valid_start = WINDOW
    valid_end = (
        len(telemetry) - WINDOW
    )

    detected_indices = [
        int(i)
        for i in detected_indices
        if valid_start <= i < valid_end
    ]

    # --------------------------------------------------------
    # FIND HIGHEST-SCORING VALID POINT
    # --------------------------------------------------------

    valid_scores = scores[
        valid_start:valid_end
    ]

    if len(valid_scores) > 0:

        local_max_index = int(
            np.argmax(valid_scores)
        )

        demo_index = (
            valid_start
            + local_max_index
        )

        current_score = float(
            scores[demo_index]
        )

    else:

        demo_index = 0

        current_score = float(
            scores[0]
        )

    # --------------------------------------------------------
    # RETURN REAL NASA TELEMETRY
    # --------------------------------------------------------

    telemetry_response = (
        telemetry.tolist()
    )

    return {

        # ML decision
        "anomaly": bool(
            current_score >= THRESHOLD
        ),

        # Current ML score
        "score": round(
            current_score,
            4,
        ),

        # Calibrated threshold
        "threshold": round(
            THRESHOLD,
            4,
        ),

        # Detector configuration
        "window": WINDOW,

        "channels": len(
            CHANNELS
        ),

        # Number of detected anomaly points
        "detected_points": len(
            detected_indices
        ),

        # Exact anomaly locations
        "detected_indices": (
            detected_indices
        ),

        # Maximum ML score
        "max_score": (
            round(
                float(
                    np.max(
                        valid_scores
                    )
                ),
                4,
            )
            if len(valid_scores) > 0
            else round(
                float(
                    np.max(scores)
                ),
                4,
            )
        ),

        # Detector name
        "detector": (
            "S-1 Train-Calibrated "
            "Change-Point"
        ),

        # ====================================================
        # REAL NASA TELEMETRY
        # ====================================================

        "telemetry": telemetry_response,

        "telemetry_points": len(
            telemetry
        ),

        # Dataset information
        "dataset": "NASA SMAP S-1",

        "source": (
            "NASA SMAP anomaly "
            "detection dataset"
        ),

        # Point currently displayed
        "demo_index": demo_index,
    }