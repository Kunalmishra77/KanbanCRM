import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupGoogleAuth, isAuthenticated, isCoFounderEmail } from "./googleAuth.js";
import { insertUserSchema, insertClientSchema, updateClientSchema, insertStorySchema, updateStorySchema, insertCommentSchema, insertActivityLogSchema, insertInvoiceSchema, updateInvoiceSchema, insertFounderInvestmentSchema, updateFounderInvestmentSchema, updateUserProfileSchema, insertSentEmailSchema, insertInternalDocumentSchema, updateInternalDocumentSchema, insertLeadSchema, updateLeadSchema, insertRevenueTargetSchema, updateRevenueTargetSchema, insertClientCommunicationSchema, insertAnnouncementSchema, updateAnnouncementSchema } from "../shared/schema.js";
import { ZodError } from "zod";
import { analyzeProposal, generateStatusEmail } from "./gemini.js";

import multer from "multer";
import { supabaseAdmin } from "./lib/supabase.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Google OAuth FIRST - this sets up session middleware
  await setupGoogleAuth(app);

  // Secure Upload Endpoint - MUST be after setupGoogleAuth for session/auth to work
  app.post("/api/upload", upload.single("file"), async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { bucket } = req.body;
    if (!bucket || !['invoices', 'documents', 'proposals', 'attachments'].includes(bucket)) {
      return res.status(400).json({ error: "Invalid or missing bucket name" });
    }

    try {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(filePath);

      res.json({ publicUrl, fileName: req.file.originalname });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to upload file to storage", details: error.message });
    }
  });

  // Auth routes - get current user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Clients (all protected with authentication)
  app.get("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const clientsList = await storage.getClients();
      res.json(clientsList);
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);

      // Log activity using server-side user from session
      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'client',
          entityId: client.id,
          action: 'created',
          userId: req.user.id,
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

  app.patch("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const data = updateClientSchema.parse(req.body);
      const client = await storage.updateClient(req.params.id, data);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'client',
          entityId: client.id,
          action: 'updated',
          userId: req.user.id,
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

  app.delete("/api/clients/:id", isAuthenticated, async (req: any, res) => {
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

  // Stories (all protected with authentication)
  app.get("/api/stories", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/stories/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/stories", isAuthenticated, async (req: any, res) => {
    try {
      const body = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(),
      };
      const data = insertStorySchema.parse(body);
      const story = await storage.createStory(data);

      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'story',
          entityId: story.id,
          action: 'created',
          userId: req.user.id,
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

  app.patch("/api/stories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const data = updateStorySchema.parse(req.body);
      const story = await storage.updateStory(req.params.id, data);

      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'story',
          entityId: story.id,
          action: 'updated',
          userId: req.user.id,
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

  app.delete("/api/stories/:id", isAuthenticated, async (req: any, res) => {
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

  // Comments (all protected with authentication)
  app.get("/api/stories/:storyId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const commentsList = await storage.getCommentsByStory(req.params.storyId);
      res.json(commentsList);
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/stories/:storyId/comments", isAuthenticated, async (req: any, res) => {
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

  // AI Email Draft Generation (protected)
  app.post("/api/stories/:storyId/generate-email", isAuthenticated, async (req: any, res) => {
    try {
      const { storyId } = req.params;
      const { userNotes, progressPercent, senderName } = req.body;

      // Get story details
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      // Get client details
      const client = await storage.getClient(story.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get recent comments
      const allComments = await storage.getCommentsByStory(storyId);
      const recentComments = allComments.slice(-5).map(c => ({
        authorName: c.authorName || 'Team Member',
        body: c.body
      }));

      const emailResult = await generateStatusEmail({
        storyTitle: story.title,
        storyDescription: story.description,
        storyStatus: story.status,
        storyPriority: story.priority,
        progressPercent: progressPercent ?? story.progressPercent ?? 0,
        dueDate: story.dueDate ? new Date(story.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
        clientName: client.name,
        recipientName: client.contactName,
        recentComments,
        userNotes: userNotes || '',
        senderName: senderName || 'The Team'
      });

      res.json(emailResult);
    } catch (error) {
      console.error('Generate email error:', error);
      res.status(500).json({ error: "Failed to generate email" });
    }
  });

  // Sent Emails - Store email when user clicks "Send" (protected)
  app.get("/api/stories/:storyId/emails", isAuthenticated, async (req: any, res) => {
    try {
      const emails = await storage.getSentEmailsByStory(req.params.storyId);
      res.json(emails);
    } catch (error) {
      console.error('Get emails error:', error);
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  app.post("/api/stories/:storyId/emails", isAuthenticated, async (req: any, res) => {
    try {
      const { storyId } = req.params;

      // Get story to get clientId
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      const client = await storage.getClient(story.clientId);

      const data = insertSentEmailSchema.parse({
        ...req.body,
        storyId,
        clientId: story.clientId,
        sentById: req.user.id,
        recipientEmail: req.body.recipientEmail || client?.contactEmail,
        recipientName: req.body.recipientName || client?.contactName,
        sentAt: new Date(),
      });

      const email = await storage.createSentEmail(data);
      res.status(201).json(email);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create email error:', error);
      res.status(500).json({ error: "Failed to save email" });
    }
  });

  // AI Proposal Analysis (protected)
  app.post("/api/analyze-proposal", isAuthenticated, async (req: any, res) => {
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

  // Create tasks from proposal analysis (protected)
  app.post("/api/clients/:clientId/create-tasks-from-proposal", isAuthenticated, async (req: any, res) => {
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

  // Activity Log (protected)
  app.get("/api/activity", isAuthenticated, async (req: any, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await storage.getActivityLog(limit);
      res.json(logs);
    } catch (error) {
      console.error('Get activity error:', error);
      res.status(500).json({ error: "Failed to fetch activity log" });
    }
  });

  // Invoices (all protected with authentication)
  app.get("/api/clients/:clientId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const invoicesList = await storage.getInvoicesByClient(req.params.clientId);
      res.json(invoicesList);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/clients/:clientId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertInvoiceSchema.parse({
        ...req.body,
        clientId: req.params.clientId,
        issuedOn: req.body.issuedOn ? new Date(req.body.issuedOn) : new Date(),
      });
      const invoice = await storage.createInvoice(data);

      if (req.user?.id) {
        const client = await storage.getClient(req.params.clientId);
        await storage.createActivityLog({
          entityType: 'invoice',
          entityId: invoice.id,
          action: 'created',
          userId: req.user.id,
          details: `Added invoice "${invoice.label}" (₹${parseFloat(invoice.amount).toLocaleString('en-IN')}) to ${client?.name || 'client'}`,
        });
      }

      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create invoice error:', error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const data = updateInvoiceSchema.parse({
        ...req.body,
        issuedOn: req.body.issuedOn ? new Date(req.body.issuedOn) : undefined,
      });
      const invoice = await storage.updateInvoice(req.params.id, data);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (req.user?.id) {
        const client = await storage.getClient(invoice.clientId);
        await storage.createActivityLog({
          entityType: 'invoice',
          entityId: invoice.id,
          action: 'updated',
          userId: req.user.id,
          details: `Updated invoice "${invoice.label}" (₹${parseFloat(invoice.amount).toLocaleString('en-IN')}) for ${client?.name || 'client'}`,
        });
      }

      res.json(invoice);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update invoice error:', error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      const success = await storage.deleteInvoice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (req.user?.id && invoice) {
        const client = await storage.getClient(invoice.clientId);
        await storage.createActivityLog({
          entityType: 'invoice',
          entityId: invoice.id,
          action: 'deleted',
          userId: req.user.id,
          details: `Deleted invoice "${invoice.label}" (₹${parseFloat(invoice.amount).toLocaleString('en-IN')}) from ${client?.name || 'client'}`,
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete invoice error:', error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Users (for internal dashboard - co-founders only, verified by email allowlist)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can view team members" });
      }

      const usersList = await storage.getAllUsers();
      res.json(usersList);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can update user profiles" });
      }

      const data = updateUserProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(req.params.id, data);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update user error:', error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Founder Investments (verified by email allowlist)
  app.get("/api/founder-investments", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can view investments" });
      }

      const investments = await storage.getFounderInvestments();
      res.json(investments);
    } catch (error) {
      console.error('Get investments error:', error);
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  app.post("/api/founder-investments", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can add investments" });
      }

      const data = insertFounderInvestmentSchema.parse({
        ...req.body,
        investedOn: req.body.investedOn ? new Date(req.body.investedOn) : new Date(),
      });
      const investment = await storage.createFounderInvestment(data);

      res.status(201).json(investment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create investment error:', error);
      res.status(500).json({ error: "Failed to create investment" });
    }
  });

  app.patch("/api/founder-investments/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can update investments" });
      }

      const data = updateFounderInvestmentSchema.parse({
        ...req.body,
        investedOn: req.body.investedOn ? new Date(req.body.investedOn) : undefined,
      });
      const investment = await storage.updateFounderInvestment(req.params.id, data);

      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }

      res.json(investment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update investment error:', error);
      res.status(500).json({ error: "Failed to update investment" });
    }
  });

  app.delete("/api/founder-investments/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can delete investments" });
      }

      const success = await storage.deleteFounderInvestment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Investment not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete investment error:', error);
      res.status(500).json({ error: "Failed to delete investment" });
    }
  });

  // Internal Documents (co-founders only)
  app.get("/api/internal-documents", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can view documents" });
      }

      const documents = await storage.getInternalDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/internal-documents", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can add documents" });
      }

      const data = insertInternalDocumentSchema.parse({
        ...req.body,
        uploadedById: req.user.id,
      });
      const document = await storage.createInternalDocument(data);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create document error:', error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.patch("/api/internal-documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can update documents" });
      }

      const data = updateInternalDocumentSchema.parse(req.body);
      const document = await storage.updateInternalDocument(req.params.id, data);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update document error:', error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  app.delete("/api/internal-documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can delete documents" });
      }

      const success = await storage.deleteInternalDocument(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Leads (read: all authenticated; write: co-founders only)
  app.get("/api/leads", isAuthenticated, async (req: any, res) => {
    try {
      const leadsList = await storage.getLeads();
      res.json(leadsList);
    } catch (error) {
      console.error('Get leads error:', error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req: any, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error('Get lead error:', error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can create leads" });
      }
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create lead error:', error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can update leads" });
      }
      const data = updateLeadSchema.parse(req.body);
      const lead = await storage.updateLead(req.params.id, data);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update lead error:', error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can delete leads" });
      }
      const success = await storage.deleteLead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Delete lead error:', error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Revenue Targets (co-founders only)
  app.get("/api/revenue-targets", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can view revenue targets" });
      }
      const targets = await storage.getRevenueTargets();
      res.json(targets);
    } catch (error) {
      console.error('Get revenue targets error:', error);
      res.status(500).json({ error: "Failed to fetch revenue targets" });
    }
  });

  app.post("/api/revenue-targets", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can set revenue targets" });
      }
      const data = insertRevenueTargetSchema.parse(req.body);
      const target = await storage.upsertRevenueTarget(data);
      res.status(201).json(target);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Upsert revenue target error:', error);
      res.status(500).json({ error: "Failed to save revenue target" });
    }
  });

  // Client Communications (all authenticated)
  app.get("/api/clients/:clientId/communications", isAuthenticated, async (req: any, res) => {
    try {
      const comms = await storage.getCommunicationsByClient(req.params.clientId);
      res.json(comms);
    } catch (error) {
      console.error('Get communications error:', error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  app.post("/api/clients/:clientId/communications", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertClientCommunicationSchema.parse({
        ...req.body,
        clientId: req.params.clientId,
        loggedById: req.user.id,
      });
      const comm = await storage.createClientCommunication(data);
      res.status(201).json(comm);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create communication error:', error);
      res.status(500).json({ error: "Failed to create communication" });
    }
  });

  app.delete("/api/communications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const success = await storage.deleteClientCommunication(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Communication not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Delete communication error:', error);
      res.status(500).json({ error: "Failed to delete communication" });
    }
  });

  // Announcements (read: all authenticated; write: co-founders only)
  app.get("/api/announcements", isAuthenticated, async (req: any, res) => {
    try {
      const announcementsList = await storage.getAnnouncements();
      res.json(announcementsList);
    } catch (error) {
      console.error('Get announcements error:', error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.post("/api/announcements", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can post announcements" });
      }
      const data = insertAnnouncementSchema.parse({
        ...req.body,
        postedById: req.user.id,
      });
      const announcement = await storage.createAnnouncement(data);
      res.status(201).json(announcement);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create announcement error:', error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.patch("/api/announcements/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can update announcements" });
      }
      const data = updateAnnouncementSchema.parse(req.body);
      const announcement = await storage.updateAnnouncement(req.params.id, data);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update announcement error:', error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  app.delete("/api/announcements/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!isCoFounderEmail(req.user?.email)) {
        return res.status(403).json({ error: "Only co-founders can delete announcements" });
      }
      const success = await storage.deleteAnnouncement(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Delete announcement error:', error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  return httpServer;
}
