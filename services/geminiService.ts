// Lazy-load @google/genai to keep it out of the main bundle
let aiInstance: any = null;
let TypeRef: any = null;

async function getAI() {
  if (!aiInstance) {
    const { GoogleGenAI, Type } = await import("@google/genai");
    TypeRef = Type;
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }
  return { ai: aiInstance, Type: TypeRef };
}

export const generateProjectTasks = async (projectDescription: string, projectTitle: string): Promise<string[]> => {
  if (!process.env.API_KEY) return [];
  try {
    const { ai, Type } = await getAI();
    const model = 'gemini-2.5-flash';
    const prompt = `
      I am a project manager for a video production agency.
      Please generate a list of 5-7 distinct, actionable high-level tasks for a project titled "${projectTitle}".
      The description is: "${projectDescription}".
      Return ONLY the list of tasks as a JSON array of strings. Do not include any markdown formatting or extra text.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    // Parse the JSON array
    const tasks = JSON.parse(text);
    return Array.isArray(tasks) ? tasks : [];

  } catch (error) {
    console.error("Failed to generate tasks with Gemini:", error);
    // Fallback or rethrow depending on UI handling logic
    return [
      "Review script (Fallback)",
      "Schedule filming (Fallback)",
      "Select background music (Fallback)"
    ];
  }
};

export const analyzeProjectRisk = async (projectData: any): Promise<string> => {
  if (!process.env.API_KEY) return "Risk assessment unavailable (Missing API Key)";
  try {
    const { ai } = await getAI();
    const model = 'gemini-2.5-flash';
    const prompt = `
          Analyze the following project status and provide a 1-sentence risk assessment.
          Project: ${JSON.stringify(projectData)}
          Risk Assessment:
        `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "No assessment available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to analyze risk at this moment.";
  }
}
