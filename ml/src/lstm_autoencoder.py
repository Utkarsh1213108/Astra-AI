import numpy as np
import pandas as pd
import ast
import torch
import torch.nn as nn

from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    average_precision_score
)


# ============================================================
# 1. Configuration
# ============================================================

BASE = "ml/data/raw/data/data"

WINDOW = 20
HIDDEN_SIZE = 32
BATCH_SIZE = 32
EPOCHS = 50
LEARNING_RATE = 0.001


# ============================================================
# 2. Select device
# ============================================================

if torch.backends.mps.is_available():
    DEVICE = torch.device("mps")
else:
    DEVICE = torch.device("cpu")

print("Using device:", DEVICE)


# ============================================================
# 3. Load P-1 telemetry
# ============================================================

train = np.load(
    f"{BASE}/train/P-1.npy"
)

test = np.load(
    f"{BASE}/test/P-1.npy"
)


# ============================================================
# 4. Use channels present in both train and test
# ============================================================

train_active = np.any(train != 0, axis=0)
test_active = np.any(test != 0, axis=0)

channels = np.where(
    train_active & test_active
)[0]

train = train[:, channels]
test = test[:, channels]

print("Channels used:", len(channels))
print("Train shape:", train.shape)
print("Test shape:", test.shape)


# ============================================================
# 5. Standardise using TRAINING statistics only
# ============================================================

mean = train.mean(axis=0)
std = train.std(axis=0)

std[std == 0] = 1.0

train = (train - mean) / std
test = (test - mean) / std


# ============================================================
# 6. Create sequences
# ============================================================

def create_sequences(data, window):
    sequences = []

    for i in range(len(data) - window + 1):
        sequences.append(
            data[i:i + window]
        )

    return np.array(sequences)


train_sequences = create_sequences(
    train,
    WINDOW
)

test_sequences = create_sequences(
    test,
    WINDOW
)

print("Train sequences:", train_sequences.shape)
print("Test sequences:", test_sequences.shape)


# ============================================================
# 7. Convert to PyTorch tensors
# ============================================================

X_train = torch.tensor(
    train_sequences,
    dtype=torch.float32
).to(DEVICE)

X_test = torch.tensor(
    test_sequences,
    dtype=torch.float32
).to(DEVICE)


# ============================================================
# 8. LSTM Autoencoder
# ============================================================

class LSTMAutoencoder(nn.Module):

    def __init__(
        self,
        input_size,
        hidden_size
    ):
        super().__init__()

        # Encoder
        self.encoder = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            batch_first=True
        )

        # Decoder
        self.decoder = nn.LSTM(
            input_size=hidden_size,
            hidden_size=hidden_size,
            batch_first=True
        )

        # Convert hidden representation
        # back to original telemetry dimensions
        self.output_layer = nn.Linear(
            hidden_size,
            input_size
        )

    def forward(self, x):

        # Encode sequence
        encoded, (hidden, cell) = self.encoder(x)

        # Use final hidden state
        latent = hidden[-1]

        # Repeat latent vector across
        # the complete sequence
        repeated = latent.unsqueeze(1).repeat(
            1,
            x.size(1),
            1
        )

        # Decode
        decoded, _ = self.decoder(
            repeated
        )

        # Reconstruct telemetry
        output = self.output_layer(
            decoded
        )

        return output


# ============================================================
# 9. Create model
# ============================================================

input_size = train.shape[1]

model = LSTMAutoencoder(
    input_size=input_size,
    hidden_size=HIDDEN_SIZE
).to(DEVICE)

print("\nModel created:")
print(model)


# ============================================================
# 10. Loss and optimizer
# ============================================================

criterion = nn.MSELoss()

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=LEARNING_RATE
)


# ============================================================
# 11. Training
# ============================================================

print("\n=== Training LSTM Autoencoder ===")

model.train()

for epoch in range(EPOCHS):

    total_loss = 0.0

    # Shuffle training sequences
    indices = torch.randperm(
        len(X_train),
        device=DEVICE
    )

    for start in range(
        0,
        len(X_train),
        BATCH_SIZE
    ):

        batch_indices = indices[
            start:start + BATCH_SIZE
        ]

        batch = X_train[
            batch_indices
        ]

        optimizer.zero_grad()

        reconstructed = model(batch)

        loss = criterion(
            reconstructed,
            batch
        )

        loss.backward()

        optimizer.step()

        total_loss += (
            loss.item() * len(batch)
        )

    average_loss = (
        total_loss / len(X_train)
    )

    if (
        epoch == 0
        or (epoch + 1) % 5 == 0
    ):
        print(
            f"Epoch {epoch + 1:02d}/{EPOCHS} "
            f"Loss: {average_loss:.6f}"
        )


# ============================================================
# 12. Calculate training reconstruction error
# ============================================================

model.eval()

with torch.no_grad():

    train_reconstructed = model(
        X_train
    )

    train_errors = torch.mean(
        (X_train - train_reconstructed) ** 2,
        dim=(1, 2)
    ).cpu().numpy()


# ============================================================
# 13. Calculate test reconstruction error
# ============================================================

with torch.no_grad():

    test_reconstructed = model(
        X_test
    )

    test_errors = torch.mean(
        (X_test - test_reconstructed) ** 2,
        dim=(1, 2)
    ).cpu().numpy()


# ============================================================
# 14. Convert sequence scores to timestep scores
# ============================================================

# Each sequence corresponds to its final timestep.

test_anomaly_score = np.zeros(
    len(test)
)

test_anomaly_score[
    WINDOW - 1:
] = test_errors


# ============================================================
# 15. Determine anomaly threshold
# ============================================================

threshold = np.percentile(
    train_errors,
    95
)

predicted = (
    test_anomaly_score >= threshold
)


# ============================================================
# 16. Load NASA ground-truth labels
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


# ============================================================
# 17. Create true labels
# ============================================================

y_true = np.zeros(
    len(test),
    dtype=int
)

for start, end in intervals:

    y_true[start:end + 1] = 1


# Ignore first WINDOW-1 points because
# they do not have a complete sequence.

valid_start = WINDOW - 1

precision = precision_score(
    y_true[valid_start:],
    predicted[valid_start:],
    zero_division=0
)

recall = recall_score(
    y_true[valid_start:],
    predicted[valid_start:],
    zero_division=0
)

f1 = f1_score(
    y_true[valid_start:],
    predicted[valid_start:],
    zero_division=0
)

pr_auc = average_precision_score(
    y_true[valid_start:],
    test_anomaly_score[valid_start:]
)


# ============================================================
# 18. Results
# ============================================================

print("\n======================================")
print(" ASTRA: LSTM AUTOENCODER")
print("======================================")

print(f"Window size:       {WINDOW}")
print(f"Hidden size:       {HIDDEN_SIZE}")
print(f"Epochs:            {EPOCHS}")
print(f"Learning rate:     {LEARNING_RATE}")
print(f"Threshold:         {threshold:.6f}")

print(f"\nTest points:       {len(test)}")
print(
    f"Predicted anomalies: "
    f"{predicted.sum()}"
)

print(
    f"Actual anomalous points: "
    f"{y_true.sum()}"
)

print(f"\nPrecision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1 Score:  {f1:.4f}")
print(f"PR-AUC:    {pr_auc:.4f}")