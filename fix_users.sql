-- Delete users with empty emails (they were likely failed inserts or test data)
DELETE FROM users WHERE email = '' OR email IS NULL;

-- 1. support@ai-agentix.com - Employee
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'support@ai-agentix.com', 'Support', 'Agentix', 'employee', 'editor')
ON CONFLICT (email) DO UPDATE SET user_type = 'employee', role = 'editor';

-- 2. anant@ai-agentix.com - Co-Founder / Admin
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'anant@ai-agentix.com', 'Anant', 'Agentix', 'co-founder', 'admin')
ON CONFLICT (email) DO UPDATE SET user_type = 'co-founder', role = 'admin';

-- 3. aiagentix2025@gmail.com - Employee
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'aiagentix2025@gmail.com', 'AI', 'Agentix', 'employee', 'editor')
ON CONFLICT (email) DO UPDATE SET user_type = 'employee', role = 'editor';

-- 4. agentixoffice@gmail.com - Employee
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'agentixoffice@gmail.com', 'Agentix', 'Office', 'employee', 'editor')
ON CONFLICT (email) DO UPDATE SET user_type = 'employee', role = 'editor';

-- 5. rachitsrivastava792@gmail.com - Employee
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'rachitsrivastava792@gmail.com', 'Rachit', 'Srivastava', 'employee', 'editor')
ON CONFLICT (email) DO UPDATE SET user_type = 'employee', role = 'editor';

-- 6. tiwarivimlendra@gmail.com - Co-Founder / Admin
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'tiwarivimlendra@gmail.com', 'Vimlendra', 'Tiwari', 'co-founder', 'admin')
ON CONFLICT (email) DO UPDATE SET user_type = 'co-founder', role = 'admin';

-- 7. vitalsaigorrela@gmail.com - Co-Founder / Admin
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'vitalsaigorrela@gmail.com', 'Vital Sai', 'Gorrela', 'co-founder', 'admin')
ON CONFLICT (email) DO UPDATE SET user_type = 'co-founder', role = 'admin';

-- 8. anantsanadhya@gmail.com - Co-Founder / Admin
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'anantsanadhya@gmail.com', 'Anant', 'Sanadhya', 'co-founder', 'admin')
ON CONFLICT (email) DO UPDATE SET user_type = 'co-founder', role = 'admin';

-- 9. myai@ai-agentix.com - Co-Founder / Admin
INSERT INTO users (id, email, first_name, last_name, user_type, role) 
VALUES (gen_random_uuid()::varchar, 'myai@ai-agentix.com', 'MyAI', 'Agentix', 'co-founder', 'admin')
ON CONFLICT (email) DO UPDATE SET user_type = 'co-founder', role = 'admin';

-- Update Kunal Mishra to be Employee (both emails)
UPDATE users SET user_type = 'employee', role = 'editor' WHERE email LIKE 'kunal.mishra%';

-- Update Amandeep Singh to be Employee (both emails)
UPDATE users SET user_type = 'employee', role = 'editor' WHERE email LIKE 'amandeep%';

-- Make sure vitalaws is also employee (if he is separate from vitalsaigorrela)
UPDATE users SET user_type = 'employee', role = 'editor' WHERE email = 'vitalaws9182@gmail.com';
