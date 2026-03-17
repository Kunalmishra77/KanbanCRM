import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, uuid, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default('editor'),
  userType: text("user_type").notNull().default('employee'),
  shareholdingPercent: numeric("shareholding_percent").default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const updateUserProfileSchema = createInsertSchema(users).pick({ userType: true, shareholdingPercent: true }).partial();
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type User = typeof users.$inferSelect;

// Clients table
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerId: varchar("owner_id", { length: 255 }).references(() => users.id).notNull(),
  industry: text("industry").notNull(),
  stage: text("stage").notNull().default('Warm'),
  averageProgress: numeric("average_progress").default('0').notNull(),
  expectedRevenue: numeric("expected_revenue").default('0').notNull(),
  revenueTotal: numeric("revenue_total").default('0').notNull(),
  notes: text("notes"),
  proposalFileName: text("proposal_file_name"),
  proposalFileData: text("proposal_file_data"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contractEndDate: timestamp("contract_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const updateClientSchema = insertClientSchema.partial();
export type InsertClient = z.infer<typeof insertClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type Client = typeof clients.$inferSelect;

// Stories table
export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(''),
  assignedTo: varchar("assigned_to", { length: 255 }).references(() => users.id),
  priority: text("priority").notNull().default('Medium'),
  estimatedEffortHours: integer("estimated_effort_hours").default(0).notNull(),
  actualHoursSpent: numeric("actual_hours_spent").default('0'),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default('To Do'),
  progressPercent: integer("progress_percent").default(0).notNull(),
  person: text("person").notNull().default(''),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStorySchema = createInsertSchema(stories).omit({ id: true, createdAt: true, updatedAt: true });
export const updateStorySchema = insertStorySchema.partial();
export type InsertStory = z.infer<typeof insertStorySchema>;
export type UpdateStory = z.infer<typeof updateStorySchema>;
export type Story = typeof stories.$inferSelect;

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: uuid("story_id").references(() => stories.id, { onDelete: 'cascade' }).notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorName: varchar("author_name", { length: 255 }),
  body: text("body").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  attachmentData: text("attachment_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("idx_comments_story_id").on(table.storyId)]);

export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Activity Log table
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// Invoices table
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  label: text("label").notNull(),
  amount: numeric("amount").notNull(),
  issuedOn: timestamp("issued_on").defaultNow().notNull(),
  status: text("status").notNull().default('pending'),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileData: text("file_data"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const updateInvoiceSchema = insertInvoiceSchema.partial();
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Founder Investments table (for tracking co-founder investments in the company)
export const founderInvestments = pgTable("founder_investments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id).notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  investedOn: timestamp("invested_on").defaultNow().notNull(),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileData: text("file_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFounderInvestmentSchema = createInsertSchema(founderInvestments).omit({ id: true, createdAt: true, updatedAt: true });
export const updateFounderInvestmentSchema = insertFounderInvestmentSchema.partial();
export type InsertFounderInvestment = z.infer<typeof insertFounderInvestmentSchema>;
export type UpdateFounderInvestment = z.infer<typeof updateFounderInvestmentSchema>;
export type FounderInvestment = typeof founderInvestments.$inferSelect;

// Internal Documents table (for co-founders to store company documents)
export const internalDocuments = pgTable("internal_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default('General'),
  uploadedById: varchar("uploaded_by_id", { length: 255 }).references(() => users.id).notNull(),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileData: text("file_data"),
  externalLink: text("external_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInternalDocumentSchema = createInsertSchema(internalDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export const updateInternalDocumentSchema = insertInternalDocumentSchema.partial();
export type InsertInternalDocument = z.infer<typeof insertInternalDocumentSchema>;
export type UpdateInternalDocument = z.infer<typeof updateInternalDocumentSchema>;
export type InternalDocument = typeof internalDocuments.$inferSelect;

// Sent Emails table (to track emails generated/sent from stories)
export const sentEmails = pgTable("sent_emails", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: uuid("story_id").references(() => stories.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  sentById: varchar("sent_by_id", { length: 255 }).references(() => users.id).notNull(),
  recipientEmail: text("recipient_email"),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default('drafted'),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSentEmailSchema = createInsertSchema(sentEmails).omit({ id: true, createdAt: true });
export type InsertSentEmail = z.infer<typeof insertSentEmailSchema>;
export type SentEmail = typeof sentEmails.$inferSelect;

// Leads table (sales pipeline before becoming a client)
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  industry: text("industry"),
  stage: text("stage").notNull().default('New'),
  estimatedValue: numeric("estimated_value").default('0'),
  notes: text("notes"),
  ownerId: varchar("owner_id", { length: 255 }).references(() => users.id).notNull(),
  assignedTo: varchar("assigned_to", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export const updateLeadSchema = insertLeadSchema.partial();
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Revenue Targets table (monthly targets set by owner)
export const revenueTargets = pgTable("revenue_targets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  period: text("period").notNull(), // YYYY-MM
  targetAmount: numeric("target_amount").notNull(),
  ownerId: varchar("owner_id", { length: 255 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRevenueTargetSchema = createInsertSchema(revenueTargets).omit({ id: true, createdAt: true });
export const updateRevenueTargetSchema = insertRevenueTargetSchema.partial();
export type InsertRevenueTarget = z.infer<typeof insertRevenueTargetSchema>;
export type UpdateRevenueTarget = z.infer<typeof updateRevenueTargetSchema>;
export type RevenueTarget = typeof revenueTargets.$inferSelect;

// Client Communications table (call/meeting/email log)
export const clientCommunications = pgTable("client_communications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull().default('call'), // call | meeting | email | note | whatsapp
  summary: text("summary").notNull(),
  loggedBy: text("logged_by").notNull(),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

export const insertClientCommunicationSchema = createInsertSchema(clientCommunications).omit({ id: true, loggedAt: true });
export const updateClientCommunicationSchema = insertClientCommunicationSchema.partial();
export type InsertClientCommunication = z.infer<typeof insertClientCommunicationSchema>;
export type ClientCommunication = typeof clientCommunications.$inferSelect;

// Announcements table (owner posts notices visible to all)
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  body: text("body").notNull(),
  postedBy: text("posted_by").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true, updatedAt: true });
export const updateAnnouncementSchema = insertAnnouncementSchema.partial();
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type UpdateAnnouncement = z.infer<typeof updateAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;
