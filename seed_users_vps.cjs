const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });

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
  await client.connect();
  const { crypto } = require('crypto');
  for (const u of seedUsers) {
    const res = await client.query('SELECT * FROM users WHERE email = ', [u.email]);
    if (res.rows.length === 0) {
      const id = require('crypto').randomUUID();
      await client.query(
        'INSERT INTO users (id, email, first_name, last_name, user_type, role) VALUES (, , , , , )',
        [id, u.email, u.firstName, u.lastName, u.userType, u.role]
      );
      console.log('Inserted ' + u.email);
    } else {
      await client.query(
        'UPDATE users SET user_type = , role =  WHERE email = ',
        [u.userType, u.role, u.email]
      );
      console.log('Updated ' + u.email);
    }
  }
  await client.end();
}
seed().catch(console.error);
