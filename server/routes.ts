import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupGoogleAuth, isAuthenticated, requireRole } from "./googleAuth.js";
import { perms, isRole, ROLES } from "../shared/roles.js";
import { insertUserSchema, insertClientSchema, updateClientSchema, insertStorySchema, updateStorySchema, insertCommentSchema, insertActivityLogSchema, insertInvoiceSchema, updateInvoiceSchema, insertFounderInvestmentSchema, updateFounderInvestmentSchema, updateUserProfileSchema, insertSentEmailSchema, insertInternalDocumentSchema, updateInternalDocumentSchema, insertLeadSchema, updateLeadSchema, insertRevenueTargetSchema, updateRevenueTargetSchema, insertClientCommunicationSchema, insertAnnouncementSchema, updateAnnouncementSchema, insertSalaryRecordSchema, updateSalaryRecordSchema, insertIncentiveSchema, updateIncentiveSchema, insertLeadCommentSchema } from "../shared/schema.js";
import { sendDeadlineReminders, sendEmail, isEmailConfigured } from "./emailService.js";
import { ZodError } from "zod";
import { computeOverview, nameOf } from "./lib/overview.js";
import { isPeriod, periodRange, istDate, addDays } from "../shared/istDate.js";
import { isTeam } from "../shared/teams.js";
import { isWorkPattern } from "../shared/schedule.js";
import { recurringTaskInputSchema, employeeRequestInputSchema } from "../shared/schema.js";
import { generateRecurringStories } from "./lib/recurring.js";
import { analyzeProposal, generateStatusEmail } from "./ai.js";

import multer from "multer";
import { saveFile, createDownloadUrl, isValidStoredName, originalNameOf, isUploadBucket, removeStoredFiles } from "./lib/fileStorage.js";

