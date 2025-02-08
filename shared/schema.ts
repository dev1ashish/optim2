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

// Simplified test case schema - removed criteria as it will be handled in evaluation step
export const testCaseSchema = z.object({
  input: z.string().min(1, "Test input is required")
});

export type TestCase = z.infer<typeof testCaseSchema>;