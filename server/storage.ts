import {
  type User, type InsertUser, type UpsertUser, type UpdateUserProfile,
  type Client, type InsertClient, type UpdateClient,
  type Story, type InsertStory, type UpdateStory,
  type Comment, type InsertComment,
  type ActivityLog, type InsertActivityLog,
  type Invoice, type InsertInvoice, type UpdateInvoice,
  type FounderInvestment, type InsertFounderInvestment, type UpdateFounderInvestment,
  type SentEmail, type InsertSentEmail,
  type InternalDocument, type InsertInternalDocument, type UpdateInternalDocument,
  type Lead, type InsertLead, type UpdateLead,
  type RevenueTarget, type InsertRevenueTarget,
  type ClientCommunication, type InsertClientCommunication,
  type Announcement, type InsertAnnouncement, type UpdateAnnouncement,
  type SalaryRecord, type InsertSalaryRecord, type UpdateSalaryRecord,
  type Incentive, type InsertIncentive, type UpdateIncentive,
  users, clients, stories, comments, activityLog, invoices, founderInvestments, sentEmails, internalDocuments,
  leads, revenueTargets, clientCommunications, announcements, salaryRecords, incentives
} from "../shared/schema.js";
import { db } from "../db/index.js";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: UpdateUserProfile): Promise<User | undefined>;
  
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
  
  // Invoices
  getInvoicesByClient(clientId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: UpdateInvoice): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  recalculateClientRevenue(clientId: string): Promise<void>;
  
  // Founder Investments
  getFounderInvestments(): Promise<FounderInvestment[]>;
  getFounderInvestmentsByUser(userId: string): Promise<FounderInvestment[]>;
  getFounderInvestment(id: string): Promise<FounderInvestment | undefined>;
  createFounderInvestment(investment: InsertFounderInvestment): Promise<FounderInvestment>;
  updateFounderInvestment(id: string, investment: UpdateFounderInvestment): Promise<FounderInvestment | undefined>;
  deleteFounderInvestment(id: string): Promise<boolean>;
  
  // Sent Emails
  getSentEmailsByStory(storyId: string): Promise<SentEmail[]>;
  getSentEmailsByClient(clientId: string): Promise<SentEmail[]>;
  createSentEmail(email: InsertSentEmail): Promise<SentEmail>;
  
  // Internal Documents
  getInternalDocuments(): Promise<InternalDocument[]>;
  getInternalDocument(id: string): Promise<InternalDocument | undefined>;
  createInternalDocument(doc: InsertInternalDocument): Promise<InternalDocument>;
  updateInternalDocument(id: string, doc: UpdateInternalDocument): Promise<InternalDocument | undefined>;
  deleteInternalDocument(id: string): Promise<boolean>;

  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: UpdateLead): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Revenue Targets
  getRevenueTargets(): Promise<RevenueTarget[]>;
  getRevenueTarget(period: string): Promise<RevenueTarget | undefined>;
  upsertRevenueTarget(target: InsertRevenueTarget): Promise<RevenueTarget>;

  // Client Communications
  getCommunicationsByClient(clientId: string): Promise<ClientCommunication[]>;
  createClientCommunication(comm: InsertClientCommunication): Promise<ClientCommunication>;
  deleteClientCommunication(id: string): Promise<boolean>;

  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(ann: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, ann: UpdateAnnouncement): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;

  // Salary Records
  getSalaryRecords(employeeId?: string): Promise<SalaryRecord[]>;
  getSalaryRecord(id: string): Promise<SalaryRecord | undefined>;
  createSalaryRecord(record: InsertSalaryRecord): Promise<SalaryRecord>;
  updateSalaryRecord(id: string, record: UpdateSalaryRecord): Promise<SalaryRecord | undefined>;
  deleteSalaryRecord(id: string): Promise<boolean>;

  // Incentives
  getIncentives(employeeId?: string): Promise<Incentive[]>;
  getIncentive(id: string): Promise<Incentive | undefined>;
  createIncentive(incentive: InsertIncentive): Promise<Incentive>;
  updateIncentive(id: string, incentive: UpdateIncentive): Promise<Incentive | undefined>;
  deleteIncentive(id: string): Promise<boolean>;

  // Deadline queries (for notification service)
  getStoriesWithUpcomingDeadlines(hoursAhead: number): Promise<Story[]>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.firstName);
  }

  async createEmployee(data: { firstName: string; lastName: string; email?: string | null; userType: string; role: string }): Promise<User> {
    const { randomUUID } = await import('crypto');
    const [user] = await db.insert(users).values({
      id: randomUUID(),
      ...data,
    }).returning();
    return user;
  }

  async updateUserProfile(id: string, data: UpdateUserProfile): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
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
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
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
    const result = await db.delete(stories).where(eq(stories.id, id)).returning();
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

  // Invoices
  async getInvoicesByClient(clientId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.clientId, clientId)).orderBy(desc(invoices.issuedOn));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    await this.recalculateClientRevenue(insertInvoice.clientId);
    return invoice;
  }

  async updateInvoice(id: string, updateInvoice: UpdateInvoice): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...updateInvoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    if (invoice) {
      await this.recalculateClientRevenue(invoice.clientId);
    }
    return invoice;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return false;
    
    const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    if (result.length > 0) {
      await this.recalculateClientRevenue(invoice.clientId);
    }
    return result.length > 0;
  }

  async recalculateClientRevenue(clientId: string): Promise<void> {
    const clientInvoices = await this.getInvoicesByClient(clientId);
    const totalReceived = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    await db.update(clients).set({ revenueTotal: totalReceived.toString(), updatedAt: new Date() }).where(eq(clients.id, clientId));
  }

  // Founder Investments
  async getFounderInvestments(): Promise<FounderInvestment[]> {
    return db.select().from(founderInvestments).orderBy(desc(founderInvestments.investedOn));
  }

  async getFounderInvestmentsByUser(userId: string): Promise<FounderInvestment[]> {
    return db.select().from(founderInvestments).where(eq(founderInvestments.userId, userId)).orderBy(desc(founderInvestments.investedOn));
  }

  async getFounderInvestment(id: string): Promise<FounderInvestment | undefined> {
    const [investment] = await db.select().from(founderInvestments).where(eq(founderInvestments.id, id));
    return investment;
  }

  async createFounderInvestment(investment: InsertFounderInvestment): Promise<FounderInvestment> {
    const [created] = await db.insert(founderInvestments).values(investment).returning();
    return created;
  }

  async updateFounderInvestment(id: string, investment: UpdateFounderInvestment): Promise<FounderInvestment | undefined> {
    const [updated] = await db
      .update(founderInvestments)
      .set({ ...investment, updatedAt: new Date() })
      .where(eq(founderInvestments.id, id))
      .returning();
    return updated;
  }

  async deleteFounderInvestment(id: string): Promise<boolean> {
    const result = await db.delete(founderInvestments).where(eq(founderInvestments.id, id)).returning();
    return result.length > 0;
  }

  // Sent Emails
  async getSentEmailsByStory(storyId: string): Promise<SentEmail[]> {
    return db.select().from(sentEmails).where(eq(sentEmails.storyId, storyId)).orderBy(desc(sentEmails.sentAt));
  }

  async getSentEmailsByClient(clientId: string): Promise<SentEmail[]> {
    return db.select().from(sentEmails).where(eq(sentEmails.clientId, clientId)).orderBy(desc(sentEmails.sentAt));
  }

  async createSentEmail(email: InsertSentEmail): Promise<SentEmail> {
    const [created] = await db.insert(sentEmails).values(email).returning();
    return created;
  }

  // Internal Documents
  async getInternalDocuments(): Promise<InternalDocument[]> {
    return db.select().from(internalDocuments).orderBy(desc(internalDocuments.createdAt));
  }

  async getInternalDocument(id: string): Promise<InternalDocument | undefined> {
    const [doc] = await db.select().from(internalDocuments).where(eq(internalDocuments.id, id));
    return doc;
  }

  async createInternalDocument(doc: InsertInternalDocument): Promise<InternalDocument> {
    const [created] = await db.insert(internalDocuments).values(doc).returning();
    return created;
  }

  async updateInternalDocument(id: string, doc: UpdateInternalDocument): Promise<InternalDocument | undefined> {
    const [updated] = await db.update(internalDocuments).set({ ...doc, updatedAt: new Date() }).where(eq(internalDocuments.id, id)).returning();
    return updated;
  }

  async deleteInternalDocument(id: string): Promise<boolean> {
    const result = await db.delete(internalDocuments).where(eq(internalDocuments.id, id)).returning();
    return result.length > 0;
  }

  // Leads
  async getLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.updatedAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async updateLead(id: string, lead: UpdateLead): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }

  // Revenue Targets
  async getRevenueTargets(): Promise<RevenueTarget[]> {
    return db.select().from(revenueTargets).orderBy(desc(revenueTargets.period));
  }

  async getRevenueTarget(period: string): Promise<RevenueTarget | undefined> {
    const [target] = await db.select().from(revenueTargets).where(eq(revenueTargets.period, period));
    return target;
  }

  async upsertRevenueTarget(target: InsertRevenueTarget): Promise<RevenueTarget> {
    const [upserted] = await db
      .insert(revenueTargets)
      .values(target)
      .onConflictDoUpdate({
        target: revenueTargets.period,
        set: {
          targetAmount: target.targetAmount,
        },
      })
      .returning();
    return upserted;
  }

  // Client Communications
  async getCommunicationsByClient(clientId: string): Promise<ClientCommunication[]> {
    return db
      .select()
      .from(clientCommunications)
      .where(eq(clientCommunications.clientId, clientId))
      .orderBy(desc(clientCommunications.loggedAt));
  }

  async createClientCommunication(comm: InsertClientCommunication): Promise<ClientCommunication> {
    const [created] = await db.insert(clientCommunications).values(comm).returning();
    return created;
  }

  async deleteClientCommunication(id: string): Promise<boolean> {
    const result = await db.delete(clientCommunications).where(eq(clientCommunications.id, id)).returning();
    return result.length > 0;
  }

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(ann: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(ann).returning();
    return created;
  }

  async updateAnnouncement(id: string, ann: UpdateAnnouncement): Promise<Announcement | undefined> {
    const [updated] = await db
      .update(announcements)
      .set(ann)
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await db.delete(announcements).where(eq(announcements.id, id)).returning();
    return result.length > 0;
  }

  // Salary Records
  async getSalaryRecords(employeeId?: string): Promise<SalaryRecord[]> {
    const query = db.select().from(salaryRecords);
    if (employeeId) {
      return query.where(eq(salaryRecords.employeeId, employeeId)).orderBy(desc(salaryRecords.period));
    }
    return query.orderBy(desc(salaryRecords.period));
  }

  async getSalaryRecord(id: string): Promise<SalaryRecord | undefined> {
    const [record] = await db.select().from(salaryRecords).where(eq(salaryRecords.id, id));
    return record;
  }

  async createSalaryRecord(record: InsertSalaryRecord): Promise<SalaryRecord> {
    const [created] = await db.insert(salaryRecords).values(record).returning();
    return created;
  }

  async updateSalaryRecord(id: string, record: UpdateSalaryRecord): Promise<SalaryRecord | undefined> {
    const [updated] = await db
      .update(salaryRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(salaryRecords.id, id))
      .returning();
    return updated;
  }

  async deleteSalaryRecord(id: string): Promise<boolean> {
    const result = await db.delete(salaryRecords).where(eq(salaryRecords.id, id)).returning();
    return result.length > 0;
  }

  // Incentives
  async getIncentives(employeeId?: string): Promise<Incentive[]> {
    const query = db.select().from(incentives);
    if (employeeId) {
      return query.where(eq(incentives.employeeId, employeeId)).orderBy(desc(incentives.period));
    }
    return query.orderBy(desc(incentives.period));
  }

  async getIncentive(id: string): Promise<Incentive | undefined> {
    const [incentive] = await db.select().from(incentives).where(eq(incentives.id, id));
    return incentive;
  }

  async createIncentive(incentive: InsertIncentive): Promise<Incentive> {
    const [created] = await db.insert(incentives).values(incentive).returning();
    return created;
  }

  async updateIncentive(id: string, incentive: UpdateIncentive): Promise<Incentive | undefined> {
    const [updated] = await db
      .update(incentives)
      .set(incentive)
      .where(eq(incentives.id, id))
      .returning();
    return updated;
  }

  async deleteIncentive(id: string): Promise<boolean> {
    const result = await db.delete(incentives).where(eq(incentives.id, id)).returning();
    return result.length > 0;
  }

  // Deadline queries — stories due within N hours from now, not yet Done
  async getStoriesWithUpcomingDeadlines(hoursAhead: number): Promise<Story[]> {
    const now = new Date();
    const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    return db
      .select()
      .from(stories)
      .where(
        and(
          sql`${stories.dueDate} > ${now.toISOString()}`,
          sql`${stories.dueDate} <= ${future.toISOString()}`,
          sql`${stories.status} != 'Done'`
        )
      );
  }
}

export const storage = new DatabaseStorage();
