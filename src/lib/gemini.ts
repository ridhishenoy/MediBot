import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || (import.meta.env?.VITE_GEMINI_API_KEY as string) || "";
const ai = new GoogleGenAI({ apiKey });

export async function analyzeVitals(vitals: { hr: number, spo2: number, temp: number, stress?: string }, patientData?: { age?: number, weight?: number, bloodGroup?: string }) {
  if (!apiKey) {
    return "AI analysis is currently unavailable (missing API key).";
  }

  const prompt = `You are MediBot, an objective clinical analysis system.
Analyze the following vitals and output STRICTLY in the requested format.
DO NOT use conversational filler, greetings, or first-person pronouns (like "I", "my").

PATIENT VITALS:
- Heart Rate (HR): ${vitals.hr} BPM
- Blood Oxygen (SpO2): ${vitals.spo2}%
- Hand Temperature: ${vitals.temp}°C
- Stress Level: ${vitals.stress || 'Not calculated'}
- Weight: ${patientData?.weight || 'Unknown'} kg
- Blood Group: ${patientData?.bloodGroup || 'Unknown'}

TEMPERATURE REFERENCE (STRICTLY APPLY THIS):
- 28 to 31°C: Cold hands / cold environment
- 31 to 34°C: Normal cool hand temperature
- 34 to 36°C: Warm hand / good circulation
- 36 to 37°C: Very warm skin surface
- Above 37°C: Heat source / possible fever

OUTPUT FORMAT (Markdown):
**Overview:** [Maximum 2 concise sentences summarizing the vitals objectively but the line should strictly start with "Your vitals indicate" and continue from there"]

**Concerns:** [Maximum 1 sentence noting any abnormal values. Write "None observed." if all vitals are normal.]

**Recommendations:** [Maximum 1 sentence of standard clinical advice based on concerns. Write "Continue standard monitoring." if no concerns.]

`;

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
        }
      });

      return response.text;
    } catch (error: any) {
      if ((error?.status === 429 || error?.status === 503) && retries > 1) {
        retries--;
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      console.error("Gemini AI error:", error);

      // Provide a more helpful error message based on the API response
      if (error?.status === 429) {
        return "AI analysis failed: You have exceeded your API rate limit. Please wait a minute and try again.";
      } else if (error?.status === 503) {
        return "AI analysis failed: The AI model is currently experiencing high demand. Please try again in a few moments.";
      }

      return `Failed to generate AI analysis: ${error?.message || "Unknown error occurred"}`;
    }
  }

  return "AI analysis failed: Unknown error occurred";
}
