# 🎓 Student Placement Prediction & Career Analytics Engine

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Framework](https://img.shields.io/badge/framework-Flask%203.x-green.svg)](https://flask.palletsprojects.com/)
[![Machine Learning](https://img.shields.io/badge/ML-Scikit--Learn%20%7C%20Pandas%20%7C%20NumPy-orange.svg)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent, data-driven web application and machine learning prediction system designed to evaluate student profiles, predict campus placement probabilities, analyze multi-factor readiness scores, and deliver personalized actionable recommendations.

---

## 🌟 Key Features

- **🎯 Interactive Prediction Engine**: Evaluates placement probability based on weighted scoring matrices including Academic Performance (CGPA), Coding Aptitude, Technical & Soft Skills, Internships, Projects, and Work Experience with active backlog penalties.
- **📊 Real-time Dimension Breakdown**: Visualizes performance across 5 key pillars:
  - 📚 Academic Score (CGPA)
  - 💻 Coding Aptitude
  - 🧠 Logical & Quantitative Reasoning
  - 🛠️ Practical Experience (Internships & Projects)
  - 🗣️ Soft Skills & Communication
- **🔍 Student Profile Explorer**: Search and inspect 48,000+ cleaned student records by Student ID, Engineering Stream, City, or College Tier.
- **💡 Smart Actionable Insights**: Automated rule-based advice suggesting targeted areas of improvement (DSA practice, backlog clearance, mock interviews, internships).
- **🎨 Modern Glassmorphic UI**: Fast, responsive, dark-mode inspired UI built with vanilla CSS3 and vanilla JavaScript.
- **⚡ Production-Ready Deployment**: Includes `Procfile`, `render.yaml`, `Dockerfile`, and Gunicorn configurations for deployment on Render, Railway, Heroku, or Docker.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, Gunicorn, Werkzeug
- **Data Processing & ML**: Pandas, NumPy, Scikit-Learn, SciPy, Joblib
- **Frontend**: HTML5, CSS3 (Modern Glassmorphism & Micro-animations), JavaScript (ES6+)
- **Deployment**: Docker, Render Blueprint, Procfile

---

## 🚀 Quick Start (Local Setup)

### 1. Clone the repository
```bash
git clone https://github.com/pacifist-11/ML.git
cd ML
```

### 2. Create and activate a virtual environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. (Optional) Run Dataset Preprocessing
```bash
python clean_dataset.py
```

### 5. Start the Application
```bash
python app.py
```
Open your browser and navigate to **`http://localhost:5000`**.

---

## 🌐 Deploy to Cloud

### Option 1: Deploy on Render (Recommended)
1. Push this repository to GitHub.
2. Sign in to [Render](https://render.com/).
3. Click **New +** > **Web Service** > Connect your `pacifist-11/ML` repo.
4. Render will automatically detect `render.yaml` and `Procfile`.
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Click **Deploy Web Service**.

### Option 2: Deploy with Docker
```bash
docker build -t placement-predictor .
docker run -p 5000:5000 placement-predictor
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | Main Web Application Dashboard |
| `/predict` | `POST` | Calculate placement probability and sub-scores |
| `/api/students` | `GET` | Query & filter student records (`limit`, `search`) |
| `/api/student/<id>` | `GET` | Fetch comprehensive profile attributes for a student |
| `/api/health` | `GET` | Service status and dataset statistics |

### Example Request (`POST /predict`):
```json
{
  "cgpa": 8.5,
  "stream": "Computer Science",
  "internships": 2,
  "projects": 3,
  "coding_score": 85,
  "aptitude_score": 80,
  "soft_skills": 75,
  "backlogs": 0,
  "work_experience": 1
}
```

---

## 📂 Project Structure

```
ML/
├── app.py                                   # Flask web server & prediction logic
├── clean_dataset.py                         # Data cleaning & imputation pipeline
├── placement_predict_50k Dataset.csv        # Raw dataset
├── placement_predict_50k_cleaned.csv        # Cleaned dataset (48k+ records)
├── requirements.txt                         # Python dependencies
├── Procfile                                 # Gunicorn web process definition
├── render.yaml                              # Render deployment blueprint
├── Dockerfile                               # Container build specification
├── .gitignore                               # Git ignored files & environments
├── templates/
│   └── index.html                           # Main frontend template
└── static/
    ├── css/
    │   └── style.css                        # Glassmorphic responsive styling
    └── js/
        └── main.js                          # Client-side validation & dynamic charts
```

---

## 📄 License
This project is open-source and licensed under the **MIT License**.
