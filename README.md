# 🖥️ Smart Server Health Analyzer (SSCP)

> **An AI-powered full-stack web application that predicts server health, detects potential crashes before they happen, and provides intelligent root cause analysis with actionable recommendations.**

![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![Django](https://img.shields.io/badge/Django-ML_API-092E20?logo=django)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb)
![License](https://img.shields.io/badge/License-ISC-green)

---

## 📖 Project Description

**Smart Server Health Analyzer (SSCP - Smart Server Control Panel)** is an intelligent DevOps monitoring tool designed to help system administrators and DevOps engineers predict server failures **before they happen**. The application uses a **Machine Learning model** to analyze real-time server telemetry data — including CPU usage, RAM usage, disk utilization, temperature, network latency, API response time, error rates, and active connections — and generates a comprehensive health report with:

- 🎯 **Health Score** (0–100) indicating overall server stability
- ⏱️ **Estimated Time to Crash (ETA)** predicting when a server might fail
- 🔍 **Root Cause Analysis (RCA)** identifying the exact reasons behind server instability
- 💡 **AI-Powered Suggestions** providing actionable steps to prevent downtime
- 📧 **Automated Email Alerts** notifying admins when critical conditions are detected

This project was built as a **Semester 4 academic project** to demonstrate the integration of modern web technologies with machine learning for real-world infrastructure monitoring.

---

## 🏗️ System Architecture

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   React Frontend    │      │   Node.js Backend    │      │   Django ML API     │
│   (Vite + React 19) │◄────►│   (Express.js)       │◄────►│   (ML Prediction)   │
│   Port: 5173        │      │   Port: 5000         │      │   Port: 8000        │
└─────────────────────┘      └─────────┬────────────┘      └─────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │    Database      │
                              │  MongoDB / JSON  │
                              │  (Fallback DB)   │
                              └─────────────────┘
```

The application follows a **three-tier microservices architecture**:

1. **React Frontend** — Interactive dashboard for inputting server metrics and visualizing results
2. **Node.js Backend** — REST API server handling authentication, data storage, and email alerts
3. **Django ML Service** — Python-based machine learning API that processes telemetry data and returns health predictions

---

## ✨ Key Features

### 🔐 Authentication & Security
- **User Registration & Login** with secure password hashing (bcrypt)
- **JWT Token-based authentication** with 2-hour session expiry
- **Forgot Password flow** with 6-digit OTP sent via email
- **Protected API routes** — all dashboard endpoints require valid authentication

### 📊 Server Health Monitoring Dashboard
- **8 real-time server metrics** with interactive slider controls:
  - CPU Usage (%), RAM Usage (%), Disk Usage (%), Temperature (°C)
  - Network Latency (ms), API Response Time (ms), Error Rate (%), Active Connections
- **Preset simulation modes** — Normal, Heavy Load, and Critical scenarios
- **Unified Master Telemetry Chart** with multi-axis visualization (Recharts)
- **Historical diagnostic logs** stored in a searchable, sortable table

### 🤖 AI-Powered Predictions
- **Machine Learning model** classifies server status as: `Healthy`, `Warning`, or `Critical`
- **Health Score** (0–100) for quantitative server health assessment
- **Crash ETA prediction** — estimated time before potential server failure
- **Root Cause Analysis** — identifies specific bottlenecks (e.g., "CPU overloaded", "Disk nearing full capacity")
- **Actionable Suggestions** — AI-generated recommendations to resolve issues

### 📧 Automated Email Alerts
- **Gmail SMTP integration** via Nodemailer
- **Automatic alert emails** sent when server health is Warning or Critical
- **Detailed email reports** with health score, crash probability, RCA, and suggestions
- **Password reset emails** with secure 6-digit OTP codes

### 💾 Flexible Database
- **Primary: MongoDB** for production use
- **Automatic JSON fallback** — if MongoDB is unavailable, data is stored in local `database.json` and `users.json` files (zero-configuration setup)

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 8, Recharts, Lucide Icons | Interactive UI, Charts, Icons |
| **Backend** | Node.js, Express.js 5 | REST API, Authentication, Business Logic |
| **ML Service** | Python, Django | Machine Learning Prediction API |
| **Database** | MongoDB (Mongoose) / JSON Fallback | Data Storage |
| **Authentication** | JWT, bcryptjs | Secure Token-based Auth |
| **Email** | Nodemailer (Gmail SMTP) | Alert Notifications & Password Reset |
| **HTTP Client** | Axios | API Communication |

---

## 📁 Project Structure

```
smart-server-health-analyzer/
│
├── react_frontend/               # Frontend Application
│   ├── src/
│   │   ├── App.jsx               # Main dashboard component (Overview, Diagnostics, Logs)
│   │   ├── Login.jsx             # Authentication component (Login, Signup, Forgot Password)
│   │   ├── App.css               # Component styles
│   │   ├── index.css             # Global styles & design system
│   │   └── main.jsx              # React entry point
│   ├── public/
│   │   ├── home-bg.jpg           # Dashboard background image
│   │   ├── favicon.svg           # Browser favicon
│   │   └── icons.svg             # SVG icon sprites
│   ├── index.html                # HTML template
│   ├── vite.config.js            # Vite build configuration
│   └── package.json              # Frontend dependencies
│
├── node_backend/                 # Backend API Server
│   ├── server.js                 # Express server with all API routes
│   ├── database.json             # Fallback database for health logs
│   ├── users.json                # Fallback database for user accounts
│   ├── .env                      # Environment variables (not tracked in git)
│   └── package.json              # Backend dependencies
│
├── ml_service/                   # Machine Learning Service (Django)
│   └── venv/                     # Python virtual environment
│
├── .gitignore                    # Git ignore rules
└── README.md                     # Project documentation (this file)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **MongoDB** (optional — app works with JSON fallback)
- **Gmail Account** (for email alerts — requires App Password)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/bhuvamak-pixel/SMAERT-SERVER-HEALTH-ANALYSER.git
cd SMAERT-SERVER-HEALTH-ANALYSER
```

### 2️⃣ Setup the Node.js Backend

```bash
cd node_backend
npm install
```

Create a `.env` file in the `node_backend/` directory:

```env
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

Start the backend server:

```bash
npm start
```

> The backend will run on `http://localhost:5000`

### 3️⃣ Setup the React Frontend

```bash
cd react_frontend
npm install
npm run dev
```

> The frontend will run on `http://localhost:5173`

### 4️⃣ Setup the Django ML Service

```bash
cd ml_service
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install django djangorestframework scikit-learn numpy pandas
python manage.py runserver
```

> The ML API will run on `http://localhost:8000`

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `POST` | `/api/signup` | Register a new user account | ❌ |
| `POST` | `/api/login` | Authenticate and get JWT token | ❌ |
| `POST` | `/api/forgot-password` | Send OTP to user's email | ❌ |
| `POST` | `/api/reset-password` | Verify OTP and set new password | ❌ |
| `POST` | `/api/analyze` | Send metrics to ML model for prediction | ✅ |
| `GET`  | `/api/logs` | Fetch user's diagnostic history (last 50) | ✅ |
| `POST` | `/api/clear` | Delete all logs for the current user | ✅ |

---

## 🖥️ How to Use

1. **Sign Up / Login** — Create an account or log in with existing credentials
2. **Go to Overview Dashboard** — Adjust the 8 server telemetry sliders to simulate server conditions (or use preset buttons: Normal / Heavy / Critical)
3. **Click "Run Diagnostics"** — The data is sent to the AI model for analysis
4. **Review AI Diagnostics** — View the health score, crash ETA, root cause analysis, and AI suggestions
5. **Check Access Logs** — View all past diagnostic runs in a detailed table
6. **Email Alerts** — If the server is in Warning or Critical state, an automated alert email is sent to your registered email address

---

## 🔮 Future Enhancements

- 🌐 Real-time server metric collection via system agents
- 📱 Mobile-responsive progressive web app (PWA)
- 📈 Advanced ML models (LSTM, Transformer-based time series)
- 🔔 Slack/Discord webhook integration for alerts
- 🐳 Docker containerization for easy deployment
- ☁️ Cloud deployment on AWS/GCP/Azure

---

## 👥 Contributors

- **Bhuva Makwana** — Full Stack Developer & Project Lead

---

## 📄 License

This project is licensed under the **ISC License**.

---

## ⭐ Support

If you found this project helpful, please give it a ⭐ on GitHub!

---

<p align="center">
  <b>© 2026 Smart Server Health Analyzer. All rights reserved.</b><br>
  <i>Built with ❤️ using React, Node.js, and Django ML</i>
</p>
