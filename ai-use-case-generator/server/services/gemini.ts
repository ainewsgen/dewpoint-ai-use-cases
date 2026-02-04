
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIRequestParams } from './openai'; // Shared interface

export class GeminiService {
    static async generateJSON(params: AIRequestParams): Promise<any> {
        const genAI = new GoogleGenerativeAI(params.apiKey);
        const model = genAI.getGenerativeModel({
            model: params.model || 'gemini-1.5-flash-001',
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `${params.systemPrompt}\n\nUSER CONTEXT:\n${params.userContext}`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            if (!text) throw new Error("Empty response from Gemini");

            return JSON.parse(text);
        } catch (error) {
            console.error("Gemini Service Error:", error);
            throw error;
        }
    }
}
