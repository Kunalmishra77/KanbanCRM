import { 
  type User, type InsertUser,
  type Client, type InsertClient, type UpdateClient,
  type Story, type InsertStory, type UpdateStory,
  type Comment, type InsertComment,
  type ActivityLog, type InsertActivityLog,
  users, clients, stories, comments, activityLog
} from "@shared/schema";
import { db } from "../db/index";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: UpdateClient): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Stories
  getStories(): Promise<Story[]>;
  getStoriesByClient(clientId: string): Promise<Story[]>;
  getStory(id: string): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: string, story: UpdateStory): Promise<Story | undefined>;
  deleteStory(id: string): Promise<boolean>;
  
  // Comments
  getCommentsByStory(storyId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Activity Log
  getActivityLog(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.updatedAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updateClient: UpdateClient): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ ...updateClient, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result.length > 0;
  }

  // Stories
  async getStories(): Promise<Story[]> {
    return db.select().from(stories).orderBy(desc(stories.updatedAt));
  }

  async getStoriesByClient(clientId: string): Promise<Story[]> {
    return db.select().from(stories).where(eq(stories.clientId, clientId)).orderBy(desc(stories.updatedAt));
  }

  async getStory(id: string): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story;
  }

  async createStory(insertStory: InsertStory): Promise<Story> {
    const [story] = await db.insert(stories).values(insertStory).returning();
    return story;
  }

  async updateStory(id: string, updateStory: UpdateStory): Promise<Story | undefined> {
    const [story] = await db
      .update(stories)
      .set({ ...updateStory, updatedAt: new Date() })
      .where(eq(stories.id, id))
      .returning();
    return story;
  }

  async deleteStory(id: string): Promise<boolean> {
    const result = await db.delete(stories).where(eq(stories.id, id));
    return result.length > 0;
  }

  // Comments
  async getCommentsByStory(storyId: string): Promise<Comment[]> {
    return db.select().from(comments).where(eq(comments.storyId, storyId)).orderBy(comments.createdAt);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  // Activity Log
  async getActivityLog(limit: number = 10): Promise<ActivityLog[]> {
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(activityLog).values(insertLog).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
