import { addDays, subDays, format } from "date-fns";

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'editor' | 'viewer';
};

export type ClientStatus = 'Hot' | 'Warm' | 'Cool';

export type Client = {
  id: string;
  name: string;
  ownerId: string;
  industry: string;
  stage: ClientStatus;
  averageProgress: number;
  revenueTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type StoryPriority = 'Low' | 'Medium' | 'High';
export type KanbanStatus = 'To Do' | 'In Progress' | 'Blocked' | 'Review' | 'Done';

export type Story = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  assignedTo?: string;
  priority: StoryPriority;
  estimatedEffortHours: number;
  dueDate: string;
  status: KanbanStatus;
  progressPercent: number;
  person: string; // Point of contact
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  storyId: string;
  authorId: string;
  body: string;
  createdAt: string;
  isSystem: boolean;
};

export type ActivityLog = {
  id: string;
  entityType: 'story' | 'client';
  entityId: string;
  action: string;
  userId: string;
  details: string;
  createdAt: string;
};

// --- MOCK DATA ---

export const USERS: User[] = [
  { id: 'u1', name: 'Alex Chen', email: 'alex@agentix.com', role: 'admin', avatarUrl: 'https://i.pravatar.cc/150?u=1' },
  { id: 'u2', name: 'Sarah Jones', email: 'sarah@agentix.com', role: 'editor', avatarUrl: 'https://i.pravatar.cc/150?u=2' },
  { id: 'u3', name: 'Mike Ross', email: 'mike@agentix.com', role: 'viewer', avatarUrl: 'https://i.pravatar.cc/150?u=3' },
];

export const CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'TechNova Solutions',
    ownerId: 'u1',
    industry: 'SaaS',
    stage: 'Hot',
    averageProgress: 75,
    revenueTotal: 125000,
    createdAt: subDays(new Date(), 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c2',
    name: 'GreenLeaf Organics',
    ownerId: 'u2',
    industry: 'Retail',
    stage: 'Warm',
    averageProgress: 45,
    revenueTotal: 54000,
    createdAt: subDays(new Date(), 60).toISOString(),
    updatedAt: subDays(new Date(), 2).toISOString(),
  },
  {
    id: 'c3',
    name: 'Quantum Logistics',
    ownerId: 'u1',
    industry: 'Logistics',
    stage: 'Cool',
    averageProgress: 15,
    revenueTotal: 22000,
    createdAt: subDays(new Date(), 90).toISOString(),
    updatedAt: subDays(new Date(), 10).toISOString(),
  },
  {
    id: 'c4',
    name: 'BlueSky Capital',
    ownerId: 'u3',
    industry: 'Finance',
    stage: 'Hot',
    averageProgress: 82,
    revenueTotal: 340000,
    createdAt: subDays(new Date(), 15).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const STORIES: Story[] = [
  // TechNova
  {
    id: 's1',
    clientId: 'c1',
    title: 'Implement SSO Authentication',
    description: 'Integrate Auth0 or similar for enterprise SSO login.',
    assignedTo: 'u1',
    priority: 'High',
    estimatedEffortHours: 20,
    dueDate: addDays(new Date(), 5).toISOString(),
    status: 'In Progress',
    progressPercent: 60,
    person: 'John CTO',
    tags: ['Security', 'Backend'],
    createdAt: subDays(new Date(), 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 's2',
    clientId: 'c1',
    title: 'Dashboard Analytics Widget',
    description: 'Create the main revenue chart widget.',
    assignedTo: 'u2',
    priority: 'Medium',
    estimatedEffortHours: 12,
    dueDate: addDays(new Date(), 10).toISOString(),
    status: 'To Do',
    progressPercent: 0,
    person: 'Jane PM',
    tags: ['Frontend', 'UI'],
    createdAt: subDays(new Date(), 2).toISOString(),
    updatedAt: subDays(new Date(), 2).toISOString(),
  },
  
  // GreenLeaf
  {
    id: 's3',
    clientId: 'c2',
    title: 'Shopify Integration',
    description: 'Sync inventory with Shopify API.',
    assignedTo: 'u2',
    priority: 'High',
    estimatedEffortHours: 40,
    dueDate: addDays(new Date(), 2).toISOString(),
    status: 'Blocked',
    progressPercent: 30,
    person: 'Mark Ops',
    tags: ['Integration', 'API'],
    createdAt: subDays(new Date(), 10).toISOString(),
    updatedAt: subDays(new Date(), 1).toISOString(),
  },

  // Quantum
  {
    id: 's4',
    clientId: 'c3',
    title: 'Route Optimization Algorithm',
    description: 'Initial research on TSP solvers.',
    assignedTo: 'u3',
    priority: 'Low',
    estimatedEffortHours: 100,
    dueDate: addDays(new Date(), 30).toISOString(),
    status: 'To Do',
    progressPercent: 0,
    person: 'Dr. Smith',
    tags: ['R&D'],
    createdAt: subDays(new Date(), 20).toISOString(),
    updatedAt: subDays(new Date(), 20).toISOString(),
  },
  
  // BlueSky
  {
    id: 's5',
    clientId: 'c4',
    title: 'Q3 Financial Report',
    description: 'Generate PDF exports for Q3 data.',
    assignedTo: 'u1',
    priority: 'High',
    estimatedEffortHours: 8,
    dueDate: subDays(new Date(), 1).toISOString(), // Overdue
    status: 'Review',
    progressPercent: 90,
    person: 'Sarah CFO',
    tags: ['Reporting'],
    createdAt: subDays(new Date(), 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
   {
    id: 's6',
    clientId: 'c4',
    title: 'Audit Logs',
    description: 'Track all user actions.',
    assignedTo: 'u3',
    priority: 'Medium',
    estimatedEffortHours: 16,
    dueDate: addDays(new Date(), 14).toISOString(),
    status: 'Done',
    progressPercent: 100,
    person: 'Mike Sec',
    tags: ['Security'],
    createdAt: subDays(new Date(), 20).toISOString(),
    updatedAt: subDays(new Date(), 5).toISOString(),
  },
];

export const COMMENTS: Comment[] = [
  { id: 'cm1', storyId: 's1', authorId: 'u1', body: 'Started working on the Auth0 config.', createdAt: subDays(new Date(), 2).toISOString(), isSystem: false },
  { id: 'cm2', storyId: 's1', authorId: 'u2', body: 'Make sure to enable MFA.', createdAt: subDays(new Date(), 1).toISOString(), isSystem: false },
  { id: 'cm3', storyId: 's3', authorId: 'u2', body: 'Waiting on API keys from the client.', createdAt: subDays(new Date(), 1).toISOString(), isSystem: false },
];

export const ACTIVITY_LOG: ActivityLog[] = [
  { id: 'al1', entityType: 'story', entityId: 's1', action: 'moved', userId: 'u1', details: 'Moved to In Progress', createdAt: subDays(new Date(), 2).toISOString() },
  { id: 'al2', entityType: 'client', entityId: 'c4', action: 'updated', userId: 'u3', details: 'Updated revenue projection', createdAt: subDays(new Date(), 1).toISOString() },
];
