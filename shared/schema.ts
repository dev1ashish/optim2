import { pgTable, text, serial, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  baseInput: text("base_input").notNull(),
  metaPrompt: text("meta_prompt").notNull(),
  variations: json("variations").notNull().$type<string[]>(),
  testCases: json("test_cases").notNull().$type<{input: string}[]>(),
  evaluationResults: json("evaluation_results").notNull().$type<Record<string, number>[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true
});

export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;

// Simplified schema that only requires the base input
export const metaPromptSchema = z.object({
  baseInput: z.string().min(1, "Please describe what kind of AI assistant you want")
});

export type MetaPromptInput = z.infer<typeof metaPromptSchema>;

// Test case schema
export const testCaseSchema = z.object({
  input: z.string().min(1, "Test input is required")
});

export type TestCase = z.infer<typeof testCaseSchema>;

// Evaluation criteria schema
export const evaluationCriterionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Criterion name is required"),
  description: z.string(),
  systemPrompt: z.string().min(1, "System prompt is required"),
  weight: z.number().min(0).max(1).default(1),
  modelConfig: z.object({
    provider: z.enum(["openai", "anthropic", "groq", "google"]),
    model: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().min(1),
    apiKey: z.string(),
    systemPrompt: z.string(),
    // OpenAI specific
    topP: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
    responseFormat: z.object({ type: z.string() }).optional(),
    seed: z.number().optional(),
    tools: z.array(z.any()).optional(),
    toolChoice: z.string().optional(),
    // Anthropic specific
    topK: z.number().optional(),
    // Groq specific
    stopSequences: z.array(z.string()).optional(),
    // Google specific
    candidateCount: z.number().optional(),
    safetySettings: z.array(z.object({
      category: z.string(),
      threshold: z.string()
    })).optional()
  }).optional()
});

export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;

// Evaluation result schema
export const evaluationResultSchema = z.object({
  variationIndex: z.number(),
  testCaseIndex: z.number(),
  scores: z.record(z.string(), z.number().min(0).max(1)),
  response: z.string()
});

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;