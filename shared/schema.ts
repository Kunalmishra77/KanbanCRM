import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, uuid, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default('editor'),
  googleId: text("google_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Clients table
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  industry: text("industry").notNull(),
  stage: text("stage").notNull().default('Warm'),
  averageProgress: numeric("average_progress").default('0').notNull(),
  revenueTotal: numeric("revenue_total").default('0').notNull(),
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
  assignedTo: uuid("assigned_to").references(() => users.id),
  priority: text("priority").notNull().default('Medium'),
  estimatedEffortHours: integer("estimated_effort_hours").default(0).notNull(),
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
  authorId: uuid("author_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Activity Log table
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
