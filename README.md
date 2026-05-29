# NetPulse AI

NetPulse AI is a comprehensive platform designed for real-time network monitoring, congestion prediction, and forecasting using Machine Learning. The system integrates an IoT hardware simulation (ESP32) with a powerful backend, a fast machine learning inference service, and multi-platform clients (Web and Mobile) to provide insights into network health.

## Project Architecture

The repository is structured into several interconnected services:

### 1. `client/` (Web Dashboard)
A modern web dashboard built to visualize network metrics and congestion forecasts.
- **Frameworks:** React 19, Vite
- **Routing & State:** TanStack Router, React Query
- **Styling & UI:** Tailwind CSS v4, Radix UI components, Framer Motion
- **Data Visualization:** Recharts
- **Real-time:** Socket.IO Client

### 2. `server/` (Backend API)
The core backend service that manages users, handles real-time communication, and orchestrates data flow.
- **Framework:** Node.js, Express
- **Database:** MariaDB with Prisma ORM
- **Real-time:** Socket.IO
- **Authentication:** JWT, bcryptjs
- **Other Features:** Email integration (Nodemailer), fast-speedtest-api

### 3. `ml-service/` (Machine Learning Engine)
A dedicated microservice for predicting network congestion.
- **Framework:** Python, FastAPI
- **Libraries:** Pandas, NumPy, Scikit-learn (Joblib)
- **Functionality:** 
  - Exposes endpoints (`/predict`, `/predict/forecast`)
  - Calculates rolling features, lag features, trends, and volatility based on historical readings.
  - Uses pre-trained scikit-learn models (`model.pkl`, `forecasting_model.pkl`) to output congestion levels.

### 4. `mobile/` (Mobile Application)
A cross-platform mobile application for network monitoring on the go.
- **Framework:** React Native, Expo
- **Routing:** Expo Router
- **UI/Visualization:** React Native Chart Kit, Reanimated
- **Real-time:** Socket.IO Client

### 5. `scratch/` (IoT Simulation)
Contains firmware code (`esp32_netpulse.ino`) for an ESP32 microcontroller (typically simulated via Wokwi) to generate and send raw network metrics (active users, latency, throughput, etc.) to the local backend.

## Features

- **Real-Time Data Ingestion:** IoT devices and clients stream metrics (latency, throughput, active users) to the system.
- **Live Congestion Prediction:** The ML service evaluates current network data to classify the immediate congestion level.
- **Future Forecasting:** Utilizes lag and volatility features to forecast upcoming network states.
- **Multi-Platform Dashboards:** Real-time metrics are pushed via WebSockets to both the web dashboard and mobile app, providing users with live, isolated dashboards.
- **Secure Authentication:** JWT-based user and partner authentication.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MariaDB
- React Native / Expo Go (for mobile)

### Setup Instructions

1. **Database & Server setup:**
   - Navigate to the `server/` directory.
   - Run `npm install`.
   - Setup your `.env` file with MariaDB credentials and JWT secrets.
   - Run `npx prisma generate` and `npx prisma db push` to initialize the database schema.
   - Start the server: `npm run dev`.

2. **ML Service Setup:**
   - Navigate to the `ml-service/` directory.
   - Install dependencies: `pip install fastapi uvicorn pandas numpy scikit-learn pydantic`.
   - Ensure `model.pkl` and `forecasting_model.pkl` are present.
   - Start the FastAPI server: `python app.py` (runs on port 8000).

3. **Web Client Setup:**
   - Navigate to the `client/` directory.
   - Run `npm install`.
   - Start the development server: `npm run dev`.

4. **Mobile App Setup:**
   - Navigate to the `mobile/` directory.
   - Run `npm install`.
   - Start Expo: `npm start`.

5. **IoT Simulation:**
   - Flash the `scratch/esp32_netpulse.ino` to an ESP32 or use Wokwi.
   - Configure the IP address in the script to point to your local `server` instance.

## License
This project is licensed under the ISC License.


[![Watch Demo](https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg)](https://youtu.be/EUgogS5QBdU)
