import OpenAI from "openai";
import { type MetaPromptInput } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for browser environment
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function generateMetaPrompt(input: MetaPromptInput): Promise<string> {
  const prompt = `Create a detailed meta prompt based on the following parameters:
Input: ${input.baseInput}
AI Role: ${input.aiRole}
Tone & Style: ${input.tone}
Functionality: ${input.functionality}
Constraints: ${input.constraints}
Edge Cases: ${input.edgeCases}

Generate a comprehensive meta-prompt that incorporates all these elements.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content || "";
}

export async function generateVariations(metaPrompt: string, count: number = 3): Promise<string[]> {
  const prompt = `Generate ${count} variations of the following meta prompt, each with slightly different emphasis and structure while maintaining the core functionality:

${metaPrompt}

Return the variations in a JSON array format.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.variations || [];
}

export async function evaluatePrompt(
  prompt: string,
  testCase: string,
  criteria: Record<string, number>
): Promise<Record<string, number>> {
  const evaluationPrompt = `Evaluate the following prompt against the test case using the given criteria:

Prompt:
${prompt}

Test Case:
${testCase}

Criteria:
${Object.keys(criteria).join(", ")}

Rate each criterion from 0 to 1 and return as JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: evaluationPrompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}