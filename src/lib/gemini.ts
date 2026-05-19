import { GoogleGenAI } from "@google/genai";
import { UserProfile, VitalMeasurement } from "../types";

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
**Overview:** [Maximum 2 concise sentences summarizing the vitals objectively but the line should strictly start with "Your vitals indicate" and continue from there"]\n

**Concerns:** [Maximum 1 sentence noting any abnormal values. Write "None observed." if all vitals are normal.]\n

**Recommendations:** [Maximum 1 sentence of standard clinical advice based on concerns. Write "Continue standard monitoring." if no concerns.]\n

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

export interface RangeAnalysisResult {
  overview: string;
  metrics: {
    stabilityIndex: number;
    stabilityStatus: 'Stable' | 'Fluctuating' | 'Needs Attention';
    stressRating: number;
    stressStatus: 'Optimal' | 'Mild' | 'High';
    cardioFitness: number;
    cardioStatus: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  };
  recommendations: {
    id: string;
    title: string;
    sub: string;
    details: string;
    icon: 'Droplets' | 'Activity' | 'Heart';
    color: string;
  }[];
}

export async function analyzeVitalsRange(
  measurements: VitalMeasurement[],
  profile: UserProfile | null
): Promise<RangeAnalysisResult | string> {
  if (!apiKey) {
    return "AI analysis is currently unavailable (missing API key).";
  }
  if (measurements.length === 0) {
    return "No measurements available for the selected timeframe.";
  }

  const hrVals = measurements.map(m => m.heartRate);
  const spo2Vals = measurements.map(m => m.spo2);
  const tempVals = measurements.map(m => m.temperature);

  const avgHR = Math.round(hrVals.reduce((a, b) => a + b, 0) / measurements.length);
  const maxHR = Math.max(...hrVals);
  const minHR = Math.min(...hrVals);

  const avgSpO2 = Math.round(spo2Vals.reduce((a, b) => a + b, 0) / measurements.length);
  const avgTemp = Number((tempVals.reduce((a, b) => a + b, 0) / measurements.length).toFixed(1));

  const profileInfo = profile
    ? `Age: ${profile.age || 'Unknown'}, Sex: ${profile.sex || 'Unknown'}, Weight: ${profile.weight || 'Unknown'}kg, Blood Group: ${profile.bloodGroup || 'Unknown'}`
    : 'Unknown Profile';

  const historyText = measurements
    .slice(-100)
    .map(m => `- Time: ${m.timestamp}, HR: ${m.heartRate} BPM, SpO2: ${m.spo2}%, Temp: ${m.temperature}°C, Stress: ${m.stress}, Type: ${m.type}`)
    .join('\n');

  const prompt = `You are MediBot, a premium clinical analysis system.
Analyze the following patient history over the selected period.

PATIENT PROFILE:
${profileInfo}

PERIOD STATISTICS:
- Total Recordings: ${measurements.length}
- Average Heart Rate: ${avgHR} BPM (Range: ${minHR} - ${maxHR})
- Average Blood Oxygen (SpO2): ${avgSpO2}%
- Average Hand Temperature: ${avgTemp}°C

RAW DATA POINTS:
${historyText}

Analyze this history, identify any cardiovascular stress, vitals stability, and general wellbeing. Output your response STRICTLY as a JSON object matching the RangeAnalysisResult schema.

SCHEMAS:
interface RangeAnalysisResult {
  overview: string; // Markdown summary (max 3 concise paragraphs) highlighting key trends, improvements, or concerns. Emphasize details and give deep wellness insights. Avoid general advice here, focus on analyzing their raw numbers.
  metrics: {
    stabilityIndex: number; // 0-100 score of how stable the vitals are (low variance, normal ranges = high score)
    stabilityStatus: 'Stable' | 'Fluctuating' | 'Needs Attention';
    stressRating: number; // 0-100 score of cumulative stress (based on average and maximum heart rate readings)
    stressStatus: 'Optimal' | 'Mild' | 'High';
    cardioFitness: number; // 0-100 score of general cardio fitness based on heart rate trends
    cardioStatus: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  };
  recommendations: {
    id: string; // unique random ID like 'rec-1', 'rec-2', etc.
    title: string; // Actionable task title (e.g. 'Deep Breathing', 'Increased Hydration')
    sub: string; // Detailed frequency/quantity (e.g. '3x 5m sessions', '2.5L Water Intake')
    details: string; // 1-2 sentence explanation of WHY this is recommended based on their trend
    icon: 'Droplets' | 'Activity' | 'Heart';
    color: string; // Choose a premium CSS color theme like 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20', or 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'
  }[]; // Provide exactly 3 personalized, highly tailored recommendations that the user can sync as daily goals.
}

Return ONLY the raw JSON object. Do not wrap it in markdown codeblocks (e.g. no \`\`\`json).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    });

    if (!response.text) throw new Error("Empty response from AI");
    return JSON.parse(response.text.trim()) as RangeAnalysisResult;
  } catch (error: any) {
    console.error("Gemini Range AI error:", error);
    return `AI failed to parse details: ${error?.message || "Unknown error occurred"}`;
  }
}

export async function chatWithCoach(
  chatHistory: { role: 'user' | 'model', text: string }[],
  userMessage: string,
  measurements: VitalMeasurement[],
  profile: UserProfile | null
): Promise<string> {
  if (!apiKey) {
    return "AI Coach is currently offline (missing API key).";
  }

  const profileInfo = profile
    ? `Patient: ${profile.name}, Age: ${profile.age || 'Unknown'}, Sex: ${profile.sex || 'Unknown'}, Weight: ${profile.weight || 'Unknown'}kg, Blood Group: ${profile.bloodGroup || 'Unknown'}`
    : 'Unknown Profile';

  const stats = measurements.length > 0
    ? `We have ${measurements.length} vitals recordings in this range. Averages - Heart Rate: ${Math.round(measurements.reduce((a, b) => a + b.heartRate, 0) / measurements.length)} BPM, SpO2: ${Math.round(measurements.reduce((a, b) => a + b.spo2, 0) / measurements.length)}%, Temperature: ${(measurements.reduce((a, b) => a + b.temperature, 0) / measurements.length).toFixed(1)}°C.`
    : 'No recent vitals measurements recorded.';

  const recent = measurements.slice(-5).map(m => `- Time: ${m.timestamp}, HR: ${m.heartRate} BPM, SpO2: ${m.spo2}%, Temp: ${m.temperature}°C, Stress: ${m.stress}`).join('\n');

  const systemInstructions = `You are MediCoach, a premium personal AI health coach embedded in the MediBot dashboard.
Your goal is to guide the user in understanding their health data, answering questions about their vitals trend, and providing empathetic, clinical-grade lifestyle advice.

PATIENT CONTEXT:
- ${profileInfo}
- ${stats}

RECENT MEASUREMENTS:
${recent}

INSTRUCTIONS:
1. Provide highly direct, compassionate, and informative clinical-style responses in brief Markdown.
2. Ground your advice in the patient's data. If they ask about their vitals, reference their averages or recent values.
3. Keep responses relatively short (2-3 brief paragraphs maximum) so they fit nicely in a chat dashboard container.
4. Suggest practical daily actions. Avoid generic medical disclaimers, but remind them to check with Dr. Aurelien or their contacts if they ask about serious concerns.
5. NEVER make up data points; use only what is provided.`;

  try {
    const contents: any[] = [];
    
    chatHistory.forEach(h => {
      contents.push({
        role: h.role,
        parts: [{ text: h.text }]
      });
    });

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstructions,
        temperature: 0.7,
        maxOutputTokens: 800
      }
    });

    return response.text || "I was unable to generate a response. Please try again.";
  } catch (error: any) {
    console.error("Gemini Chat AI error:", error);
    return `I am having trouble connecting to my cognitive center. Error: ${error?.message || "Unknown error"}`;
  }
}
