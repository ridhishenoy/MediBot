import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || (import.meta.env?.VITE_GEMINI_API_KEY as string) || "";
const ai = new GoogleGenAI({ apiKey });

export async function analyzeVitals(vitals: { hr: number, spo2: number, temp: number, stress?: string }, patientData?: { age?: number, weight?: number, bloodGroup?: string }) {
  if (!apiKey) {
    return "AI analysis is currently unavailable (missing API key).";
  }

  const prompt = `
    As a medical AI assistant for MediBot, analyze the following patient vitals and provide health recommendations.
    
    Current Vitals:
    - Heart Rate: ${vitals.hr} BPM
    - SpO2: ${vitals.spo2}%
    - Body Temperature: ${vitals.temp} °C
    - Stress Level: ${vitals.stress || 'Not calculated'}
    
    Patient Context:
    - Weight: ${patientData?.weight || 'Unknown'} kg
    - Blood Group: ${patientData?.bloodGroup || 'Unknown'}
    
    Please provide:
    1. A summary of the patient's current status.
    2. Any potential concerns based on these readings.
    3. Health recommendations (lifestyle, hydration, rest, etc.).
    
    Keep the tone professional and reassuring. Use Markdown for formatting.
    Note: Always include a disclaimer that this is AI-generated and not a replacement for professional medical advice.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Failed to generate AI analysis.";
  }
}
