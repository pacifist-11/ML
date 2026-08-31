import os
import pandas as pd
import numpy as np

# File Paths
RAW_CSV_PATH = os.path.join(os.path.dirname(__file__), 'placement_predict_50k Dataset.csv')
CLEANED_CSV_PATH = os.path.join(os.path.dirname(__file__), 'placement_predict_50k_cleaned.csv')

def process_and_clean_dataset():
    print(f"Loading raw dataset from: {RAW_CSV_PATH}")
    df = pd.read_csv(RAW_CSV_PATH)
    initial_rows, initial_cols = df.shape
    print(f"Raw Dataset Shape: {initial_rows} rows, {initial_cols} columns")

    # 1. Filter out synthetic anomaly rows
    print("\n--- Step 1: Filtering Anomaly Rows ---")
    anomaly_count = (df['IsAnomaly'] == 1).sum()
    df_clean = df[df['IsAnomaly'] == 0].copy()
    print(f"Removed {anomaly_count} synthetic anomaly rows (IsAnomaly == 1). Remaining rows: {len(df_clean)}")

    # Drop the IsAnomaly flag column as all remaining rows are valid
    df_clean.drop(columns=['IsAnomaly'], inplace=True)

    # 2. Trim whitespace from string columns
    print("\n--- Step 2: Cleaning Categorical Columns ---")
    string_cols = df_clean.select_dtypes(include=['object', 'string']).columns
    for col in string_cols:
        df_clean[col] = df_clean[col].astype(str).str.strip()
    print(f"Trimmed whitespace for categorical columns: {list(string_cols)}")

    # 3. Handle Missing Values
    print("\n--- Step 3: Imputing Missing Values ---")
    # Workshops: Missing values imply 0 workshops attended
    missing_workshops = df_clean['Workshops'].isnull().sum()
    df_clean['Workshops'] = df_clean['Workshops'].fillna(0).astype(int)
    print(f"Workshops: Imputed {missing_workshops} missing values with 0.")

    # Test Scores Imputation using grouped median by Stream and CollegeTier
    score_cols = ['AptitudeTestScore', 'CodingTestScore', 'MockInterviewScore', 'SoftSkillsRating']
    for col in score_cols:
        missing_count = df_clean[col].isnull().sum()
        if missing_count > 0:
            # Grouped median
            group_medians = df_clean.groupby(['Stream', 'CollegeTier'])[col].transform('median')
            global_median = df_clean[col].median()
            df_clean[col] = df_clean[col].fillna(group_medians).fillna(global_median)
            print(f"{col}: Imputed {missing_count} missing values using (Stream, CollegeTier) grouped medians.")

    # 4. Domain Logic & Range Fixes
    print("\n--- Step 4: Applying Domain Logic & Formatting ---")
    
    # Unplaced students (PlacementStatus == 0) must have Salary Package == 0.0
    unplaced_with_salary = ((df_clean['PlacementStatus'] == 0) & (df_clean['Salary Package'] > 0)).sum()
    df_clean.loc[df_clean['PlacementStatus'] == 0, 'Salary Package'] = 0.0
    print(f"Salary Package: Fixed {unplaced_with_salary} unplaced rows that had non-zero salary package.")

    # Round numerical metrics to consistent precision
    df_clean['AttendancePercent'] = df_clean['AttendancePercent'].round(1)
    df_clean['Salary Package'] = df_clean['Salary Package'].round(2)
    df_clean['AptitudeTestScore'] = df_clean['AptitudeTestScore'].round(1)
    df_clean['CodingTestScore'] = df_clean['CodingTestScore'].round(1)
    df_clean['MockInterviewScore'] = df_clean['MockInterviewScore'].round(1)
    df_clean['SoftSkillsRating'] = df_clean['SoftSkillsRating'].round(1)

    # Cast count columns to integers
    int_cols = ['StudentID', 'Internships', 'Projects', 'Workshops', 'Certifications', 
                'Publications', 'ExtraCurricular', 'PlacementStatus']
    for col in int_cols:
        df_clean[col] = df_clean[col].astype(int)

    # Recalculate CGPA_Tier for perfect consistency with CGPA
    def assign_cgpa_tier(cgpa):
        if cgpa <= 6.50:
            return 'Low'
        elif cgpa <= 8.00:
            return 'Mid'
        else:
            return 'High'

    mismatched_tiers = (df_clean['CGPA_Tier'] != df_clean['CGPA'].apply(assign_cgpa_tier)).sum()
    df_clean['CGPA_Tier'] = df_clean['CGPA'].apply(assign_cgpa_tier)
    print(f"CGPA_Tier: Corrected {mismatched_tiers} mismatched tier labels based on CGPA thresholds.")

    # 5. Data Quality Verification
    print("\n--- Step 5: Verification & Quality Check ---")
    null_summary = df_clean.isnull().sum().sum()
    print(f"Total Remaining Null Values in Cleaned Dataset: {null_summary}")
    print(f"Cleaned Dataset Shape: {df_clean.shape[0]} rows, {df_clean.shape[1]} columns")

    # 6. Save Cleaned Dataset
    df_clean.to_csv(CLEANED_CSV_PATH, index=False)
    print(f"\nSuccessfully exported cleaned dataset to:\n{CLEANED_CSV_PATH}")

    # Summary Report
    print("\nCleaned Dataset Summary Statistics:")
    print(df_clean.describe(include='all'))

if __name__ == '__main__':
    process_and_clean_dataset()
