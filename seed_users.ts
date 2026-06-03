import { db } from "./server/db.js";
import { users } from "./shared/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const seedUsers = [
  { email: 'support@ai-agentix.com', firstName: 'Support', lastName: 'Team', userType: 'employee', role: 'editor' },
  { email: 'anant@ai-agentix.com', firstName: 'Anant', lastName: 'Admin', userType: 'co-founder', role: 'admin' },
  { email: 'aiagentix2025@gmail.com', firstName: 'AI', lastName: 'Agentix', userType: 'employee', role: 'editor' },
  { email: 'agentixoffice@gmail.com', firstName: 'Agentix', lastName: 'Office', userType: 'employee', role: 'editor' },
  { email: 'rachitsrivastava792@gmail.com', firstName: 'Rachit', lastName: 'Srivastava', userType: 'employee', role: 'editor' },
  { email: 'tiwarivimlendra@gmail.com', firstName: 'Vimlendra', lastName: 'Tiwari', userType: 'co-founder', role: 'admin' },
  { email: 'vitalsaigorrela@gmail.com', firstName: 'Vital', lastName: 'Saigorrela', userType: 'co-founder', role: 'admin' },
  { email: 'anantsanadhya@gmail.com', firstName: 'Anant', lastName: 'Sanadhya', userType: 'co-founder', role: 'admin' },
  { email: 'myai@ai-agentix.com', firstName: 'MyAI', lastName: 'Admin', userType: 'co-founder', role: 'admin' },
];

async function seed() {
  for (const user of seedUsers) {
    const existing = await db.select().from(users).where(eq(users.email, user.email));
    if (existing.length === 0) {
      await db.insert(users).values({
        id: randomUUID(),
        ...user
      });
      console.log(`Inserted ${user.email}`);
    } else {
      await db.update(users).set({
        userType: user.userType,
        role: user.role
      }).where(eq(users.email, user.email));
      console.log(`Updated ${user.email}`);
    }
  }
  process.exit(0);
}
seed();
