from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from collections import deque

app = FastAPI()

# Load the trained model
try:
    model = joblib.load("model.pkl")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Load the forecasting model
try:
    forecasting_model = joblib.load("forecasting_model.pkl")
except Exception as e:
    print(f"Error loading forecasting model: {e}")
    forecasting_model = None

# Cache for rolling features (last 5 readings)
history = {
    "active_users": deque(maxlen=5),
    "latency": deque(maxlen=5),
    "throughput": deque(maxlen=5)
}

class NetworkData(BaseModel):
    active_users: int
    latency: float
    throughput: float
    packet_loss: float
    signal_strength: float

@app.post("/predict")
async def predict(data: NetworkData):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    # Get current hour (matching training feature 'hour')
    from datetime import datetime
    current_hour = datetime.now().hour

    # Update history for rolling features
    history["active_users"].append(data.active_users)
    history["latency"].append(data.latency)
    history["throughput"].append(data.throughput)

    # Calculate rolling means (default to current value if not enough history)
    users_roll = np.mean(history["active_users"]) if history["active_users"] else data.active_users
    latency_roll = np.mean(history["latency"]) if history["latency"] else data.latency
    throughput_roll = np.mean(history["throughput"]) if history["throughput"] else data.throughput

    # 2. Lag Features
    if len(history["active_users"]) >= 2:
        users_lag1 = history["active_users"][-2]
        latency_lag1 = history["latency"][-2]
        throughput_lag1 = history["throughput"][-2]
    else:
        users_lag1 = data.active_users
        latency_lag1 = data.latency
        throughput_lag1 = data.throughput

    # 3. Trend Features
    latency_change = data.latency - latency_lag1
    throughput_change = data.throughput - throughput_lag1

    # 4. Volatility Features (Standard Deviation of up to 5)
    if len(history["latency"]) >= 2:
        latency_std = float(np.std(history["latency"], ddof=1)) if len(history["latency"]) > 1 else 0.0
        throughput_std = float(np.std(history["throughput"], ddof=1)) if len(history["throughput"]) > 1 else 0.0
    else:
        latency_std = 0.0
        throughput_std = 0.0

    # Prepare input for model in the EXACT order of training columns
    input_data = pd.DataFrame([{
        "hour": current_hour,
        "active_users": data.active_users,
        "latency": data.latency,
        "packet_loss": data.packet_loss,
        "throughput": data.throughput,
        "signal_strength": data.signal_strength,
        "users_roll": users_roll,
        "latency_roll": latency_roll,
        "throughput_roll": throughput_roll,
        "latency_lag1": latency_lag1,
        "throughput_lag1": throughput_lag1,
        "users_lag1": users_lag1,
        "latency_std": latency_std,
        "throughput_std": throughput_std,
        "latency_change": latency_change,
        "throughput_change": throughput_change
    }])

    try:
        prediction = model.predict(input_data)
        return {"congestion_level": int(prediction[0])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/forecast")
async def predict_forecast(data: NetworkData):
    if forecasting_model is None:
        raise HTTPException(status_code=500, detail="Forecasting model not loaded")

    # 1. Rolling Features (Mean of up to 5)
    users_roll = np.mean(history["active_users"]) if history["active_users"] else data.active_users
    latency_roll = np.mean(history["latency"]) if history["latency"] else data.latency
    throughput_roll = np.mean(history["throughput"]) if history["throughput"] else data.throughput

    # 2. Lag Features
    # The previous reading is at history[-2] if it exists, else use current data
    if len(history["active_users"]) >= 2:
        users_lag1 = history["active_users"][-2]
        latency_lag1 = history["latency"][-2]
        throughput_lag1 = history["throughput"][-2]
    else:
        users_lag1 = data.active_users
        latency_lag1 = data.latency
        throughput_lag1 = data.throughput

    # 3. Trend Features
    latency_change = data.latency - latency_lag1
    throughput_change = data.throughput - throughput_lag1

    # 4. Volatility Features (Standard Deviation of up to 5)
    if len(history["latency"]) >= 2:
        # We use ddof=1 to match pandas default std, but if length is < 2 we already fallback.
        latency_std = float(np.std(history["latency"], ddof=1)) if len(history["latency"]) > 1 else 0.0
        throughput_std = float(np.std(history["throughput"], ddof=1)) if len(history["throughput"]) > 1 else 0.0
    else:
        latency_std = 0.0
        throughput_std = 0.0

    input_data = pd.DataFrame([{
        "active_users": data.active_users,
        "latency": data.latency,
        "throughput": data.throughput,
        "packet_loss": data.packet_loss,
        "signal_strength": data.signal_strength,
        "users_roll": users_roll,
        "latency_roll": latency_roll,
        "throughput_roll": throughput_roll,
        "users_lag1": users_lag1,
        "latency_lag1": latency_lag1,
        "throughput_lag1": throughput_lag1,
        "latency_change": latency_change,
        "throughput_change": throughput_change,
        "latency_std": latency_std,
        "throughput_std": throughput_std
    }])

    try:
        prediction = forecasting_model.predict(input_data)
        return {"future_congestion_level": int(prediction[0])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
