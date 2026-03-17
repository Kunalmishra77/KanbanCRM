const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.clbwsrblgehrxcawdcwx:Kunalmishra%212026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

const OWNER_ID = '105296723396446757469';

const leads = [
  {
    name: 'Ship Fast',
    contactName: 'Mithlesh VP BNI',
    contactEmail: null,
    contactPhone: null,
    industry: 'Logistics',
    stage: 'Contacted',
    estimatedValue: null,
    notes: 'Meeting them on Monday in Noida office. BNI VP contact.',
  },
  {
    name: 'Sunrays Medical',
    contactName: 'Amardeep',
    contactEmail: null,
    contactPhone: null,
    industry: 'Healthcare',
    stage: 'Contacted',
    estimatedValue: null,
    notes: 'Having a Zoom meeting soon in a day or two. Proposal to be made by Nitin Sir.',
  },
  {
    name: 'Parts Baba',
    contactName: 'Sushil Sharma',
    contactEmail: null,
    contactPhone: null,
    industry: 'Retail',
    stage: 'New',
    estimatedValue: null,
    notes: 'Friend of BNI VP. Initial contact made.',
  },
  {
    name: 'AIM (Academy for Institute Management)',
    contactName: 'Ruchi',
    contactEmail: null,
    contactPhone: null,
    industry: 'Education',
    stage: 'Negotiation',
    estimatedValue: '25000',
    notes: 'LMS setup ₹10,000/month + ₹50,000 own LMS. Proposal sent and approved. Jan 2026 pilot: 15-day free foundation course (20-30 students). Feb 2026: Meta + Google Ads ₹25,000. March 2026: Performance marketing + revenue commission 7.5-15%. Yet to receive approval from Ruchi.',
  },
  {
    name: 'Print Snap',
    contactName: 'Priyanka',
    contactEmail: null,
    contactPhone: null,
    industry: 'Technology',
    stage: 'Lost',
    estimatedValue: null,
    notes: 'Cold customer. Proposal for AI-based LMS and content management shared. Service agreement and invoice not signed. Cold lead.',
  },
  {
    name: 'Bhupesh Singhal (Vastu Consultant)',
    contactName: 'Bhupesh Singhal',
    contactEmail: null,
    contactPhone: null,
    industry: 'Consulting',
    stage: 'Proposal Sent',
    estimatedValue: null,
    notes: 'Vastu consultant. Has 2-3 products, about to launch 2 more: mouth-dissolving caffeine strips and perfumes. Work proposal to be prepared and shared without mentioning cost. Jan 2026.',
  },
  {
    name: 'Jio Connect',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    industry: 'Technology',
    stage: 'New',
    estimatedValue: null,
    notes: 'WhatsApp API account setup credentials passover required.',
  },
  {
    name: 'Gupshup',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    industry: 'Technology',
    stage: 'New',
    estimatedValue: null,
    notes: 'WhatsApp API platform. Evaluate for WhatsApp API account setup.',
  },
  {
    name: 'Tekipost',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    industry: 'Technology',
    stage: 'Contacted',
    estimatedValue: null,
    notes: 'Anant having meet on Friday. Needs to prepare for meeting.',
  },
];

async function run() {
  const client = await pool.connect();
  try {
    let inserted = 0, skipped = 0;
    for (const lead of leads) {
      const existing = await client.query(
        'SELECT id FROM leads WHERE name = $1 AND owner_id = $2',
        [lead.name, OWNER_ID]
      );
      if (existing.rows.length > 0) {
        console.log(`SKIP (exists): ${lead.name}`);
        skipped++;
        continue;
      }
      await client.query(
        `INSERT INTO leads (name, contact_name, contact_email, contact_phone, industry, stage, estimated_value, notes, owner_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [lead.name, lead.contactName, lead.contactEmail, lead.contactPhone, lead.industry, lead.stage, lead.estimatedValue, lead.notes, OWNER_ID]
      );
      console.log(`INSERTED: ${lead.name}`);
      inserted++;
    }
    console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
