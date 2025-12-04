import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertClientSchema, updateClientSchema, insertStorySchema, updateStorySchema, insertCommentSchema, insertActivityLogSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = req.body;
      
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Auto-create user for demo purposes
        user = await storage.createUser({
          email,
          name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
          role: 'editor',
          avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
        });
      }
      
      res.json({ user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    // Mock session - in production use proper session management
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ user });
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      const clientsList = await storage.getClients();
      res.json(clientsList);
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      
      // Log activity
      const userId = req.headers['x-user-id'] as string;
      if (userId) {
        await storage.createActivityLog({
          entityType: 'client',
          entityId: client.id,
          action: 'created',
          userId,
          details: `Created client: ${client.name}`,
        });
      }
      
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create client error:', error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const data = updateClientSchema.parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      const userId = req.headers['x-user-id'] as string;
      if (userId) {
        await storage.createActivityLog({
          entityType: 'client',
          entityId: client.id,
          action: 'updated',
          userId,
          details: `Updated client: ${client.name}`,
        });
      }
      
      res.json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update client error:', error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Stories
  app.get("/api/stories", async (req, res) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const storiesList = clientId 
        ? await storage.getStoriesByClient(clientId)
        : await storage.getStories();
      res.json(storiesList);
    } catch (error) {
      console.error('Get stories error:', error);
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  app.get("/api/stories/:id", async (req, res) => {
    try {
      const story = await storage.getStory(req.params.id);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      res.json(story);
    } catch (error) {
      console.error('Get story error:', error);
      res.status(500).json({ error: "Failed to fetch story" });
    }
  });

  app.post("/api/stories", async (req, res) => {
    try {
      const data = insertStorySchema.parse(req.body);
      const story = await storage.createStory(data);
      
      const userId = req.headers['x-user-id'] as string;
      if (userId) {
        await storage.createActivityLog({
          entityType: 'story',
          entityId: story.id,
          action: 'created',
          userId,
          details: `Created story: ${story.title}`,
        });
      }
      
      res.status(201).json(story);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create story error:', error);
      res.status(500).json({ error: "Failed to create story" });
    }
  });

  app.patch("/api/stories/:id", async (req, res) => {
    try {
      const data = updateStorySchema.parse(req.body);
      const story = await storage.updateStory(req.params.id, data);
      
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      
      const userId = req.headers['x-user-id'] as string;
      if (userId) {
        await storage.createActivityLog({
          entityType: 'story',
          entityId: story.id,
          action: 'updated',
          userId,
          details: `Updated story: ${story.title}`,
        });
      }
      
      res.json(story);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update story error:', error);
      res.status(500).json({ error: "Failed to update story" });
    }
  });

  app.delete("/api/stories/:id", async (req, res) => {
    try {
      const success = await storage.deleteStory(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Story not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Delete story error:', error);
      res.status(500).json({ error: "Failed to delete story" });
    }
  });

  // Comments
  app.get("/api/stories/:storyId/comments", async (req, res) => {
    try {
      const commentsList = await storage.getCommentsByStory(req.params.storyId);
      res.json(commentsList);
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/stories/:storyId/comments", async (req, res) => {
    try {
      const data = insertCommentSchema.parse({
        ...req.body,
        storyId: req.params.storyId,
      });
      const comment = await storage.createComment(data);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create comment error:', error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Activity Log
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await storage.getActivityLog(limit);
      res.json(logs);
    } catch (error) {
      console.error('Get activity error:', error);
      res.status(500).json({ error: "Failed to fetch activity log" });
    }
  });

  return httpServer;
}
