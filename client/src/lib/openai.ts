import OpenAI from "openai";
import { type MetaPromptInput } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for browser environment
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function generateMetaPrompt(input: MetaPromptInput): Promise<string> {
  const prompt = `Given this request for an AI assistant: "${input.baseInput}"

Create a comprehensive meta-prompt that includes:
1. Extracted AI Role
2. Appropriate Tone & Style
3. Core Functionality
4. Necessary Constraints
5. Edge Cases to Handle

Format the response as a detailed prompt with clear sections for:
- Core Behavioral Guidelines
- Communication Style
- Response Structure
- Constraints & Safety
- Example Responses

The meta-prompt should be complete and ready to use without requiring any additional human input.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content || "";
}

export async function generateVariations(metaPrompt: string, count: number = 3): Promise<string[]> {
  const prompt = `Generate ${count} variations of the following meta prompt, each with slightly different emphasis and structure while maintaining the core functionality:

${metaPrompt}

Return the variations in a JSON array format. Each variation should be complete and self-contained.`;

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

// Function to automatically generate test cases
export async function generateTestCases(baseInput: string, count: number = 3): Promise<{
  input: string;
  criteria: Record<string, number>;
}[]> {
  const prompt = `Generate ${count} test cases for an AI assistant that ${baseInput}.
Each test case should include:
1. A user input scenario
2. Evaluation criteria with weights (0-1) for:
   - Relevance
   - Clarity
   - Completeness
   - Task-specific accuracy

Return as a JSON array of objects with 'input' and 'criteria' properties.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.testCases || [];
}