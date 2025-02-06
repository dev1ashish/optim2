import { prompts, type Prompt, type InsertPrompt } from "@shared/schema";

export interface IStorage {
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  getPrompt(id: number): Promise<Prompt | undefined>;
  getAllPrompts(): Promise<Prompt[]>;
  updatePromptEvaluation(id: number, results: Record<string, number>[]): Promise<Prompt>;
}

export class MemStorage implements IStorage {
  private prompts: Map<number, Prompt>;
  private currentId: number;

  constructor() {
    this.prompts = new Map();
    this.currentId = 1;
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const id = this.currentId++;
    const prompt: Prompt = {
      ...insertPrompt,
      id,
      createdAt: new Date(),
      variations: insertPrompt.variations as string[],
      testCases: insertPrompt.testCases,
      evaluationResults: insertPrompt.evaluationResults
    };
    this.prompts.set(id, prompt);
    return prompt;
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    return this.prompts.get(id);
  }

  async getAllPrompts(): Promise<Prompt[]> {
    return Array.from(this.prompts.values());
  }

  async updatePromptEvaluation(
    id: number,
    results: Record<string, number>[]
  ): Promise<Prompt> {
    const prompt = await this.getPrompt(id);
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    const updatedPrompt = {
      ...prompt,
      evaluationResults: results
    };
    this.prompts.set(id, updatedPrompt);
    return updatedPrompt;
  }
}

export const storage = new MemStorage();