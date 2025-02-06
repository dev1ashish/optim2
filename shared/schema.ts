import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  baseInput: text("base_input").notNull(),
  metaPrompt: text("meta_prompt").notNull(),
  variations: json("variations").notNull().$type<string[]>(),
  testCases: json("test_cases").notNull().$type<{input: string, criteria: Record<string, number>}[]>(),
  evaluationResults: json("evaluation_results").notNull().$type<Record<string, number>[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true
});

export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;

export const metaPromptSchema = z.object({
  baseInput: z.string().min(1, "Base input is required"),
  aiRole: z.string().min(1, "AI role is required"),
  tone: z.string().min(1, "Tone is required"),
  functionality: z.string().min(1, "Functionality is required"),
  constraints: z.string().min(1, "Constraints are required"),
  edgeCases: z.string().min(1, "Edge cases are required")
});

export type MetaPromptInput = z.infer<typeof metaPromptSchema>;

export const testCaseSchema = z.object({
  input: z.string().min(1, "Test input is required"),
  criteria: z.record(z.number().min(0).max(1))
});

export type TestCase = z.infer<typeof testCaseSchema>;
