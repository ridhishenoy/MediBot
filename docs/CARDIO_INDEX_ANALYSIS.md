# MediBot Cardio Index Analysis Guide

Our Cardio Index (along with the stability and stress ratings) is analyzed using a hybrid statistical-AI architecture powered by Gemini 2.5 Flash and secure local calculations. Here is the step-by-step breakdown of how your cardiac fitness is calculated behind the scenes:

---

## 1. Statistical Aggregation
When you select an analysis timeframe (e.g., 7 days, 30 days, or a custom range), the system immediately filters all recordings in that period and extracts the raw heart rate values to compute key clinical indices:
* **Average Heart Rate (BPM)**: Calculates your overall cardiac baseline.
* **Heart Rate Range**: Captures the minimum and peak (maximum) heart rates recorded during the selected period.
* **Recording Types & Context**: Tracks whether heart rates are measured during activities, manual logs, or resting states.

---

## 2. Clinical Demographics Correlation
Heart rate variance doesn't mean the same thing for everyone. The analysis correlates your heart rate metrics with your specific patient profile:
* **Age & Sex**: Used to calibrate expected heart rate zones and cardiovascular limits.
* **Weight & Vitals Variances**: Establishes custom baselines for overall physical wellness.

---

## 3. Gemini 2.5 Flash Neural Assessment
The compiled mathematical payload (vitals statistics, demographic profile, and raw historical data points) is securely sent to Gemini 2.5 Flash with low-temperature configuration (0.3) for high reliability. The AI analyzes:
* **Cardio Index Score (0-100)**: Formulated by assessing heart rate variability (HRV), resting heart rate trends, and how frequently your peak heart rates exceed demographic safety thresholds. High stability and an optimal average resting heart rate yield a higher score.
* **Cardio Status (Poor, Fair, Good, or Excellent)**: Categorized based on clinical guidelines for resting heart rates and baseline cardiovascular efficiency.

---

## 4. Interactive Visualization
Once the analysis completes, the resulting JSON schema is mapped directly to the dashboard:
* **Visual Display**: It drives the SVG radial progress wheel and color-coded status pills in real time.
* **MediCoach Integration**: It feeds the MediCoach Chat Assistant, allowing you to ask follow-up questions which the coach answers using this exact context.
