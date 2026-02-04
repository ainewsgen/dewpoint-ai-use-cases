
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIRequestParams } from './openai.js'; // Shared interface

export class GeminiService {
    static async generateJSON(params: AIRequestParams): Promise<any> {
        const genAI = new GoogleGenerativeAI(params.apiKey);
        const model = genAI.getGenerativeModel({
            model: params.model || 'gemini-pro',
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

    static async listModels(apiKey: string): Promise<string[]> {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) {
                const errorText = await response.text();
                // throw new Error(`Failed to list models: ${response.status} ${response.statusText} - ${errorText}`);
                console.error(`Failed to list models: ${response.status} ${response.statusText} - ${errorText}`);
                return [];
            }
            const data: any = await response.json();
            // Data format: { models: [ { name: "models/gemini-pro", ... } ] }
            return (data.models || [])
                .map((m: any) => m.name.replace('models/', '')) // Strip prefix for cleaner UI
                .filter((n: string) => n.includes('gemini')); // Filter mainly for gemini
        } catch (error) {
            console.error("Gemini List Models Error:", error);
            return [];
        }
    }
}
