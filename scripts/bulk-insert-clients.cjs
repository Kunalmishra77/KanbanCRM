const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.clbwsrblgehrxcawdcwx:Kunalmishra%212026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

const OWNER_ID = '105296723396446757469';

const clients = [
  {
    name: 'INR Plus',
    stage: 'Dropped',
    industry: 'Finance',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: 'Previously onboarded client.',
  },
  {
    name: 'India Grains',
    stage: 'Warm',
    industry: 'Agriculture',
    contactName: 'Anil Yadav / Ravi',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '25000',
    revenueTotal: '0',
    notes: 'Agriculture sector lead.',
  },
  {
    name: 'Umang Hospital',
    stage: 'Hot',
    industry: 'Healthcare',
    contactName: 'Karan & Niharika',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: 'Hospital client.',
  },
  {
    name: 'Being Healthy',
    stage: 'Cold',
    industry: 'Healthcare',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: null,
  },
  {
    name: 'Machine Chimp',
    stage: 'Warm',
    industry: 'Technology',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: null,
  },
  {
    name: 'Smartel Samsung',
    stage: 'Cold',
    industry: 'Technology',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: 'Samsung retail/service partner.',
  },
  {
    name: 'Fitness First',
    stage: 'Hot',
    industry: 'Health & Fitness',
    contactName: 'Sunil Saini',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '95000',
    revenueTotal: '30000',
    notes: 'Fitness center client.',
  },
  {
    name: 'Delhi Laser Clinic',
    stage: 'Warm',
    industry: 'Healthcare',
    contactName: 'Dr. Kashyap / Nadia',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: 'DLC - Delhi Laser Clinic.',
  },
  {
    name: 'Lennore',
    stage: 'Hot',
    industry: 'Other',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: null,
  },
  {
    name: 'Sheetal Chaya Diagnostic',
    stage: 'Warm',
    industry: 'Healthcare',
    contactName: 'Ajay Kaushik',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: 'Diagnostic center.',
  },
  {
    name: 'Sanjay Gupta Solar',
    stage: 'Hot',
    industry: 'Energy',
    contactName: 'Sanjay Gupta',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: 'Solar energy client.',
  },
  {
    name: 'Apple Phones and Accessories',
    stage: 'Cold',
    industry: 'Retail',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: null,
  },
  {
    name: 'Abhinav Singh Call Center (VMS)',
    stage: 'Hot',
    industry: 'Consulting',
    contactName: 'Abhinav Sharma',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '220000',
    revenueTotal: '0',
    notes: 'BPO/Call Center - VMS.',
  },
  {
    name: 'NRI Trust',
    stage: 'Warm',
    industry: 'Real Estate',
    contactName: 'Dhananjay Agarwal',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '110000',
    revenueTotal: '50000',
    notes: 'Real estate investment trust.',
  },
  {
    name: 'Gemee Homes',
    stage: 'Cold',
    industry: 'Real Estate',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: null,
  },
  {
    name: 'Azure Tech Pvt Ltd',
    stage: 'Warm',
    industry: 'Technology',
    contactName: 'Sanjeev',
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '90000',
    revenueTotal: '0',
    notes: 'Tech company client.',
  },
  {
    name: 'The Vrindavan Project',
    stage: 'Warm',
    industry: 'Real Estate',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: 'Real estate development project.',
  },
  {
    name: 'Vedic Farms',
    stage: 'Warm',
    industry: 'Agriculture',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    expectedRevenue: '0',
    revenueTotal: '0',
    notes: 'Organic/agri client.',
  },
];

async function run() {
  const client = await pool.connect();
  try {
    let inserted = 0;
    let skipped = 0;
    for (const c of clients) {
      // Check if already exists
      const existing = await client.query('SELECT id FROM clients WHERE name = $1 AND owner_id = $2', [c.name, OWNER_ID]);
      if (existing.rows.length > 0) {
        console.log(`SKIP (exists): ${c.name}`);
        skipped++;
        continue;
      }
      await client.query(
        `INSERT INTO clients (name, owner_id, industry, stage, expected_revenue, revenue_total, average_progress, contact_name, contact_email, contact_phone, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [c.name, OWNER_ID, c.industry, c.stage, c.expectedRevenue, c.revenueTotal, '0', c.contactName, c.contactEmail, c.contactPhone, c.notes]
      );
      console.log(`INSERTED: ${c.name}`);
      inserted++;
    }
    console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
