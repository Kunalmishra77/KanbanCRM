import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupGoogleAuth, isAuthenticated } from "./googleAuth";
import { insertUserSchema, insertClientSchema, updateClientSchema, insertStorySchema, updateStorySchema, insertCommentSchema, insertActivityLogSchema } from "@shared/schema";
import { ZodError } from "zod";
import { analyzeProposal } from "./gemini";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Google OAuth
  await setupGoogleAuth(app);
  
  // Auth routes - get current user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
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
      const body = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(),
      };
      const data = insertStorySchema.parse(body);
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

  // AI Proposal Analysis
  app.post("/api/analyze-proposal", async (req, res) => {
    try {
      const { proposalText, clientName } = req.body;
      
      if (!proposalText || !clientName) {
        return res.status(400).json({ error: "proposalText and clientName are required" });
      }
      
      const analysis = await analyzeProposal(proposalText, clientName);
      res.json(analysis);
    } catch (error) {
      console.error('Analyze proposal error:', error);
      res.status(500).json({ error: "Failed to analyze proposal" });
    }
  });

  // Create tasks from proposal analysis
  app.post("/api/clients/:clientId/create-tasks-from-proposal", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { tasks } = req.body;
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: "tasks array is required" });
      }
      
      const createdStories = [];
      const errors = [];
      
      for (const task of tasks) {
        try {
          const storyInput = {
            clientId,
            title: task.title || 'Untitled Task',
            description: task.description || '',
            priority: task.priority || 'Medium',
            status: 'To Do',
            person: '',
            assignedTo: null,
            estimatedEffortHours: typeof task.estimatedHours === 'number' ? task.estimatedHours : 0,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            progressPercent: 0,
            tags: [],
          };
          
          const validatedData = insertStorySchema.parse(storyInput);
          const story = await storage.createStory(validatedData);
          createdStories.push(story);
        } catch (taskError) {
          console.error('Failed to create task:', task.title, taskError);
          errors.push({ title: task.title, error: String(taskError) });
        }
      }
      
      if (createdStories.length === 0) {
        return res.status(400).json({ 
          error: "Failed to create any tasks",
          details: errors 
        });
      }
      
      res.status(201).json({ 
        message: `Created ${createdStories.length} tasks from proposal`,
        stories: createdStories,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Create tasks from proposal error:', error);
      res.status(500).json({ error: "Failed to create tasks from proposal" });
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
