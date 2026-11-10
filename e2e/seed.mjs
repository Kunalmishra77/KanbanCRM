// Seeds the THROWAWAY local database with made-up users. Refuses to run against anything but localhost.
import postgres from 'postgres';

const url = process.env.DATABASE_URL || '';
if (!/^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error('seed refused: DATABASE_URL is not a local database');
const sql = postgres(url, { prepare: false });

const users = [
  ['t-founder', 'Anant', 'Founder', 'vitalsaigorrela@gmail.com', 'founder', 'admin'],
  ['t-hr', 'Mahi', 'HR', 'hr@test.dev', 'hr', 'editor'],
  ['t-acc', 'Aarti', 'Accountant', 'acc@test.dev', 'accountant', 'editor'],
  // Pooja logs in with the razorbill account; Google calls her "Razorbill"
  ['t-pooja', 'Pooja', 'Singh', 'razorbill2018@gmail.com', 'employee', 'editor'],
  ['t-ranveer', 'ranveer', 'razorveda', 'ranveer@test.dev', 'employee', 'editor'],
];
await sql`alter database crm set timezone to 'UTC'`; // production runs in UTC
await sql`truncate table users cascade`;
for (const [id, f, l, e, t, r] of users) {
  await sql`insert into users (id, first_name, last_name, email, user_type, role) values (${id}, ${f}, ${l}, ${e}, ${t}, ${r})`;
}
console.log('seeded', users.length, 'users');
await sql.end();
