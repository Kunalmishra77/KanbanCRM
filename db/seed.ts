import { db } from './index';
import { users, clients, stories, comments, activityLog } from '@shared/schema';
import { addDays, subDays } from 'date-fns';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create users
  const [user1, user2, user3] = await db.insert(users).values([
    {
      name: 'Alex Chen',
      email: 'alex@agentix.com',
      role: 'admin',
      avatarUrl: 'https://i.pravatar.cc/150?u=1',
    },
    {
      name: 'Sarah Jones',
      email: 'sarah@agentix.com',
      role: 'editor',
      avatarUrl: 'https://i.pravatar.cc/150?u=2',
    },
    {
      name: 'Mike Ross',
      email: 'mike@agentix.com',
      role: 'viewer',
      avatarUrl: 'https://i.pravatar.cc/150?u=3',
    },
  ]).returning();

  console.log('✅ Created users');

  // Create clients
  const [client1, client2, client3, client4] = await db.insert(clients).values([
    {
      name: 'TechNova Solutions',
      ownerId: user1.id,
      industry: 'SaaS',
      stage: 'Hot',
      averageProgress: '75',
      revenueTotal: '125000',
    },
    {
      name: 'GreenLeaf Organics',
      ownerId: user2.id,
      industry: 'Retail',
      stage: 'Warm',
      averageProgress: '45',
      revenueTotal: '54000',
    },
    {
      name: 'Quantum Logistics',
      ownerId: user1.id,
      industry: 'Logistics',
      stage: 'Cool',
      averageProgress: '15',
      revenueTotal: '22000',
    },
    {
      name: 'BlueSky Capital',
      ownerId: user3.id,
      industry: 'Finance',
      stage: 'Hot',
      averageProgress: '82',
      revenueTotal: '340000',
    },
  ]).returning();

  console.log('✅ Created clients');

  // Create stories
  const [story1, story2, story3, story4, story5, story6] = await db.insert(stories).values([
    {
      clientId: client1.id,
      title: 'Implement SSO Authentication',
      description: 'Integrate Auth0 or similar for enterprise SSO login.',
      assignedTo: user1.id,
      priority: 'High',
      estimatedEffortHours: 20,
      dueDate: addDays(new Date(), 5),
      status: 'In Progress',
      progressPercent: 60,
      person: 'John CTO',
      tags: ['Security', 'Backend'],
    },
    {
      clientId: client1.id,
      title: 'Dashboard Analytics Widget',
      description: 'Create the main revenue chart widget.',
      assignedTo: user2.id,
      priority: 'Medium',
      estimatedEffortHours: 12,
      dueDate: addDays(new Date(), 10),
      status: 'To Do',
      progressPercent: 0,
      person: 'Jane PM',
      tags: ['Frontend', 'UI'],
    },
    {
      clientId: client2.id,
      title: 'Shopify Integration',
      description: 'Sync inventory with Shopify API.',
      assignedTo: user2.id,
      priority: 'High',
      estimatedEffortHours: 40,
      dueDate: addDays(new Date(), 2),
      status: 'Blocked',
      progressPercent: 30,
      person: 'Mark Ops',
      tags: ['Integration', 'API'],
    },
    {
      clientId: client3.id,
      title: 'Route Optimization Algorithm',
      description: 'Initial research on TSP solvers.',
      assignedTo: user3.id,
      priority: 'Low',
      estimatedEffortHours: 100,
      dueDate: addDays(new Date(), 30),
      status: 'To Do',
      progressPercent: 0,
      person: 'Dr. Smith',
      tags: ['R&D'],
    },
    {
      clientId: client4.id,
      title: 'Q3 Financial Report',
      description: 'Generate PDF exports for Q3 data.',
      assignedTo: user1.id,
      priority: 'High',
      estimatedEffortHours: 8,
      dueDate: subDays(new Date(), 1),
      status: 'Review',
      progressPercent: 90,
      person: 'Sarah CFO',
      tags: ['Reporting'],
    },
    {
      clientId: client4.id,
      title: 'Audit Logs',
      description: 'Track all user actions.',
      assignedTo: user3.id,
      priority: 'Medium',
      estimatedEffortHours: 16,
      dueDate: addDays(new Date(), 14),
      status: 'Done',
      progressPercent: 100,
      person: 'Mike Sec',
      tags: ['Security'],
    },
  ]).returning();

  console.log('✅ Created stories');

  // Create comments
  await db.insert(comments).values([
    {
      storyId: story1.id,
      authorId: user1.id,
      body: 'Started working on the Auth0 config.',
      isSystem: false,
    },
    {
      storyId: story1.id,
      authorId: user2.id,
      body: 'Make sure to enable MFA.',
      isSystem: false,
    },
    {
      storyId: story3.id,
      authorId: user2.id,
      body: 'Waiting on API keys from the client.',
      isSystem: false,
    },
  ]);

  console.log('✅ Created comments');

  // Create activity logs
  await db.insert(activityLog).values([
    {
      entityType: 'story',
      entityId: story1.id,
      action: 'moved',
      userId: user1.id,
      details: 'Moved to In Progress',
    },
    {
      entityType: 'client',
      entityId: client4.id,
      action: 'updated',
      userId: user3.id,
      details: 'Updated revenue projection',
    },
  ]);

  console.log('✅ Created activity logs');
  console.log('🎉 Database seeded successfully!');
}

seed()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
