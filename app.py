import os
import pickle
import re
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Optional external ML model loader
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'placement_model.pkl')
model = None

# Cleaned Dataset Loader
CLEANED_CSV_PATH = os.path.join(os.path.dirname(__file__), 'placement_predict_50k_cleaned.csv')
df_cleaned = None

if os.path.exists(CLEANED_CSV_PATH):
    try:
        import pandas as pd
        df_cleaned = pd.read_csv(CLEANED_CSV_PATH)
        print(f"Successfully loaded cleaned dataset with {len(df_cleaned)} records.")
    except Exception as e:
        print(f"Notice: Could not load {CLEANED_CSV_PATH}: {e}")



def calculate_placement_probability(data):
    """
    Interface Prediction Engine

    Computes placement probability based on weighted feature matrix:
    - CGPA (30%)
    - Coding Score (25%)
    - Aptitude Score (15%)
    - Internships & Projects (15%)
    - Soft Skills & Experience (15%)
    Deduction for active backlogs.
    """
    try:
        cgpa = float(data.get('cgpa', 7.0))
        stream = str(data.get('stream', 'Computer Science'))
        internships = int(data.get('internships', 0))
        projects = int(data.get('projects', 0))
        coding_score = float(data.get('coding_score', 60))
        aptitude_score = float(data.get('aptitude_score', 60))
        soft_skills = float(data.get('soft_skills', 60))
        backlogs = int(data.get('backlogs', 0))
        work_exp = float(data.get('work_experience', 0))
    except (ValueError, TypeError):
        cgpa = 7.0
        stream = 'Computer Science'
        internships = 0
        projects = 0
        coding_score = 60.0
        aptitude_score = 60.0
        soft_skills = 60.0
        backlogs = 0
        work_exp = 0.0

    # Sub-component calculations (0 - 100 range)
    academic_score = (min(max(cgpa, 0.0), 10.0) / 10.0) * 100.0
    coding_norm = min(max(coding_score, 0.0), 100.0)
    aptitude_norm = min(max(aptitude_score, 0.0), 100.0)
    soft_norm = min(max(soft_skills, 0.0), 100.0)
    
    # Practical experience score
    exp_score = min((internships * 25) + (projects * 15) + (work_exp * 20), 100.0)

    # Weighted calculation
    weighted_probability = (
        (academic_score * 0.30) +
        (coding_norm * 0.25) +
        (aptitude_norm * 0.15) +
        (exp_score * 0.15) +
        (soft_norm * 0.15)
    )

    # Apply backlog penalties (each active backlog reduces overall score by 8%)
    penalty = backlogs * 8.0
    final_probability = max(5.0, min(98.5, weighted_probability - penalty))

    # Category determination
    if final_probability >= 78.0:
        status = "High Chance of Placement"
        badge_class = "success"
        summary = "Outstanding candidate profile! Strong technical skills and academic background."
    elif final_probability >= 55.0:
        status = "Moderate Chance of Placement"
        badge_class = "warning"
        summary = "Good overall profile with solid potential. Boosting coding practice and project portfolio will guarantee placement."
    else:
        status = "Placement Needs Improvement"
        badge_class = "danger"
        summary = "Focus on clearing backlogs, improving coding aptitude, and building hands-on projects."

    # Personalized Recommendations
    recommendations = []
    if backlogs > 0:
        recommendations.append(f"Prioritize clearing your {backlogs} active backlog(s) before recruitment drives.")
    if coding_norm < 70:
        recommendations.append("Enhance Data Structures & Algorithms problem-solving skills on LeetCode/HackerRank.")
    if internships == 0:
        recommendations.append("Apply for summer/winter internships to gain practical industry exposure.")
    if aptitude_norm < 65:
        recommendations.append("Practice quantitative aptitude and logical reasoning mock assessments.")
    if soft_skills < 70:
        recommendations.append("Participate in group discussions and mock interviews to polish communication.")
    if not recommendations:
        recommendations.append("Profile is well-balanced! Maintain momentum with advanced system design & mock interviews.")

    return {
        'probability': round(final_probability, 1),
        'status': status,
        'badge_class': badge_class,
        'summary': summary,
        'sub_scores': {
            'academic': round(academic_score, 1),
            'coding': round(coding_norm, 1),
            'aptitude': round(aptitude_norm, 1),
            'practical': round(exp_score, 1),
            'communication': round(soft_norm, 1)
        },
        'recommendations': recommendations
    }


@app.route('/')
def home():
    """Renders the Placement Prediction interface."""
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    """Endpoint processing placement prediction requests."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()

    result = calculate_placement_probability(data)
    return jsonify(result)


@app.route('/api/students', methods=['GET'])
def get_students():
    """Returns a list/sample of students from the cleaned dataset."""
    if df_cleaned is None:
        return jsonify({'error': 'Cleaned dataset not available.'}), 500

    limit = request.args.get('limit', default=100, type=int)
    search = request.args.get('search', default='', type=str).strip().lower()

    if search:
        # Search by StudentID or Stream or City
        if search.isdigit():
            filtered = df_cleaned[df_cleaned['StudentID'] == int(search)]
        else:
            filtered = df_cleaned[
                df_cleaned['Stream'].str.lower().str.contains(search, na=False) |
                df_cleaned['City'].str.lower().str.contains(search, na=False) |
                df_cleaned['CollegeTier'].str.lower().str.contains(search, na=False)
            ]
    else:
        filtered = df_cleaned

    # Select key summary fields for dropdown
    records = filtered.head(limit)[['StudentID', 'Gender', 'City', 'CollegeTier', 'Stream', 'CGPA', 'PlacementStatus', 'Salary Package']].to_dict(orient='records')
    return jsonify({'total': len(filtered), 'students': records})


@app.route('/api/student/<int:student_id>', methods=['GET'])
def get_student_detail(student_id):
    """Returns full attribute profile for a specific student ID."""
    if df_cleaned is None:
        return jsonify({'error': 'Cleaned dataset not available.'}), 500

    student_row = df_cleaned[df_cleaned['StudentID'] == student_id]
    if student_row.empty:
        return jsonify({'error': f'Student ID {student_id} not found.'}), 404

    record = student_row.iloc[0].to_dict()
    # Convert numpy types to standard python types for JSON serialization
    clean_record = {}
    for k, v in record.items():
        if hasattr(v, 'item'):
            clean_record[k] = v.item()
        else:
            clean_record[k] = v

    return jsonify(clean_record)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'online', 
        'dataset_loaded': df_cleaned is not None,
        'total_records': len(df_cleaned) if df_cleaned is not None else 0
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1')
    print(f"Starting Placement Prediction Interface on http://0.0.0.0:{port} ...")
    app.run(host='0.0.0.0', port=port, debug=debug)

