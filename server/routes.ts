import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPasswordSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Password management routes
  app.get("/api/passwords", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const passwords = await storage.getPasswords(req.user.id);
    res.json(passwords);
  });

  app.post("/api/passwords", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const parseResult = insertPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const password = await storage.createPassword(req.user.id, parseResult.data);
    res.status(201).json(password);
  });

  app.patch("/api/passwords/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const existing = await storage.getPassword(id);
    if (!existing || existing.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const parseResult = insertPasswordSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const password = await storage.updatePassword(id, parseResult.data);
    res.json(password);
  });

  app.delete("/api/passwords/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    const existing = await storage.getPassword(id);
    if (!existing || existing.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    await storage.deletePassword(id);
    res.sendStatus(204);
  });

  const httpServer = createServer(app);
  return httpServer;
}
