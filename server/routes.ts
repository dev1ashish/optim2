import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPromptSchema } from "@shared/schema";
import { ZodError } from "zod";

export function registerRoutes(app: Express): Server {
  app.post("/api/prompts", async (req, res) => {
    try {
      const promptData = insertPromptSchema.parse(req.body);
      const prompt = await storage.createPrompt(promptData);
      res.json(prompt);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        const err = error as Error;
        res.status(400).json({ error: err.message });
      }
    }
  });

  app.get("/api/prompts", async (_req, res) => {
    const prompts = await storage.getAllPrompts();
    res.json(prompts);
  });

  app.get("/api/prompts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const prompt = await storage.getPrompt(id);
    if (!prompt) {
      res.status(404).json({ error: "Prompt not found" });
      return;
    }
    res.json(prompt);
  });

  app.post("/api/prompts/:id/evaluate", async (req, res) => {
    const id = parseInt(req.params.id);
    const results = req.body.results;
    try {
      const prompt = await storage.updatePromptEvaluation(id, results);
      res.json(prompt);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({ error: err.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}