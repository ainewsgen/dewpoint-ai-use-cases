import OpenAI from 'openai';

export interface AIRequestParams {
    systemPrompt: string;
    userContext: string;
    model?: string;
    apiKey: string; // Required now, managed via Admin UI
}

export class OpenAIService {
    /**
     * Generates a structured JSON response from OpenAI.
     * Guaranteed to match the requested schema if prompt is correct.
     */
    static async generateJSON(params: AIRequestParams): Promise<any> {
        // Instantiate client per-request with the specific key
        const openai = new OpenAI({
            apiKey: params.apiKey,
            timeout: 60 * 1000, // Explicit 60s timeout
            maxRetries: 2,
        });

        try {
            const completion = await openai.chat.completions.create({
                model: params.model || 'gpt-4o',
                messages: [
                    { role: 'system', content: params.systemPrompt },
                    { role: 'user', content: params.userContext }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7, // Balance creativity vs structure
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("Empty response from AI");

            return JSON.parse(content);
        } catch (error) {
            console.error("OpenAI Service Error:", error);
            throw error; // Re-throw for route handler to catch
        }
    }
}
