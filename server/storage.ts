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
  type LeadComment, type InsertLeadComment,
  type RevenueTarget, type InsertRevenueTarget,
  type ClientCommunication, type InsertClientCommunication,
  type Announcement, type InsertAnnouncement, type UpdateAnnouncement,
  type SalaryRecord, type InsertSalaryRecord, type UpdateSalaryRecord,
  type Incentive, type InsertIncentive, type UpdateIncentive,
  type RecurringTask, type RecurringTaskInput, type EmployeeRequest, type EmployeeRequestInput,
  type Notification, type InsertNotification,
  users, clients, stories, comments, activityLog, invoices, founderInvestments, sentEmails, internalDocuments,
  leads, leadComments, revenueTargets, clientCommunications, announcements, salaryRecords, incentives,
  recurringTasks, employeeRequests, notifications
} from "../shared/schema.js";
import { db } from "../db/index.js";
import { eq, desc, and, sql, inArray, gte, ne } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  upsertUserFromGoogle(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: UpdateUserProfile): Promise<User | undefined>;
  deleteUser(id: string, reassignOwnerTo?: string): Promise<void>;
  
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: UpdateClient): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  convertClientToLead(clientId: string, fallbackOwnerId: string): Promise<Lead | undefined>;
  
  // Stories
  getStories(): Promise<Story[]>;
  getStoriesByClient(clientId: string): Promise<Story[]>;
  getStory(id: string): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: string, story: UpdateStory): Promise<Story | undefined>;
  deleteStory(id: string): Promise<boolean>;
  
  // Repeating tasks
  listRecurringTasks(): Promise<RecurringTask[]>;
  createRecurringTask(data: RecurringTaskInput & { startDate: string }, createdBy: string): Promise<RecurringTask>;
  updateRecurringTask(id: string, data: Partial<RecurringTaskInput>): Promise<RecurringTask | undefined>;
  deleteRecurringTask(id: string): Promise<boolean>;
  getOccurrenceKeys(date: string): Promise<Set<string>>;
  insertGeneratedStories(rows: InsertStory[]): Promise<number>;

  // Leave / work from home / overtime
  listEmployeeRequests(filter?: { userId?: string }): Promise<EmployeeRequest[]>;
  getEmployeeRequest(id: string): Promise<EmployeeRequest | undefined>;
  createEmployeeRequest(userId: string, data: EmployeeRequestInput): Promise<EmployeeRequest>;
  decideEmployeeRequest(id: string, status: 'approved' | 'rejected', decidedBy: string, note: string | null): Promise<EmployeeRequest | undefined>;
  deleteEmployeeRequest(id: string): Promise<boolean>;

  // Personal notifications
  createNotifications(rows: InsertNotification[]): Promise<void>;
  listNotifications(userId: string, limit?: number): Promise<Notification[]>;
  countUnreadNotifications(userId: string): Promise<number>;
  markNotificationsRead(userId: string, ids?: string[]): Promise<number>;
  markEntityNotificationsRead(entityId: string, types: string[]): Promise<void>;
  deleteEntityNotifications(entityId: string, types: string[]): Promise<void>;

  // Founder overview + mentions
  getCommentsSince(since: Date): Promise<Comment[]>;
  getActivitySince(since: Date): Promise<ActivityLog[]>;
  getMentions(userId: string, fullName: string, since: Date): Promise<{ id: string; storyId: string; storyTitle: string; clientId: string; authorName: string | null; body: string; createdAt: Date }[]>;

  // Comments
  getCommentsByStory(storyId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Activity Log
  getActivityLog(limit?: number): Promise<ActivityLog[]>;
  getActivityLogByEntities(entityIds: string[], limit?: number): Promise<ActivityLog[]>;
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

  // Lead Comments
  getLeadCommentsByLead(leadId: string): Promise<LeadComment[]>;
  createLeadComment(comment: InsertLeadComment): Promise<LeadComment>;

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
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = lower(${email})`);
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
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async upsertUserFromGoogle(userData: UpsertUser): Promise<User> {
    const existingByEmail = await this.getUserByEmail(userData.email || '');
    
    if (existingByEmail) {
      // The name was entered internally by HR/founders and is what stories are assigned under, so a
      // Google display name (often a company or nickname) must never replace it. Only fill gaps.
      const hasName = !!(existingByEmail.firstName || '').trim();
      const [user] = await db.update(users).set({
        ...(hasName ? {} : { firstName: userData.firstName, lastName: userData.lastName }),
        profileImageUrl: existingByEmail.profileImageUrl || userData.profileImageUrl,
        updatedAt: new Date(),
      }).where(eq(users.id, existingByEmail.id)).returning();
      return user;
    }

    const [user] = await db.insert(users).values(userData).returning();
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

  async deleteUser(id: string, reassignOwnerTo?: string): Promise<void> {
    await db.transaction(async (tx) => {
    // Drizzle ORM cleanup: delete or nullify dependent records to avoid constraint errors
    await tx.delete(activityLog).where(eq(activityLog.userId, id));
    await tx.update(stories).set({ assignedTo: null, person: 'Unassigned' }).where(eq(stories.assignedTo, id));
    await tx.update(clients).set({ ownerId: null }).where(eq(clients.ownerId, id));
    // leads.owner_id is NOT NULL, so hand the leads to the acting admin instead of nulling them
    if (reassignOwnerTo && reassignOwnerTo !== id) {
      await tx.update(leads).set({ ownerId: reassignOwnerTo }).where(eq(leads.ownerId, id));
    }
    await tx.update(leads).set({ assignedTo: null }).where(eq(leads.assignedTo, id));
    await tx.delete(founderInvestments).where(eq(founderInvestments.userId, id));
    await tx.delete(internalDocuments).where(eq(internalDocuments.uploadedById, id));
    await tx.delete(sentEmails).where(eq(sentEmails.sentById, id));
    await tx.delete(revenueTargets).where(eq(revenueTargets.ownerId, id));
    await tx.delete(salaryRecords).where(eq(salaryRecords.employeeId, id));
    await tx.delete(salaryRecords).where(eq(salaryRecords.createdBy, id));
    await tx.delete(incentives).where(eq(incentives.employeeId, id));
    await tx.delete(incentives).where(eq(incentives.createdBy, id));

    // Finally delete the user
    await tx.delete(users).where(eq(users.id, id));
    });
  }

  async updateUserProfile(id: string, data: UpdateUserProfile): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    // stories.person is a denormalised copy of the assignee's name; keep it in step with a rename
    if (user && (data.firstName !== undefined || data.lastName !== undefined)) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (fullName) await db.update(stories).set({ person: fullName }).where(eq(stories.assignedTo, id));
    }
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

  async convertClientToLead(clientId: string, fallbackOwnerId: string): Promise<Lead | undefined> {
    return db.transaction(async (tx) => {
      const [client] = await tx.select().from(clients).where(eq(clients.id, clientId));
      if (!client) return undefined;

      // leads.owner_id is NOT NULL in the database, while clients.owner_id is nullable
      const [lead] = await tx.insert(leads).values({
        name: client.name,
        contactName: client.contactName || null,
        contactEmail: client.contactEmail || null,
        contactPhone: client.contactPhone || null,
        industry: client.industry || null,
        stage: "Hold",
        estimatedValue: client.expectedRevenue || "0",
        notes: client.notes || null,
        ownerId: client.ownerId || fallbackOwnerId,
      }).returning();

      await tx.delete(clients).where(eq(clients.id, clientId));
      return lead;
    });
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

  // ---- Repeating tasks ----
  async listRecurringTasks(): Promise<RecurringTask[]> {
    return db.select().from(recurringTasks).orderBy(desc(recurringTasks.createdAt));
  }

  async createRecurringTask(data: RecurringTaskInput & { startDate: string }, createdBy: string): Promise<RecurringTask> {
    const [row] = await db.insert(recurringTasks).values({
      clientId: data.clientId, title: data.title, description: data.description, priority: data.priority,
      repeat: data.repeat, weekday: data.repeat === 'weekly' ? (data.weekday ?? null) : null,
      monthDay: data.repeat === 'monthly' ? (data.monthDay ?? null) : null,
      dueTime: data.dueTime || null, startDate: data.startDate, endDate: data.endDate || null,
      active: data.active ?? true, assigneeIds: data.team ? [] : data.assigneeIds, team: data.team || null,
      excludeIds: data.team ? (data.excludeIds || []) : [], createdBy,
    }).returning();
    return row;
  }

  async updateRecurringTask(id: string, data: Partial<RecurringTaskInput>): Promise<RecurringTask | undefined> {
    const [row] = await db.update(recurringTasks).set({ ...data, updatedAt: new Date() } as any).where(eq(recurringTasks.id, id)).returning();
    return row;
  }

  async deleteRecurringTask(id: string): Promise<boolean> {
    const rows = await db.delete(recurringTasks).where(eq(recurringTasks.id, id)).returning({ id: recurringTasks.id });
    return rows.length > 0;
  }

  async getOccurrenceKeys(date: string): Promise<Set<string>> {
    const rows = await db.select({ r: stories.recurringTaskId, u: stories.assignedTo, d: stories.occurrenceDate }).from(stories).where(eq(stories.occurrenceDate, date));
    return new Set(rows.filter((x) => x.r && x.u).map((x) => `${x.r}|${x.u}|${x.d}`));
  }

  async insertGeneratedStories(rows: InsertStory[]): Promise<number> {
    if (rows.length === 0) return 0;
    const done = await db.insert(stories).values(rows).onConflictDoNothing().returning({ id: stories.id });
    return done.length;
  }

  // ---- Leave / work from home / overtime ----
  async listEmployeeRequests(filter: { userId?: string } = {}): Promise<EmployeeRequest[]> {
    const q = db.select().from(employeeRequests);
    return (filter.userId ? q.where(eq(employeeRequests.userId, filter.userId)) : q).orderBy(desc(employeeRequests.createdAt));
  }

  async getEmployeeRequest(id: string): Promise<EmployeeRequest | undefined> {
    const [row] = await db.select().from(employeeRequests).where(eq(employeeRequests.id, id));
    return row;
  }

  async createEmployeeRequest(userId: string, data: EmployeeRequestInput): Promise<EmployeeRequest> {
    const [row] = await db.insert(employeeRequests).values({
      userId, type: data.type, startDate: data.startDate,
      endDate: data.type === 'ot' ? data.startDate : (data.endDate || data.startDate),
      hours: data.type === 'ot' ? String(data.hours) : null, reason: data.reason,
    }).returning();
    return row;
  }

  async decideEmployeeRequest(id: string, status: 'approved' | 'rejected', decidedBy: string, note: string | null): Promise<EmployeeRequest | undefined> {
    const [row] = await db.update(employeeRequests)
      .set({ status, decidedBy, decisionNote: note, decidedAt: new Date() })
      .where(and(eq(employeeRequests.id, id), eq(employeeRequests.status, 'pending')))
      .returning();
    return row;
  }

  async deleteEmployeeRequest(id: string): Promise<boolean> {
    const rows = await db.delete(employeeRequests).where(eq(employeeRequests.id, id)).returning({ id: employeeRequests.id });
    return rows.length > 0;
  }

  // ---- Personal notifications ----
  async createNotifications(rows: InsertNotification[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(notifications).values(rows);
  }

  async listNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return r?.n ?? 0;
  }

  /** Marks the person's own notifications as read: the given ids, or all of them when no ids are given. */
  async markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
    const where = ids && ids.length > 0
      ? and(eq(notifications.userId, userId), inArray(notifications.id, ids), eq(notifications.isRead, false))
      : and(eq(notifications.userId, userId), eq(notifications.isRead, false));
    const rows = await db.update(notifications).set({ isRead: true }).where(where).returning({ id: notifications.id });
    return rows.length;
  }

  async markEntityNotificationsRead(entityId: string, types: string[]): Promise<void> {
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.entityId, entityId), inArray(notifications.type, types), eq(notifications.isRead, false)));
  }

  async deleteEntityNotifications(entityId: string, types: string[]): Promise<void> {
    await db.delete(notifications).where(and(eq(notifications.entityId, entityId), inArray(notifications.type, types)));
  }

  async getCommentsSince(since: Date): Promise<Comment[]> {
    return db.select().from(comments).where(gte(comments.createdAt, since)).orderBy(desc(comments.createdAt));
  }

  async getActivitySince(since: Date): Promise<ActivityLog[]> {
    return db.select().from(activityLog).where(gte(activityLog.createdAt, since)).orderBy(desc(activityLog.createdAt));
  }

  /** Comments written by someone else that contain "@<this person's full name>". Private to that person. */
  async getMentions(userId: string, fullName: string, since: Date) {
    const name = fullName.replace(/\s+/g, ' ').trim();
    if (!name) return [];
    const pattern = '%@' + name.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
    return db
      .select({ id: comments.id, storyId: comments.storyId, storyTitle: stories.title, clientId: stories.clientId, authorName: comments.authorName, body: comments.body, createdAt: comments.createdAt })
      .from(comments)
      .innerJoin(stories, eq(stories.id, comments.storyId))
      .where(and(sql`${comments.body} ilike ${pattern}`, ne(comments.authorId, userId), eq(comments.isSystem, false), gte(comments.createdAt, since)))
      .orderBy(desc(comments.createdAt))
      .limit(30);
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
  async getActivityLogByEntities(entityIds: string[], limit: number = 500): Promise<ActivityLog[]> {
    if (entityIds.length === 0) return [];
    return db.select().from(activityLog).where(inArray(activityLog.entityId, entityIds)).orderBy(desc(activityLog.createdAt)).limit(limit);
  }

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
    const totalReceived = clientInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
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

  // Lead Comments
  async getLeadCommentsByLead(leadId: string): Promise<LeadComment[]> {
    return db.select().from(leadComments).where(eq(leadComments.leadId, leadId)).orderBy(leadComments.createdAt);
  }

  async createLeadComment(insertComment: InsertLeadComment): Promise<LeadComment> {
    const [comment] = await db.insert(leadComments).values(insertComment).returning();
    return comment;
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
    // One company-wide target per month. The table's unique key is (period, owner_id), not period,
    // so ON CONFLICT (period) is invalid; look the month up instead.
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(revenueTargets).where(eq(revenueTargets.period, target.period)).orderBy(revenueTargets.createdAt);
      if (existing) {
        const [updated] = await tx.update(revenueTargets).set({ targetAmount: target.targetAmount }).where(eq(revenueTargets.id, existing.id)).returning();
        return updated;
      }
      const [created] = await tx.insert(revenueTargets).values(target).returning();
      return created;
    });
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