const ALLOWED_UPLOAD_TYPES: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".txt": ["text/plain"],
  ".csv": ["text/csv", "text/plain", "application/vnd.ms-excel"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = ("." + (file.originalname.split(".").pop() || "")).toLowerCase();
    const allowedMimes = ALLOWED_UPLOAD_TYPES[ext];
    if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Google OAuth FIRST - this sets up session middleware
  await setupGoogleAuth(app);

  // Malformed ids in the URL are "not found", not a database error
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  app.param(['storyId', 'clientId', 'leadId'], (_req, res, next, value) => {
    if (!UUID_RE.test(String(value))) return res.status(404).json({ error: "Not found" });
    next();
  });

  const isFounder = perms.isFounder;
  const legacyRoleColumn = (userType: string) => (userType === 'founder' ? 'admin' : 'editor');
  const requirePayrollView = requireRole(perms.viewPayroll, "Access denied. Founder, HR or Accountant role required.");
  const requirePayrollEdit = requireRole(perms.editPayroll, "Access denied. Founder, HR or Accountant role required.");
  const requireTeamManager = requireRole(perms.manageTeam, "Access denied. Founder or HR role required.");

  // File URLs that belong to a client (proposal, invoice files, story comment attachments).
  // Gathered before a client is removed, because their database rows disappear with it.
  const collectClientFileUrls = async (clientId: string) => {
    const [client, invoices, clientStories] = await Promise.all([
      storage.getClient(clientId),
      storage.getInvoicesByClient(clientId),
      storage.getStoriesByClient(clientId),
    ]);
    const attachments = (await Promise.all(clientStories.map((st) => storage.getCommentsByStory(st.id)))).flat().map((c) => c.attachmentData);
    return [client?.proposalFileData, ...invoices.map((i) => i.fileData), ...attachments];
  };

  // Revenue fields are finance-only (founder, accountant); everyone else's writes to them are dropped
  const stripRevenueFields = (body: any, user: any) => {
    if (perms.viewFinance(user) || !body || typeof body !== 'object') return body;
    const { expectedRevenue, revenueTotal, ...rest } = body;
    return rest;
  };


  // Secure Upload Endpoint - MUST be after setupGoogleAuth for session/auth to work
  app.post("/api/upload", (req: any, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }, (req: any, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err.message || "Invalid upload" });
      next();
    });
  }, async (req: any, res) => {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { bucket } = req.body;
    if (!isUploadBucket(bucket)) {
      return res.status(400).json({ error: "Invalid or missing bucket name" });
    }

    // Invoices need finance access, internal documents are founder-only, matching their API routes
    if ((bucket === 'invoices' && !perms.viewFinance(req.user)) || (bucket === 'documents' && !isFounder(req.user))) {
      return res.status(403).json({ error: "Access denied for this bucket" });
    }

    try {
      const result = await saveFile({
        bucket,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to store the uploaded file" });
    }
  });

  // Authenticated file download. Buckets are private: after the role check we redirect to a 60-second signed URL.
  app.get("/api/files/:bucket/:file", isAuthenticated, async (req: any, res) => {
    const { bucket, file } = req.params;

    if (!isUploadBucket(bucket) || !isValidStoredName(file)) {
      return res.status(404).json({ error: "File not found" });
    }
    if ((bucket === 'invoices' && !perms.viewFinance(req.user)) || (bucket === 'documents' && !isFounder(req.user))) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      const inlineOk = /\.(pdf|png|jpe?g|gif|webp)$/i.test(originalNameOf(file));
      const url = await createDownloadUrl(bucket, file, !inlineOk);
      if (!url) {
        return res.status(404).json({ error: "File not found" });
      }
      res.setHeader("Cache-Control", "private, no-store");
      res.redirect(302, url);
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ error: "Failed to open the file" });
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
      const userIsCoFounder = perms.viewFinance(req.user);
      if (!userIsCoFounder) {
        const sanitized = clientsList.map(c => ({
          ...c,
          expectedRevenue: "0",
          revenueTotal: "0"
        }));
        return res.json(sanitized);
      }
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
      const userIsCoFounder = perms.viewFinance(req.user);
      if (!userIsCoFounder) {
        return res.json({
          ...client,
          expectedRevenue: "0",
          revenueTotal: "0"
        });
      }
      res.json(client);
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.get("/api/clients/:id/timeline", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.params.id;
      
      const canSeeFinance = perms.viewFinance(req.user);
      const [clientStories, clientInvoices, clientComms] = await Promise.all([
        storage.getStoriesByClient(clientId),
        canSeeFinance ? storage.getInvoicesByClient(clientId) : Promise.resolve([]),
        storage.getCommunicationsByClient(clientId),
      ]);
      const allActivity = await storage.getActivityLogByEntities([
        clientId,
        ...clientStories.map(s => s.id),
        ...clientInvoices.map(i => i.id),
      ]);

      const storyIds = new Set(clientStories.map(s => s.id));
      
      const timeline: any[] = [];
      
      // Add stories
      clientStories.forEach(s => {
        timeline.push({ id: `story-${s.id}`, type: 'story', date: s.createdAt, data: s });
      });
      
      // Add invoices
      clientInvoices.forEach(i => {
        timeline.push({ id: `invoice-${i.id}`, type: 'invoice', date: i.createdAt, data: i });
      });
      
      // Add communications
      clientComms.forEach(c => {
        timeline.push({ id: `comm-${c.id}`, type: 'communication', date: c.loggedAt, data: c });
      });
      
      // Add relevant activity
      allActivity.forEach(a => {
        if (!canSeeFinance && a.entityType === 'invoice') return;
        if (
          (a.entityType === 'client' && a.entityId === clientId) ||
          (a.entityType === 'story' && storyIds.has(a.entityId)) ||
          (a.entityType === 'invoice' && clientInvoices.some(i => i.id === a.entityId))
        ) {
          timeline.push({ id: `activity-${a.id}`, type: 'activity', date: a.createdAt, data: a });
        }
      });
      
      // Sort by date descending
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      res.json(timeline);
    } catch (error) {
      console.error('Get timeline error:', error);
      res.status(500).json({ error: "Failed to fetch timeline" });
    }
  });

  app.post("/api/clients/:id/convert-to-lead", isAuthenticated, async (req: any, res) => {
    try {
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Access denied. Only founders can convert clients to leads." });
      }

      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Lead creation and client removal happen in one transaction so a failure can't leave duplicates
      const fileUrls = await collectClientFileUrls(req.params.id);
      const lead = await storage.convertClientToLead(req.params.id, req.user.id);
      if (!lead) {
        return res.status(404).json({ error: "Client not found" });
      }
      await removeStoredFiles(fileUrls);

      await storage.createActivityLog({
        entityType: 'lead',
        entityId: lead.id,
        action: 'created',
        userId: req.user.id,
        details: `Converted client "${client.name}" back into a lead.`,
      });

      res.status(201).json(lead);
    } catch (error) {
      console.error('Convert client to lead error:', error);
      res.status(500).json({ error: "Failed to convert client to lead. Please try again." });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertClientSchema.parse(stripRevenueFields(req.body, req.user));
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
      const data = updateClientSchema.parse(stripRevenueFields(req.body, req.user));
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Access denied. Only founders can delete clients." });
      }
      const existing = await storage.getClient(req.params.id);
      // Collect file URLs first: the database rows cascade away with the client
      const fileUrls = await collectClientFileUrls(req.params.id);
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      await removeStoredFiles(fileUrls);
      await storage.createActivityLog({
        entityType: 'client',
        entityId: req.params.id,
        action: 'deleted',
        userId: req.user.id,
        details: `Deleted client: ${existing?.name || req.params.id}`,
      });
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
      // Finished repeating tasks older than a week would bury the boards; they stay in the history and the overview
      const weekAgo = Date.now() - 7 * 86400000;
      res.json(storiesList.filter((s) => !(s.recurringTaskId && s.status === 'Done' && new Date(s.updatedAt).getTime() < weekAgo)));
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
        recurringTaskId: undefined, // only the repeating-task generator may link a story to a rule
        occurrenceDate: undefined,
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
      const body = { ...req.body };
      delete body.recurringTaskId;
      delete body.occurrenceDate;
      if (body.dueDate) {
        body.dueDate = new Date(body.dueDate);
      }
      const data = updateStorySchema.parse(body);
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
      if (!perms.manageTeam(req.user)) {
        return res.status(403).json({ error: "Access denied. Only admins can delete stories." });
      }
      const existing = await storage.getStory(req.params.id);
      const storyComments = await storage.getCommentsByStory(req.params.id);
      const success = await storage.deleteStory(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Story not found" });
      }
      await removeStoredFiles(storyComments.map((c) => c.attachmentData));
      await storage.createActivityLog({
        entityType: 'story',
        entityId: req.params.id,
        action: 'deleted',
        userId: req.user.id,
        details: `Deleted story: ${existing?.title || req.params.id}`,
      });
      res.status(204).send();
    } catch (error) {
      console.error('Delete story error:', error);
      res.status(500).json({ error: "Failed to delete story" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Founders and HR can delete employees
      const user = req.user;
      const isAuthorized = perms.manageTeam(user);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Access denied. Admin role required to delete employees." });
      }

      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: "You cannot delete your own account." });
      }
      const target = await storage.getUser(req.params.id);
      if (target && isFounder(target) && !isFounder(user)) {
        return res.status(403).json({ error: "Only founders can delete founders." });
      }

      await storage.deleteUser(req.params.id, req.user.id);

      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'user',
          entityId: req.params.id,
          action: 'deleted',
          userId: req.user.id,
          details: `Deleted user ${req.params.id}`,
        });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Delete user error:', error?.message || error);
      res.status(500).json({ error: "Failed to delete user" });
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
      // Author identity always comes from the session, never from the request body
      const data = insertCommentSchema.parse({
        ...req.body,
        storyId: req.params.storyId,
        authorId: req.user.id,
        authorName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : req.user.email,
      });
      const comment = await storage.createComment(data);

      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'comment',
          entityId: comment.id,
          action: 'created',
          userId: req.user.id,
          details: `Added comment to story`,
        });
      }

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

      if (!data.recipientEmail) {
        return res.status(400).json({ error: "Client has no contact email" });
      }
      if (!isEmailConfigured()) {
        return res.status(503).json({ error: "Email is not configured on the server" });
      }
      try {
        await sendEmail({
          to: data.recipientEmail,
          subject: data.subject,
          text: data.body,
          replyTo: req.user.email || undefined,
        });
      } catch (mailErr) {
        console.error('SMTP send error:', mailErr);
        return res.status(502).json({ error: "Failed to send email" });
      }

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

  // Lead Comments
  app.get("/api/leads/:leadId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const commentsList = await storage.getLeadCommentsByLead(req.params.leadId);
      res.json(commentsList);
    } catch (error) {
      console.error('Get lead comments error:', error);
      res.status(500).json({ error: "Failed to fetch lead comments" });
    }
  });

  app.post("/api/leads/:leadId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertLeadCommentSchema.parse({
        ...req.body,
        leadId: req.params.leadId,
        authorId: req.user.id,
        authorName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : req.user.email,
        createdAt: new Date(),
      });
      const comment = await storage.createLeadComment(data);
      
      // Update the lead's updatedAt timestamp to power the "Last Contacted" badge
      await storage.updateLead(req.params.leadId, { updatedAt: new Date() });

      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'lead',
          entityId: req.params.leadId,
          action: 'commented',
          userId: req.user.id,
          details: `Added a note to lead: ${req.body.body.substring(0, 50)}...`,
        });
      }

      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create lead comment error:', error);
      res.status(500).json({ error: "Failed to add note to lead" });
    }
  });

  // AI Proposal Analysis (protected)
  app.post("/api/analyze-proposal", isAuthenticated, async (req: any, res) => {
    try {
      const { proposalText, clientName } = req.body;

      if (typeof proposalText !== 'string' || typeof clientName !== 'string' || !proposalText || !clientName) {
        return res.status(400).json({ error: "proposalText and clientName are required" });
      }
      if (proposalText.length > 30000 || clientName.length > 200) {
        return res.status(400).json({ error: "Input too long" });
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

      if (!Array.isArray(tasks) || tasks.length === 0 || tasks.length > 50) {
        return res.status(400).json({ error: "tasks array is required (max 50)" });
      }
      if (!(await storage.getClient(clientId))) {
        return res.status(404).json({ error: "Client not found" });
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
      const parsedLimit = parseInt(req.query.limit as string, 10);
      const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 10;
      let logs = await storage.getActivityLog(limit);
      // Invoice entries carry amounts: finance roles only
      if (!perms.viewFinance(req.user)) {
        logs = (await storage.getActivityLog(limit * 3)).filter((l) => l.entityType !== 'invoice').slice(0, limit);
      }
      res.json(logs);
    } catch (error) {
      console.error('Get activity error:', error);
      res.status(500).json({ error: "Failed to fetch activity log" });
    }
  });

  // Invoices (all protected with authentication)
  app.get("/api/clients/:clientId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      if (!perms.viewFinance(req.user)) {
        return res.status(403).json({ error: "Access denied. Only founders and accountants can access invoices." });
      }
      const invoicesList = await storage.getInvoicesByClient(req.params.clientId);
      res.json(invoicesList);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/clients/:clientId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      if (!perms.viewFinance(req.user)) {
        return res.status(403).json({ error: "Access denied. Only founders and accountants can access invoices." });
      }
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
      if (!perms.viewFinance(req.user)) {
        return res.status(403).json({ error: "Access denied. Only founders and accountants can access invoices." });
      }
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
      if (!perms.viewFinance(req.user)) {
        return res.status(403).json({ error: "Access denied. Only founders and accountants can access invoices." });
      }
      const invoice = await storage.getInvoice(req.params.id);
      const success = await storage.deleteInvoice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      await removeStoredFiles([invoice?.fileData]);

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

  // ---- Repeating tasks (founders only) ----
  const requireFounder = requireRole(perms.isFounder, "Founders only.");
  const validTargets = async (data: { team?: string | null; assigneeIds: string[] }) => {
    if (data.team && !isTeam(data.team)) return "Unknown team.";
    if (!data.team) {
      const ids = new Set((await storage.getAllUsers()).map((u) => u.id));
      if (data.assigneeIds.some((id) => !ids.has(id))) return "One of the chosen people no longer exists.";
    }
    return null;
  };

  app.get("/api/recurring-tasks", requireFounder, async (_req, res) => {
    try {
      res.json(await storage.listRecurringTasks());
    } catch (error) {
      console.error('List recurring tasks error:', error);
      res.status(500).json({ error: "Failed to fetch repeating tasks" });
    }
  });

  app.post("/api/recurring-tasks", requireFounder, async (req: any, res) => {
    try {
      const data = recurringTaskInputSchema.parse(req.body);
      const bad = await validTargets(data);
      if (bad) return res.status(400).json({ error: bad });
      if (!(await storage.getClient(data.clientId))) return res.status(404).json({ error: "Client not found" });
      const task = await storage.createRecurringTask({ ...data, startDate: data.startDate || istDate() }, req.user.id);
      const created = await generateRecurringStories(); // today's story appears straight away
      res.status(201).json({ task, created });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: error.errors.map((e) => e.message).join('. ') });
      console.error('Create recurring task error:', error);
      res.status(500).json({ error: "Failed to create the repeating task" });
    }
  });

  app.patch("/api/recurring-tasks/:id", requireFounder, async (req: any, res) => {
    try {
      const body = req.body || {};
      const onlyToggle = Object.keys(body).length === 1 && typeof body.active === 'boolean';
      let patch: any;
      if (onlyToggle) {
        patch = { active: body.active };
      } else {
        const data = recurringTaskInputSchema.parse(body);
        const bad = await validTargets(data);
        if (bad) return res.status(400).json({ error: bad });
        patch = { ...data, assigneeIds: data.team ? [] : data.assigneeIds, excludeIds: data.team ? data.excludeIds : [], team: data.team || null, dueTime: data.dueTime || null, endDate: data.endDate || null };
        if (!data.startDate) delete patch.startDate;
      }
      const task = await storage.updateRecurringTask(req.params.id, patch);
      if (!task) return res.status(404).json({ error: "Repeating task not found" });
      const created = task.active ? await generateRecurringStories() : 0;
      res.json({ task, created });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: error.errors.map((e) => e.message).join('. ') });
      console.error('Update recurring task error:', error);
      res.status(500).json({ error: "Failed to update the repeating task" });
    }
  });

  app.delete("/api/recurring-tasks/:id", requireFounder, async (req, res) => {
    try {
      if (!(await storage.deleteRecurringTask(req.params.id))) return res.status(404).json({ error: "Repeating task not found" });
      res.status(204).send(); // stories already created stay where they are
    } catch (error) {
      console.error('Delete recurring task error:', error);
      res.status(500).json({ error: "Failed to delete the repeating task" });
    }
  });

  // ---- Employee services: leave, work from home, overtime ----
  app.get("/api/requests", isAuthenticated, async (req: any, res) => {
    try {
      const seeAll = req.query.scope === 'all' && (perms.manageTeam(req.user) || perms.viewPayroll(req.user));
      res.json(await storage.listEmployeeRequests(seeAll ? {} : { userId: req.user.id }));
    } catch (error) {
      console.error('List requests error:', error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  app.post("/api/requests", isAuthenticated, async (req: any, res) => {
    try {
      const data = employeeRequestInputSchema.parse(req.body);
      const today = istDate();
      if (data.startDate < addDays(today, -30)) return res.status(400).json({ error: "You can only raise requests for the last 30 days." });
      if (data.startDate > addDays(today, 365)) return res.status(400).json({ error: "That date is too far ahead." });
      if (data.type === 'ot' && data.startDate > today) return res.status(400).json({ error: "Overtime can only be logged for today or earlier." });
      if (data.type !== 'ot' && data.endDate && data.endDate > addDays(data.startDate, 60)) return res.status(400).json({ error: "A single request can cover at most 60 days." });
      const row = await storage.createEmployeeRequest(req.user.id, data);
      await storage.createActivityLog({ entityType: 'request', entityId: row.id, action: 'created', userId: req.user.id, details: `Raised ${data.type === 'ot' ? 'overtime' : data.type === 'wfh' ? 'work from home' : 'leave'} request for ${data.startDate}${row.endDate !== row.startDate ? ' to ' + row.endDate : ''}` });
      res.status(201).json(row);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: error.errors.map((e) => e.message).join('. ') });
      console.error('Create request error:', error);
      res.status(500).json({ error: "Failed to raise the request" });
    }
  });

  app.patch("/api/requests/:id", requireTeamManager, async (req: any, res) => {
    try {
      const status = req.body?.status;
      if (status !== 'approved' && status !== 'rejected') return res.status(400).json({ error: "Status must be approved or rejected." });
      const existing = await storage.getEmployeeRequest(req.params.id);
      if (!existing) return res.status(404).json({ error: "Request not found" });
      if (existing.userId === req.user.id && !perms.isFounder(req.user)) return res.status(403).json({ error: "You cannot approve your own request." });
      const note = typeof req.body.note === 'string' && req.body.note.trim() ? req.body.note.trim().slice(0, 500) : null;
      const row = await storage.decideEmployeeRequest(req.params.id, status, req.user.id, note);
      if (!row) return res.status(409).json({ error: "This request was already decided." });
      await storage.createActivityLog({ entityType: 'request', entityId: row.id, action: status, userId: req.user.id, details: `${status === 'approved' ? 'Approved' : 'Rejected'} a ${row.type === 'ot' ? 'overtime' : row.type === 'wfh' ? 'work from home' : 'leave'} request` });
      res.json(row);
    } catch (error) {
      console.error('Decide request error:', error);
      res.status(500).json({ error: "Failed to update the request" });
    }
  });

  app.delete("/api/requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getEmployeeRequest(req.params.id);
      if (!existing) return res.status(404).json({ error: "Request not found" });
      if (existing.userId !== req.user.id) return res.status(403).json({ error: "You can only withdraw your own requests." });
      if (existing.status !== 'pending') return res.status(409).json({ error: "Only pending requests can be withdrawn." });
      await storage.deleteEmployeeRequest(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete request error:', error);
      res.status(500).json({ error: "Failed to withdraw the request" });
    }
  });

  // Founder overview: what happened per team and per person (founders only)
  app.get("/api/overview", isAuthenticated, async (req: any, res) => {
    try {
      if (!perms.isFounder(req.user)) return res.status(403).json({ error: "Founders only." });
      const period = isPeriod(req.query.period) ? req.query.period : "today";
      // Fetch a bit more than the period so "last active" has something to show
      const since = new Date(Math.min(periodRange(period).start.getTime(), Date.now() - 35 * 86400000));
      const [users, stories, clients, comments, activity, requests] = await Promise.all([
        storage.getAllUsers(), storage.getStories(), storage.getClients(), storage.getCommentsSince(since), storage.getActivitySince(since), storage.listEmployeeRequests(),
      ]);
      res.json(computeOverview({ users, stories, clients, comments, activity, requests, period }));
    } catch (error) {
      console.error('Overview error:', error);
      res.status(500).json({ error: "Failed to build the overview" });
    }
  });

  // Comments that @mention the signed-in person (never anyone else's)
  app.get("/api/mentions", isAuthenticated, async (req: any, res) => {
    try {
      res.json(await storage.getMentions(req.user.id, nameOf(req.user), new Date(Date.now() - 14 * 86400000)));
    } catch (error) {
      console.error('Mentions error:', error);
      res.status(500).json({ error: "Failed to fetch mentions" });
    }
  });

  // Users (for internal dashboard - founders only, verified by email allowlist)
  app.get("/api/analytics/team", isAuthenticated, async (req: any, res) => {
    try {
      if (!perms.manageTeam(req.user)) {
        return res.status(403).json({ error: "Access denied. Admin or HR role required." });
      }

      const allUsers = await storage.getAllUsers();
      const allStories = await storage.getStories();
      
      const teamStats = allUsers.map(u => {
        const userStories = allStories.filter(s => s.assignedTo === u.id || (!s.assignedTo && s.person?.toLowerCase() === `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase()));
        
        const completedStories = userStories.filter(s => s.status === 'Done');
        const overdueStories = userStories.filter(s => s.status !== 'Done' && new Date(s.dueDate) < new Date());
        const totalEstimatedHours = userStories.reduce((acc, s) => acc + (s.estimatedEffortHours || 0), 0);
        
        return {
          user: u,
          totalAssigned: userStories.length,
          completed: completedStories.length,
          overdue: overdueStories.length,
          totalEstimatedHours,
        };
      });

      res.json(teamStats);
    } catch (error) {
      console.error('Get team analytics error:', error);
      res.status(500).json({ error: "Failed to fetch team analytics" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const usersList = await storage.getAllUsers();
      // Everyone needs names to assign tasks; contact details and shareholding are for managers only
      if (!perms.manageTeam(req.user) && !perms.viewPayroll(req.user)) {
        return res.json(usersList.map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          profileImageUrl: u.profileImageUrl,
          userType: u.userType,
          role: u.role,
        })));
      }
      res.json(usersList);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireTeamManager, async (req: any, res) => {
    try {
      const { firstName, lastName, email, userType } = req.body;
      if (!firstName || !lastName) {
        return res.status(400).json({ error: "firstName and lastName are required" });
      }
      const type = userType || 'employee';
      if (!isRole(type)) {
        return res.status(400).json({ error: `Invalid userType. Use one of: ${ROLES.join(', ')}` });
      }
      if (type === 'founder' && !isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can create founders." });
      }
      const user = await storage.createEmployee({
        firstName,
        lastName,
        email: email ? String(email).trim().toLowerCase() : null,
        userType: type,
        role: legacyRoleColumn(type),
      });
      res.status(201).json(user);
    } catch (error) {
      if ((error as any)?.code === '23505') {
        return res.status(409).json({ error: "A team member with this email already exists." });
      }
      console.error('Create employee error:', error);
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!perms.manageTeam(req.user)) {
        return res.status(403).json({ error: "Access denied. Founder or HR role required." });
      }

      const data = updateUserProfileSchema.parse(req.body);
      if (data.userType !== undefined && !isRole(data.userType)) {
        return res.status(400).json({ error: `Invalid userType. Use one of: ${ROLES.join(', ')}` });
      }
      if (data.team !== undefined && data.team !== null && data.team !== '' && !isTeam(data.team)) {
        return res.status(400).json({ error: "Unknown team." });
      }
      if (data.team === '') data.team = null;
      if (data.workPattern !== undefined && !isWorkPattern(data.workPattern)) {
        return res.status(400).json({ error: "Unknown work pattern." });
      }

      const target = await storage.getUser(req.params.id);
      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }

      // Promoting to, demoting, or editing a founder is reserved for founders (HR must not self-escalate)
      if (!isFounder(req.user)) {
        if (data.userType === 'founder' || isFounder(target) || data.shareholdingPercent !== undefined) {
          return res.status(403).json({ error: "Only founders can change founder status or shareholding." });
        }
      }
      // Never leave the company without a founder
      if (isFounder(target) && data.userType !== undefined && data.userType !== 'founder') {
        const founders = (await storage.getAllUsers()).filter((u) => isFounder(u));
        if (founders.length <= 1) {
          return res.status(400).json({ error: "There must be at least one founder." });
        }
      }
      const user = await storage.updateUserProfile(
        req.params.id,
        (data.userType ? { ...data, role: legacyRoleColumn(data.userType) } : data) as any
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'user',
          entityId: user.id,
          action: 'updated',
          userId: req.user.id,
          details: `Updated user profile for ${user.firstName || user.email}`,
        });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can view investments" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can add investments" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can update investments" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can delete investments" });
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

  // Internal Documents (founders only)
  app.get("/api/internal-documents", isAuthenticated, async (req: any, res) => {
    try {
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can view documents" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can add documents" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can update documents" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can delete documents" });
      }

      const doc = await storage.getInternalDocument(req.params.id);
      const success = await storage.deleteInternalDocument(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Document not found" });
      }
      await removeStoredFiles([doc?.fileData]);

      res.status(204).send();
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Leads (read: all authenticated; write: founders only)
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can create leads" });
      }
      const data = insertLeadSchema.parse({ ...req.body, ownerId: req.user.id });
      const lead = await storage.createLead(data);

      if (req.user?.id) {
        await storage.createActivityLog({
          entityType: 'lead',
          entityId: lead.id,
          action: 'created',
          userId: req.user.id,
          details: `Created lead: ${lead.name}`,
        });
      }

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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can update leads" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can delete leads" });
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

  // Revenue Targets (founders only)
  app.get("/api/revenue-targets", isAuthenticated, async (req: any, res) => {
    try {
      if (!perms.viewFinance(req.user)) {
        return res.status(403).json({ error: "Only founders and accountants can view revenue targets" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can set revenue targets" });
      }
      const data = insertRevenueTargetSchema.parse({
        ...req.body,
        ownerId: req.user.id,
      });
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
        loggedBy: req.user.firstName || req.user.email || req.user.id,
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
      if (!perms.manageTeam(req.user)) {
        return res.status(403).json({ error: "Access denied. Only admins can delete communication logs." });
      }
      if (!UUID_RE.test(req.params.id)) {
        return res.status(404).json({ error: "Communication not found" });
      }
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

  // Announcements (read: all authenticated; write: founders only)
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can post announcements" });
      }
      const data = insertAnnouncementSchema.parse({
        ...req.body,
        postedBy: req.user.firstName || req.user.email || req.user.id,
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can update announcements" });
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
      if (!isFounder(req.user)) {
        return res.status(403).json({ error: "Only founders can delete announcements" });
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

  // ─── Salary Records (Owner + HR only) ───────────────────────────────────────
  app.get("/api/salary-records", requirePayrollView, async (req: any, res) => {
    try {
      const { employeeId } = req.query;
      const records = await storage.getSalaryRecords(employeeId as string | undefined);
      res.json(records);
    } catch (error) {
      console.error('Get salary records error:', error);
      res.status(500).json({ error: "Failed to fetch salary records" });
    }
  });

  app.post("/api/salary-records", requirePayrollEdit, async (req: any, res) => {
    try {
      const data = insertSalaryRecordSchema.parse({ ...req.body, createdBy: req.user.id });
      const record = await storage.createSalaryRecord(data);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: error.errors });
      console.error('Create salary record error:', error);
      res.status(500).json({ error: "Failed to create salary record" });
    }
  });

  app.patch("/api/salary-records/:id", requirePayrollEdit, async (req: any, res) => {
    try {
      const data = updateSalaryRecordSchema.parse(req.body);
      const record = await storage.updateSalaryRecord(req.params.id, data);
      if (!record) return res.status(404).json({ error: "Salary record not found" });
      res.json(record);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: error.errors });
      console.error('Update salary record error:', error);
      res.status(500).json({ error: "Failed to update salary record" });
    }
  });

  app.delete("/api/salary-records/:id", requirePayrollEdit, async (req: any, res) => {
    try {
      const success = await storage.deleteSalaryRecord(req.params.id);
      if (!success) return res.status(404).json({ error: "Salary record not found" });
      res.status(204).send();
    } catch (error) {
      console.error('Delete salary record error:', error);
      res.status(500).json({ error: "Failed to delete salary record" });
    }
  });

  // ─── Incentives (Owner + HR only) ───────────────────────────────────────────
  app.get("/api/incentives", requirePayrollView, async (req: any, res) => {
    try {
      const { employeeId } = req.query;
      const records = await storage.getIncentives(employeeId as string | undefined);
      res.json(records);
    } catch (error) {
      console.error('Get incentives error:', error);
      res.status(500).json({ error: "Failed to fetch incentives" });
    }
  });

  app.post("/api/incentives", requirePayrollEdit, async (req: any, res) => {
    try {
      const data = insertIncentiveSchema.parse({ ...req.body, createdBy: req.user.id });
      const incentive = await storage.createIncentive(data);
      res.status(201).json(incentive);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: error.errors });
      console.error('Create incentive error:', error);
      res.status(500).json({ error: "Failed to create incentive" });
    }
  });

  app.patch("/api/incentives/:id", requirePayrollEdit, async (req: any, res) => {
    try {
      const data = updateIncentiveSchema.parse(req.body);
      const incentive = await storage.updateIncentive(req.params.id, data);
      if (!incentive) return res.status(404).json({ error: "Incentive not found" });
      res.json(incentive);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: error.errors });
      console.error('Update incentive error:', error);
      res.status(500).json({ error: "Failed to update incentive" });
    }
  });

  app.delete("/api/incentives/:id", requirePayrollEdit, async (req: any, res) => {
    try {
      const success = await storage.deleteIncentive(req.params.id);
      if (!success) return res.status(404).json({ error: "Incentive not found" });
      res.status(204).send();
    } catch (error) {
      console.error('Delete incentive error:', error);
      res.status(500).json({ error: "Failed to delete incentive" });
    }
  });

  // ─── Cron: Deadline Notifications ───────────────────────────────────────────
  // Called by Vercel Cron daily — sends email reminders for tasks due within 24h
  app.get("/api/cron/check-deadlines", async (req: any, res) => {
    try {
      // Verify cron secret to prevent unauthorized calls
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        return res.status(503).json({ error: "Cron is disabled: CRON_SECRET is not configured" });
      }
      if (req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const result = await sendDeadlineReminders();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Cron deadline check error:', error);
      res.status(500).json({ error: "Failed to run deadline check" });
    }
  });

  return httpServer;
}
