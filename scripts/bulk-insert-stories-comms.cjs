const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.clbwsrblgehrxcawdcwx:Kunalmishra%212026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

// Client IDs from DB
const C = {
  VMS:       '0c925381-e337-49af-8aae-14cbdce6792d', // Abhinav Singh Call Center (VMS)
  APPLE:     'e5fb2b62-5b55-4a1b-a4b1-9161768bf05b', // Apple Phones and Accessories
  AZURE:     'ee963dab-87b6-49d4-95c9-bb9ccd244476', // Azure Tech Pvt Ltd
  BHEALTHY:  '478022f7-1ed3-438c-ae13-d0bfd5d4cddd', // Being Healthy
  DLC:       '76c97bb5-0215-4041-a2bf-b50da44b12b9', // Delhi Laser Clinic
  FF:        'b3db0497-3e0f-4bcd-af47-2903c6f32de7', // Fitness First
  GEMEE:     '92478137-025c-4ccd-b2f9-2038872d6b61', // Gemee Homes
  INDIAG:    'f78c72df-660a-4db0-96db-88b28a569bc2', // India Grains
  INRPLUS:   '763933cb-047f-4241-8dd7-caf3a7629437', // INR Plus
  LENNORE:   '6aa6f58d-d278-4aca-9256-1fde4516d133', // Lennore
  MCHIMP:    '5bf99912-8652-4836-9cca-03dedb50e662', // Machine Chimp
  NRITRUST:  '9c3a7458-1a4a-42e2-9a66-7db7cfcf0ee4', // NRI Trust
  SANJAY:    '8c8272a9-5e9e-497a-9a2e-4cffc1a121d6', // Sanjay Gupta Solar
  SHEETAL:   '95e9a590-a3ba-4448-ab6c-dc30b0445a36', // Sheetal Chaya Diagnostic
  SMARTEL:   '2ad02ec3-48cb-449e-85d5-45701e6f3860', // Smartel Samsung
  VRINDAVAN: 'd6dd3a1a-f9a5-486b-b187-d26a7e3fd0dc', // The Vrindavan Project
  UMANG:     '5f3c0cc9-21e2-44c9-bc41-dd70a268a7fa', // Umang Hospital
  VEDIC:     '2dccea5d-9436-49e7-84ed-21c0b3f60ee2', // Vedic Farms
};

// Stories: { clientId, title, description, person, priority, status, progressPercent, tags }
const stories = [
  // ─── INR Plus ───────────────────────────────────────────────────────────────
  { clientId: C.INRPLUS, title: 'Follow Up on Pending Payments', description: 'Anchal to follow up with Mr. Jeetendra and Nimish regarding non-payment. Work stopped due to this.', person: 'Anchal', priority: 'High', status: 'Blocked', progressPercent: 0, tags: ['payment', 'followup'] },
  { clientId: C.INRPLUS, title: 'LinkedIn Content Creation', description: 'Create LinkedIn blogs, articles and optimize account. 5 videos and LinkedIn posts by Vital Sir.', person: 'Vital', priority: 'Medium', status: 'Done', progressPercent: 100, tags: ['content', 'linkedin'] },
  { clientId: C.INRPLUS, title: 'YouTube Shorts Content', description: '5 YouTube shorts to be made by Vital Sir.', person: 'Vital', priority: 'Medium', status: 'Done', progressPercent: 100, tags: ['content', 'youtube'] },

  // ─── India Grains ────────────────────────────────────────────────────────────
  { clientId: C.INDIAG, title: 'WhatsApp Chatbot Development', description: 'WhatsApp chatbot completed. KB given to Vital Sir. Bot deployed and tested.', person: 'Vital', priority: 'High', status: 'Done', progressPercent: 100, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.INDIAG, title: 'WhatsApp Chatbot Deployment & Testing', description: 'Deployment in progress. Vital following up with Anil Yadav and Ravi Sir for final approval. Monthly invoice ₹10,000 from Feb.', person: 'Vital', priority: 'High', status: 'In Progress', progressPercent: 70, tags: ['deployment', 'chatbot'] },
  { clientId: C.INDIAG, title: 'Payment Collection ₹25,000', description: 'Anchal to follow up for payment of ₹25,000 after deployment. ₹25,000 received, balance pending.', person: 'Aanchal', priority: 'High', status: 'In Progress', progressPercent: 50, tags: ['payment'] },
  { clientId: C.INDIAG, title: 'Bulk WhatsApp Messaging with Chat Agent', description: 'Execute bulk messaging integrated with WhatsApp Chat Agent.', person: 'Vital', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['whatsapp', 'marketing'] },
  { clientId: C.INDIAG, title: 'Voice Agent Implementation', description: 'Configure and deploy AI Voice Agent. With Vimlendra/Rachit/Vital.', person: 'Vital', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['voice-agent'] },
  { clientId: C.INDIAG, title: 'WhatsApp Template Ads', description: 'Run WhatsApp template ads using existing data.', person: 'Vital', priority: 'Low', status: 'To Do', progressPercent: 0, tags: ['ads', 'whatsapp'] },

  // ─── Umang Hospital ──────────────────────────────────────────────────────────
  { clientId: C.UMANG, title: 'Website Redesign (Akash Hospital Style)', description: 'Revamp website similar to Akash Hospital structure. Update fonts, homepage front banner, remove cost details, fill empty pages. Done by Indresh.', person: 'Indresh', priority: 'High', status: 'Done', progressPercent: 100, tags: ['website'] },
  { clientId: C.UMANG, title: 'WhatsApp Chat Agent Development & Deployment', description: 'Build and deploy WhatsApp chat agent for Umang Hospital. Bot is live. KB reviewed by Anant Sir.', person: 'Vital', priority: 'High', status: 'Done', progressPercent: 100, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.UMANG, title: 'WhatsApp Bulk Marketing', description: 'Send bulk messages and auto-replies. GST name updated. Bulk messaging live - team satisfied.', person: 'Vital', priority: 'High', status: 'Done', progressPercent: 100, tags: ['whatsapp', 'marketing'] },
  { clientId: C.UMANG, title: 'Social Media Handling & Content Creation', description: 'Manage Umang Hospital social media. Create posts, images, campaigns. Content by Anant/Sheetal, posted by Prajwal.', person: 'Anant', priority: 'Medium', status: 'In Progress', progressPercent: 60, tags: ['social-media', 'content'] },
  { clientId: C.UMANG, title: 'Logo Finalization', description: 'Get final logo and share in Umang Hospital group. Coordinate with Niharika Ma\'am.', person: 'Aanchal', priority: 'Medium', status: 'Done', progressPercent: 100, tags: ['branding'] },
  { clientId: C.UMANG, title: 'Digital Advertising on Social Media', description: 'Start Umang digital advertising on social media. Managed by Prajwal Sir\'s company.', person: 'Prajwal', priority: 'High', status: 'In Progress', progressPercent: 50, tags: ['ads', 'social-media'] },
  { clientId: C.UMANG, title: 'Republic Day Free OPD Campaign', description: '77th Republic Day Free OPD campaign. Banners, creatives, posters. OPD Timings: 7:00 PM to 12:00 AM.', person: 'Anant', priority: 'High', status: 'Done', progressPercent: 100, tags: ['campaign', 'creatives'] },
  { clientId: C.UMANG, title: 'Website Privacy Policy Page', description: 'Add privacy policy page to Umang Hospital website.', person: 'Indresh', priority: 'Low', status: 'Done', progressPercent: 100, tags: ['website'] },

  // ─── Being Healthy ───────────────────────────────────────────────────────────
  { clientId: C.BHEALTHY, title: 'Being Healthy App Prototype', description: 'Create a proper prototype for the Being Healthy app and present it to Anant Sir ASAP. Referral app with patient signup, OPD/IPS/Surgery, discount features.', person: 'Vital', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['app', 'prototype'] },
  { clientId: C.BHEALTHY, title: 'App Flow MVP Design', description: 'Design the flow and MVP for Being Healthy application. Referral programme: 20% flat discount for referee, weekly free OPD.', person: 'Vimlendra', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['app', 'mvp'] },
  { clientId: C.BHEALTHY, title: 'Define Project Scope & Strategy', description: 'Being Healthy - make proper TRA TRS. Scope and strategy to be finalized.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['planning'] },

  // ─── Machine Chimp ───────────────────────────────────────────────────────────
  { clientId: C.MCHIMP, title: 'MedicaBazar Competitor Research', description: 'Study MedicaBazar: traffic, offerings, features, SEO rank. Reference website shared with team.', person: 'Vital', priority: 'High', status: 'Done', progressPercent: 100, tags: ['research'] },
  { clientId: C.MCHIMP, title: 'Aggregator Platform Proposal Draft', description: 'Build complete detailed proposal for refurbished medical device aggregator platform. Budget: ₹25-50 Lakhs. Client very keen.', person: 'Anant', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['proposal'] },
  { clientId: C.MCHIMP, title: 'E-Commerce Aggregator Platform Development', description: 'Build aggregator platform for refurbished medical devices. Buyers: hospitals, clinics, nursing homes, labs. Sellers: distributors, suppliers.', person: 'Vimlendra', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['development', 'platform'] },
  { clientId: C.MCHIMP, title: 'Product Listing & Catalogue System', description: 'Create catalogue system for used/refurbished machines with add-to-cart, checkout, and payment gateway.', person: 'Vimlendra', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['development'] },
  { clientId: C.MCHIMP, title: 'Voice Agent Development', description: 'Develop voice agent for Machine Chimp. Anant Sir to lead. Assign to trainees (Saffron and Arush).', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['voice-agent'] },
  { clientId: C.MCHIMP, title: 'Zoom Meeting Coordination', description: 'Monday 3:00 PM Zoom meeting scheduled with team. Saffron and Arush assigned content creation and AI voice agent tasks.', person: 'Aanchal', priority: 'Low', status: 'Done', progressPercent: 100, tags: ['meeting'] },

  // ─── Smartel Samsung ─────────────────────────────────────────────────────────
  { clientId: C.SMARTEL, title: 'Finalize Meeting with Anant Sir', description: 'Meeting with Anant Sir on Monday (second half) to be finalized. Discussion pending.', person: 'Anant', priority: 'High', status: 'Done', progressPercent: 100, tags: ['meeting'] },
  { clientId: C.SMARTEL, title: 'Ecom Platform Strategy', description: 'Build ecom platform MVP. Client meeting happened 9 Jan 2026. ₹3,00,000 discussed.', person: 'Anant', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['ecom', 'strategy'] },
  { clientId: C.SMARTEL, title: 'WhatsApp Agent Development', description: 'Develop and deploy WhatsApp agent for Smartel Samsung.', person: 'Vital', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['whatsapp', 'agent'] },
  { clientId: C.SMARTEL, title: 'Content Creation & Digital Marketing', description: 'Content creation and digital marketing support to grow brand visibility and leads.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['content', 'marketing'] },

  // ─── Fitness First ───────────────────────────────────────────────────────────
  { clientId: C.FF, title: 'Website Development & Delivery', description: 'Website designed, SSL resolved, website live. Homepage images updated by Vimlendra Sir.', person: 'Amandeep', priority: 'High', status: 'Done', progressPercent: 100, tags: ['website'] },
  { clientId: C.FF, title: 'WhatsApp Chat Agent Development', description: 'WhatsApp chat agent deployed and working. Leads visible on Google Sheet. Chatbot pricing corrections implemented.', person: 'Vital', priority: 'High', status: 'Done', progressPercent: 100, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.FF, title: 'Membership Form Integration on Website', description: 'Integrate membership form with Fitness First website. Capture data from website to CRM.', person: 'Vimlendra', priority: 'High', status: 'In Progress', progressPercent: 40, tags: ['website', 'integration'] },
  { clientId: C.FF, title: 'Voice Agent Deployment', description: 'Build and deploy voice agent via Vital/Rachit. Pending model confirmation from Anant Sir. Discussion with Exotel/IVR number ongoing.', person: 'Rachit', priority: 'High', status: 'Blocked', progressPercent: 30, tags: ['voice-agent'] },
  { clientId: C.FF, title: 'Digital Marketing & Social Media Ads', description: 'WhatsApp lead ads running, leads coming in. Facebook and Instagram ads. Managed by Prajwal Sir\'s company. Content by Sheetal.', person: 'Prajwal', priority: 'High', status: 'In Progress', progressPercent: 70, tags: ['ads', 'social-media'] },
  { clientId: C.FF, title: 'Content Creation (Prajwal)', description: 'Daily posts to be uploaded on FF Instagram/Facebook handle. Content created by Sheetal, posted by Prajwal team.', person: 'Prajwal', priority: 'Medium', status: 'In Progress', progressPercent: 60, tags: ['content'] },
  { clientId: C.FF, title: 'Bulk WhatsApp Messaging', description: 'Start WhatsApp bulk messaging. Anniversary messages and offers. Ankit to provide data. Combird issue being resolved.', person: 'Anant', priority: 'Medium', status: 'In Progress', progressPercent: 40, tags: ['whatsapp', 'marketing'] },
  { clientId: C.FF, title: 'Payment Collection ₹65,000 Balance', description: 'Invoice ₹95,000 raised. ₹30,000 received. ₹25,000 more received. Balance ₹40,000 outstanding. Sunil Sir follow-up needed.', person: 'Aanchal', priority: 'High', status: 'In Progress', progressPercent: 60, tags: ['payment'] },

  // ─── Delhi Laser Clinic ──────────────────────────────────────────────────────
  { clientId: C.DLC, title: 'WhatsApp Chat Agent Development & Deployment', description: 'Chat bot already delivered and running successfully via Gupshup. ₹65,000: ₹30,000 received, ₹35,000 pending.', person: 'Vital', priority: 'High', status: 'Done', progressPercent: 100, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.DLC, title: 'New Social Media Page & WhatsApp Integration', description: 'Anant to work on new social media page. Add WhatsApp to new account. Social media ads by Farooq.', person: 'Anant', priority: 'High', status: 'In Progress', progressPercent: 30, tags: ['social-media'] },
  { clientId: C.DLC, title: 'Webpage Development', description: 'Build and complete the webpage for Delhi Laser Clinic.', person: 'Indresh', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['website'] },
  { clientId: C.DLC, title: 'Voice Agent Development', description: 'Voice Agent to be made. Start working on voice agent after chat agent is stable.', person: 'Vital', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['voice-agent'] },
  { clientId: C.DLC, title: 'Payment Collection & Monthly Maintenance', description: 'Invoice ₹30,000 for chatbot + ₹15,000 Jan maintenance. Follow up with Nadia/Dr. Kashyap. Maintenance fees ₹15,000/month.', person: 'Aanchal', priority: 'High', status: 'In Progress', progressPercent: 50, tags: ['payment'] },

  // ─── Lennore ─────────────────────────────────────────────────────────────────
  { clientId: C.LENNORE, title: 'Complete Sales & Marketing Strategy', description: 'Prepare full sales and marketing plan for Lennore. Urgent.', person: 'Anant', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['strategy'] },
  { clientId: C.LENNORE, title: 'Team Hire & Training', description: 'Recruit necessary team members - Done. Train newly hired team (Geetanjali and others) - Pending.', person: 'Anant', priority: 'High', status: 'In Progress', progressPercent: 50, tags: ['hr'] },
  { clientId: C.LENNORE, title: 'Creatives & Website', description: 'Prepare all required creative content. Work on website updates and launch.', person: 'Vital', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['creatives', 'website'] },
  { clientId: C.LENNORE, title: 'Ad Campaigns & Lead Generation', description: 'Launch ad campaigns, collect and manage leads, track and optimize conversions. Urgent.', person: 'Anant', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['ads', 'leads'] },

  // ─── Sheetal Chaya Diagnostic ─────────────────────────────────────────────────
  { clientId: C.SHEETAL, title: 'NDA, SLA & Work Proposal', description: 'NDA, SLA, and work proposal to be shared with client. Raise invoice after NDA signed.', person: 'Aanchal', priority: 'High', status: 'Done', progressPercent: 100, tags: ['documentation'] },
  { clientId: C.SHEETAL, title: 'AI WhatsApp Chat Agent', description: 'Build AI WhatsApp Chat Agent for real-time enquiry handling & booking. ₹50,000 one-time + ₹25,000 retainership. Yet to start as of 21 Jan 2026.', person: 'Vital', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.SHEETAL, title: 'AI Voice Agent', description: 'Automated inbound & outbound calling voice agent. ₹50,000 one-time + ₹25,000 retainership. To start after chat agent deployed.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['voice-agent'] },
  { clientId: C.SHEETAL, title: 'Membership Form & Website Integration', description: 'Integrate membership form with Sheetal Chaya Diagnostic website.', person: 'Vimlendra', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['website', 'integration'] },
  { clientId: C.SHEETAL, title: 'Invoice Raise ₹50,000', description: 'Raise invoice for WhatsApp chat agent setup ₹50,000 once NDA/SLA signed.', person: 'Aanchal', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['payment'] },

  // ─── Sanjay Gupta Solar ──────────────────────────────────────────────────────
  { clientId: C.SANJAY, title: 'Full Proposal with ROI for Solar Panels', description: 'Prepare complete proposal with ROI for solar panels and batteries business. Hot client. Urgent.', person: 'Anant', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['proposal'] },

  // ─── Apple Phones and Accessories ────────────────────────────────────────────
  { clientId: C.APPLE, title: 'Initial Proposal & Strategy', description: 'Prepare initial proposal and AI strategy for Apple Phones and Accessories.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['proposal'] },

  // ─── VMS (Abhinav Singh Call Center) ─────────────────────────────────────────
  { clientId: C.VMS, title: 'Platform Voice Agent (VAPI/Hooman Lab)', description: 'POC conducted. Platform finalized. Voice agent setup complete. Demo provided.', person: 'Amandeep', priority: 'High', status: 'Done', progressPercent: 100, tags: ['voice-agent', 'platform'] },
  { clientId: C.VMS, title: 'VMS Document Signing', description: 'All documents signed. Completed successfully.', person: 'Aanchal', priority: 'High', status: 'Done', progressPercent: 100, tags: ['documentation'] },
  { clientId: C.VMS, title: 'VMS Workflow / Voice Flow', description: 'Design and structure workflow using VoiceFlow. Completed.', person: 'Vital', priority: 'High', status: 'Done', progressPercent: 100, tags: ['workflow'] },
  { clientId: C.VMS, title: 'KB Vital Form', description: 'Implement suggested changes and resend KB form. Received from client. Done.', person: 'Vital', priority: 'High', status: 'Done', progressPercent: 100, tags: ['knowledge-base'] },
  { clientId: C.VMS, title: 'Welcome Message & Onboarding', description: 'Completed onboarding welcome message. Weekly feedback via Google Form. Done.', person: 'Aanchal', priority: 'Medium', status: 'Done', progressPercent: 100, tags: ['onboarding'] },
  { clientId: C.VMS, title: 'Invoice Raise', description: 'Invoice raised 27 Feb 2026. Done.', person: 'Aanchal', priority: 'High', status: 'Done', progressPercent: 100, tags: ['payment'] },
  { clientId: C.VMS, title: 'AI Voice Agent Deployment', description: '400 telecallers, 10 big processes. Voice agent deployment targeted 12-13 March 2026. Rachit working on it. Product planned to go live 13th March.', person: 'Rachit', priority: 'High', status: 'In Progress', progressPercent: 80, tags: ['voice-agent', 'deployment'] },
  { clientId: C.VMS, title: 'Voice Agent Script & Quality Improvements', description: 'Review and improve AI voice agent conversation flow. Update opening script, add probing questions, improve speech parameters (slower, better pitch).', person: 'Rachit', priority: 'High', status: 'In Progress', progressPercent: 60, tags: ['voice-agent', 'quality'] },
  { clientId: C.VMS, title: 'Website Development', description: 'Design and develop official website for VMS using srd.com.', person: 'Indresh', priority: 'High', status: 'In Progress', progressPercent: 40, tags: ['website'] },
  { clientId: C.VMS, title: 'CRM Integration & Pilot Execution', description: 'Complete CRM integration with AI system. Configure workflows, validate connectivity, initiate pilot testing.', person: 'Indresh', priority: 'High', status: 'In Progress', progressPercent: 50, tags: ['crm', 'integration'] },
  { clientId: C.VMS, title: 'AI Email Communication System', description: 'Build system that automatically replies to emails and chat on its own.', person: 'Vimlendra', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['email', 'automation'] },
  { clientId: C.VMS, title: 'Sarvam Platform Research', description: 'Conduct research on Sarvam platform: telephony features, AI capabilities, pricing. Share recommendation with Anant Sir.', person: 'Rachit', priority: 'Medium', status: 'Done', progressPercent: 100, tags: ['research'] },
  { clientId: C.VMS, title: '50% Payment Receipt ₹1,10,000', description: '50% advance payment ₹1,10,000 received on 27 Feb 2026. Balance pending.', person: 'Aanchal', priority: 'High', status: 'Done', progressPercent: 100, tags: ['payment'] },

  // ─── NRI Trust ───────────────────────────────────────────────────────────────
  { clientId: C.NRITRUST, title: '3 Webpages Development', description: 'Develop 3 webpages for NRI Trust. Website + LinkedIn hygiene. ₹45,000 total. ₹12,500 received.', person: 'Vital', priority: 'High', status: 'In Progress', progressPercent: 50, tags: ['website'] },
  { clientId: C.NRITRUST, title: 'AI WhatsApp Chat Agent', description: 'Build WhatsApp chat agent for NRI Trust (DJ). ₹65,000 total. ₹25,000 received. Balance ₹40,000 pending.', person: 'Vital', priority: 'High', status: 'In Progress', progressPercent: 60, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.NRITRUST, title: 'WhatsApp & LinkedIn Ad Campaigns', description: 'Script approval, design approval for WhatsApp and LinkedIn ads. 25,000 numbers, 5,000 potential clients.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['ads', 'linkedin'] },
  { clientId: C.NRITRUST, title: 'Content Creation', description: 'Content planning and execution by Vital Sir. Brief to be shared by Anant Sir.', person: 'Vital', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['content'] },
  { clientId: C.NRITRUST, title: 'Voice Agent Development', description: 'AI Voice Agent: advance ₹25,000 needed. Development to start after payment. Deadline 20 March 2026.', person: 'Rachit', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['voice-agent'] },
  { clientId: C.NRITRUST, title: 'Balance Payment Collection ₹65,000', description: 'Balance payment ₹65,000 outstanding. Monthly maintenance ₹50,000 from this month. Follow-up required.', person: 'Aanchal', priority: 'High', status: 'In Progress', progressPercent: 0, tags: ['payment'] },
  { clientId: C.NRITRUST, title: 'Invoice ₹25,000 for Chatbot Advance', description: 'Raise invoice of ₹25,000 for chatbot advance payment. Pending.', person: 'Aanchal', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['payment'] },

  // ─── Gemee Homes ─────────────────────────────────────────────────────────────
  { clientId: C.GEMEE, title: 'Initial Discussion & Proposal', description: 'Prepare and share initial proposal for Gemee Homes. Cold client.', person: 'Anant', priority: 'Low', status: 'To Do', progressPercent: 0, tags: ['proposal'] },

  // ─── Azure Tech Pvt Ltd ──────────────────────────────────────────────────────
  { clientId: C.AZURE, title: 'Work Proposal Preparation & Signing', description: 'Work proposal prepared and signed by client (27 Feb 2026). Anant Sir needs to follow up - client not responding recently.', person: 'Anant', priority: 'High', status: 'Done', progressPercent: 100, tags: ['proposal', 'documentation'] },
  { clientId: C.AZURE, title: 'AI Email Agent', description: 'Build AI Email Agent for automated email communication and follow-ups. ₹65,000 / ₹60,000 discounted. Retainership ₹15,000/₹10,000.', person: 'Vital', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['email', 'agent'] },
  { clientId: C.AZURE, title: 'AI WhatsApp Chat Agent', description: 'Build WhatsApp Chat Agent for real-time enquiry handling. ₹35,000 / ₹30,000 discounted. Retainership ₹10,000/₹5,000.', person: 'Vital', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.AZURE, title: 'Content Creation (Posts & Reels)', description: 'Content creation posts and reels. Anant Sir to start working. Follow-up pending.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['content'] },
  { clientId: C.AZURE, title: 'Content Distribution (Meta/LinkedIn)', description: 'Distribute content on Meta and LinkedIn platforms.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['social-media'] },
  { clientId: C.AZURE, title: 'WhatsApp Ads Management', description: 'WhatsApp ads and content management for Azure Tech.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['ads', 'whatsapp'] },

  // ─── The Vrindavan Project ───────────────────────────────────────────────────
  { clientId: C.VRINDAVAN, title: 'Landing Page Development (srd.com)', description: 'Setup new website landing page using srd.com. Webpage development and live setup by Indresh.', person: 'Indresh', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['website', 'landing-page'] },
  { clientId: C.VRINDAVAN, title: 'AI Email Communication System / Bulk Email', description: 'Setup and send bulk email campaigns. AI email automation by Indresh/Amandeep Sir.', person: 'Amandeep', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['email', 'automation'] },
  { clientId: C.VRINDAVAN, title: 'WhatsApp AI Chat Automation', description: 'Book a Call automation. WhatsApp AI Chat setup by Amandeep/Vital.', person: 'Vital', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.VRINDAVAN, title: 'Email & WhatsApp Promotional Campaigns', description: 'Program campaigns with timer via Zepto Mail. Both email and WhatsApp promotional messaging.', person: 'Vital', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['marketing', 'campaigns'] },
  { clientId: C.VRINDAVAN, title: 'AI Data Scraping Agent', description: 'Build AI internet data scraping agent using ZOHO.', person: 'Vital', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['scraping', 'ai'] },
  { clientId: C.VRINDAVAN, title: 'NDA & Invoice', description: 'NDA shared with client. Invoice raised. Follow-up pending - client waiting for brand name finalization.', person: 'Aanchal', priority: 'High', status: 'In Progress', progressPercent: 50, tags: ['documentation', 'payment'] },
  { clientId: C.VRINDAVAN, title: 'Voice Agent Development & Deployment', description: 'AI Voice Agent: advance ₹25,000 needed. Deadline 20 March 2026. By Rachit/Vital.', person: 'Rachit', priority: 'High', status: 'In Progress', progressPercent: 20, tags: ['voice-agent'] },
  { clientId: C.VRINDAVAN, title: 'Balance Payment ₹65,000', description: 'Balance payment collection ₹65,000. Monthly maintenance ₹50,000 to begin. Follow-up required.', person: 'Aanchal', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['payment'] },

  // ─── Vedic Farms ─────────────────────────────────────────────────────────────
  { clientId: C.VEDIC, title: 'Welcome Message & Onboarding Documents', description: 'Welcome message sent (17 Feb). NDA, SLA, work proposal shared with client K. Ponnaiah. Anant Sir meeting at 5pm. No response yet.', person: 'Aanchal', priority: 'High', status: 'Done', progressPercent: 100, tags: ['onboarding', 'documentation'] },
  { clientId: C.VEDIC, title: 'Client Onboarding Form Submission', description: 'Prepare and send onboarding form. Pending client submission - will share after receiving work proposal, NDA, SLA.', person: 'Aanchal', priority: 'High', status: 'In Progress', progressPercent: 30, tags: ['onboarding'] },
  { clientId: C.VEDIC, title: 'Invoice Raise', description: 'Raise and share invoice. Raised post documentation.', person: 'Aanchal', priority: 'High', status: 'Done', progressPercent: 100, tags: ['payment'] },
  { clientId: C.VEDIC, title: 'WhatsApp Chat Agent (₹50,000)', description: 'Setup automation and chatbot flow. Deployment post documentation. Retainership ₹5,000/month.', person: 'Vital', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['chatbot', 'whatsapp'] },
  { clientId: C.VEDIC, title: 'AI Voice Agent (₹50,000)', description: 'Configure and deploy voice bot. Retainership ₹5,000/month. Deployment post documentation.', person: 'Vimlendra', priority: 'High', status: 'To Do', progressPercent: 0, tags: ['voice-agent'] },
  { clientId: C.VEDIC, title: 'CRM App Development (₹50,000)', description: 'Develop and customize CRM. Retainership ₹5,000/month. To begin after requirement finalization.', person: 'Vimlendra', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['crm', 'development'] },
  { clientId: C.VEDIC, title: 'Landing Page Development (₹10,000)', description: 'Design, develop and deploy landing page. Content approval required before go-live.', person: 'Indresh', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['website', 'landing-page'] },
  { clientId: C.VEDIC, title: 'Content Building & Digital Ads', description: 'Prepare creatives, copy and scripts. Plan and execute paid social media campaigns. Campaign to start post landing page.', person: 'Anant', priority: 'Medium', status: 'To Do', progressPercent: 0, tags: ['content', 'ads'] },
];

// Communications
const comms = [
  // INR Plus
  { clientId: C.INRPLUS, type: 'note', summary: 'Work stopped due to non-payment. Anchal to follow up on pending payments with Mr. Jeetendra and Nimish.', loggedAt: '2026-01-09' },
  { clientId: C.INRPLUS, type: 'note', summary: 'Jan 2026: Invoice raised ₹25,000. Payment to be collected. 5 videos and LinkedIn posts to be made by Vital Sir. Work stopped.', loggedAt: '2026-01-09' },

  // India Grains
  { clientId: C.INDIAG, type: 'meeting', summary: 'Meeting with Anil Yadav for knowledge base. Proposal, SA and NDA sent. Payment received ₹25,000.', loggedAt: '2025-08-31' },
  { clientId: C.INDIAG, type: 'note', summary: 'WhatsApp chatbot completed. Vital taking followup with Anil Yadav and Ravi Sir. Deployment needs to be done ASAP. Anchal to follow up for payment of ₹25,000.', loggedAt: '2026-01-10' },
  { clientId: C.INDIAG, type: 'call', summary: 'Client follow-up call: positive feedback received. Everything working smoothly. No issues. Need to coordinate with Anant Sir regarding promotions. Update Ravi Sir by 14 Feb.', loggedAt: '2026-02-12' },

  // Umang Hospital
  { clientId: C.UMANG, type: 'meeting', summary: '26 Jan 2026 Meeting: Logo update (Vimlendra Sir), Republic Day Free OPD campaign banners, WhatsApp chat agent development (Vital Sir), social media creatives (Anant Sir), website delivery done.', loggedAt: '2026-01-26' },
  { clientId: C.UMANG, type: 'meeting', summary: '1 Feb 2026 Interns Google Meet: Saffron and Aarush introduced. Tasks assigned. Social media accounts to be managed by interns.', loggedAt: '2026-02-01' },
  { clientId: C.UMANG, type: 'note', summary: '12 Feb 2026: Website revamp per Akash Hospital structure by Indresh. WhatsApp chatbot by Vital Sir (BY 13th). WhatsApp bulk marketing started. GST name updated on old website.', loggedAt: '2026-02-12' },
  { clientId: C.UMANG, type: 'note', summary: 'WhatsApp bulk messaging live. Umang team confirmed satisfaction. Website completed by Indresh, shared in group. Manu Ji and Niharika suggested changes - pending Anant Sir approval.', loggedAt: '2026-02-21' },
  { clientId: C.UMANG, type: 'note', summary: '19 Feb 2026: Website redesign revamp similar to Akash Hospital. Homepage font changes, hospital brief, front image update, remove cost details, fill empty pages - all by Indresh.', loggedAt: '2026-02-19' },

  // Being Healthy
  { clientId: C.BHEALTHY, type: 'note', summary: 'Being Healthy: To be defined. Create prototype for Being Healthy app and present to Anant Sir ASAP. Referral app concept: patient signup, OPD/IPS/surgery, 10-20% next bill discount, referee 20% flat discount, weekly free OPD.', loggedAt: '2026-01-26' },

  // Machine Chimp
  { clientId: C.MCHIMP, type: 'meeting', summary: 'Machine Chimp planning stage. Voice agent and internship activities. Develop voice agent (Anant Sir). Assign internships to Saffron and Arush for content creation and AI voice agent tasks. Zoom meeting Monday 3 PM.', loggedAt: '2026-01-26' },
  { clientId: C.MCHIMP, type: 'meeting', summary: '28 Sep 2025: MedicaBazar competitor research done. Machine Chimp: aggregator platform for refurbished medical devices. Budget ₹25-50 Lakhs. MVP required. Reference website shared with Vital and Vimlendra Sir.', loggedAt: '2025-09-28' },

  // Smartel Samsung
  { clientId: C.SMARTEL, type: 'meeting', summary: 'Smartel Samsung: Meeting scheduled. Discussion pending. Finalize meeting with Anant Sir on Monday (second half).', loggedAt: '2026-01-26' },
  { clientId: C.SMARTEL, type: 'meeting', summary: '9 Jan 2026: Meeting with Ashish on Saturday. Ecom platform ₹3,00,000. WhatsApp agent and content creation discussed.', loggedAt: '2026-01-09' },

  // Fitness First
  { clientId: C.FF, type: 'meeting', summary: '26 Jan 2026 Meeting: Webpage design finalization (Vimlendra), Business Manager creation (Manish Sir), WhatsApp chat agent (Vital Sir), Zoom meeting scheduled. NDA for Saffron/Aarush - Done.', loggedAt: '2026-01-26' },
  { clientId: C.FF, type: 'meeting', summary: '12 Feb 2026: Website go-live 18 Feb targeted. Chat agent deployment (Vital Sir). Content creation (Anant Sir). Banner for "THE NEW YOU" campaign. Voice agent build (Vital Sir).', loggedAt: '2026-02-12' },
  { clientId: C.FF, type: 'note', summary: '17 Feb 2026: Website go-live 18 Feb, SSL resolved. WhatsApp chat agent coordination done with Vital/Sunil Sir. Voice agent deployment targeted EOD by Rachit.', loggedAt: '2026-02-17' },
  { clientId: C.FF, type: 'note', summary: 'Website live. Chatbot deployed and working. Content creation assigned to Prajwal. Voice agent pending Anant Sir model confirmation. Invoice ₹30,000 received, ₹65,000 pending.', loggedAt: '2026-02-27' },
  { clientId: C.FF, type: 'call', summary: 'Payment follow-up: Sunil Sir confirmed payment before Holi. Received ₹25,000 more. Balance ₹40,000. PAN and COI documents requested for IVR number.', loggedAt: '2026-03-06' },

  // Delhi Laser Clinic
  { clientId: C.DLC, type: 'note', summary: 'Nov 2025: DLC WhatsApp chatbot delivered and running successfully via Gupshup. ₹65,000 total: ₹30,000 received, ₹35,000 to be received. Maintenance ₹15,000/month. Voice agent pending.', loggedAt: '2025-11-08' },
  { clientId: C.DLC, type: 'note', summary: '12 Feb 2026: Invoice ₹30,000 for chatbot + ₹15,000 Jan maintenance. Call Nadia regarding payment reminder. Positive feedback - everything working, ads started.', loggedAt: '2026-02-12' },
  { clientId: C.DLC, type: 'call', summary: '13 Mar 2026: Need to discuss what work completed, in progress, pending. Anant to work on new page. Social media handle management ongoing.', loggedAt: '2026-03-13' },

  // Lennore
  { clientId: C.LENNORE, type: 'note', summary: 'Lennore: Complete sales and marketing strategy needed urgently. Team hired. Training team pending. Creatives, website, ads and lead generation all ASAP. Training of Geetanjali and others.', loggedAt: '2026-01-01' },

  // Sheetal Chaya Diagnostic
  { clientId: C.SHEETAL, type: 'note', summary: '12 Jan 2026: NDA, SLA, and work proposal to be shared with client by today. Raise invoice of ₹50,000 for WhatsApp chat agent once NDA/SLA signed. Anchal to ensure payment received by 15th.', loggedAt: '2026-01-12' },
  { clientId: C.SHEETAL, type: 'note', summary: 'Services agreed: AI Voice Agent ₹50,000 + ₹25,000 annual retainership. AI WhatsApp Chat Agent ₹50,000 + ₹25,000 annual retainership. Website: sheetalchhayadiagnostics.com', loggedAt: '2026-01-21' },

  // Sanjay Gupta Solar
  { clientId: C.SANJAY, type: 'note', summary: 'Sanjay Gupta Solar Panels and Batteries: Full proposal with ROI required urgently by Anant Sir. Hot client. Timeline 2-3 days.', loggedAt: '2026-01-26' },

  // Apple Phones
  { clientId: C.APPLE, type: 'note', summary: 'Apple Phones and Accessories: Cold stage. Initial proposal and AI strategy to be prepared.', loggedAt: '2026-01-26' },

  // VMS (Abhinav Singh Call Center)
  { clientId: C.VMS, type: 'meeting', summary: '12 Feb 2026 VMS Meeting: Platform Voice Agent (VAPI/Hooman Lab) POC Friday. Document signing, workflow, KB form, welcome message, invoice discussed. 400 telecallers, 10 big processes. One-time ₹40,000 + ₹15,000/month.', loggedAt: '2026-02-12' },
  { clientId: C.VMS, type: 'note', summary: '18 Feb 2026: Documents signed. KB form received from client. Welcome message completed. Changes implemented by Vital Sir. Anant Sir wants to change voice call model - work to resume after model confirmed.', loggedAt: '2026-02-18' },
  { clientId: C.VMS, type: 'note', summary: '27 Feb 2026: Invoice raised 27 Feb. 50% advance payment received ₹1,10,000. VMS workflow done. Voice flow done. Chat agent KB done.', loggedAt: '2026-02-27' },
  { clientId: C.VMS, type: 'note', summary: '12-13 Mar 2026: AI Voice Agent setup and automation complete. Demo at 1 PM on Google Meet by Rachit. Product planned to go live 13 March. Voice agent opening script needs changes with Anant Sir.', loggedAt: '2026-03-12' },

  // NRI Trust
  { clientId: C.NRITRUST, type: 'note', summary: 'Oct 2025: Proposal approved by DJ (Dhananjay Agarwal, IIT Delhi, 35,000 LinkedIn connections). Dec 2025: Payment ₹12,500 received. 3 webpages, chatbot, LinkedIn/WhatsApp ads discussed.', loggedAt: '2025-10-01' },
  { clientId: C.NRITRUST, type: 'meeting', summary: 'Dec 2025: Chatbot ₹65,000 (₹25,000 received). Website + LinkedIn hygiene ₹45,000 (₹12,500 received). WhatsApp & LinkedIn marketing ₹25,000. Total ₹1,10,000 - ₹50,000 paid, ₹60,000 pending.', loggedAt: '2025-12-15' },
  { clientId: C.NRITRUST, type: 'note', summary: 'Feb 2026: Invoice ₹25,000 raised. Welcome message sent - Done. Anant Sir\'s meeting with DJ most critical. NDA shared with client. Follow-up required on payments.', loggedAt: '2026-02-13' },
  { clientId: C.NRITRUST, type: 'note', summary: '13 Mar 2026: Voice agent development: advance ₹25,000 needed before start. Deadline 20 March. Monthly maintenance ₹50,000 to begin. Balance payment ₹65,000 + monthly maintenance ₹50,000 pending.', loggedAt: '2026-03-13' },

  // Gemee Homes
  { clientId: C.GEMEE, type: 'note', summary: 'Gemee Homes: Cold stage. Initial discussion and proposal to be prepared.', loggedAt: '2026-01-26' },

  // Azure Tech
  { clientId: C.AZURE, type: 'note', summary: 'Jan 2026: Work proposal shared with client Sanjeev. Anchal to take follow-up. AI Email Agent ₹65,000 (discounted ₹60,000) + ₹15,000 retainer. WhatsApp Chat Agent ₹35,000 (discounted ₹30,000) + ₹10,000 retainer.', loggedAt: '2026-01-29' },
  { clientId: C.AZURE, type: 'note', summary: '27 Feb 2026: Work proposal signed by client. Content creation and distribution pending. Anant Sir not responding - follow-up required.', loggedAt: '2026-02-27' },
  { clientId: C.AZURE, type: 'note', summary: '13 Mar 2026: Anant Sir needs to follow up with Azure Tech. Not responding. Content creation for posts/reels and WhatsApp ads management pending.', loggedAt: '2026-03-13' },

  // The Vrindavan Project
  { clientId: C.VRINDAVAN, type: 'note', summary: '17-18 Feb 2026: NDA revised and shared. Invoice raised. Scope: Landing Page, AI Email Automation, WhatsApp AI Chatbot, Bulk Promotions, AI Data Scraping. Client waiting for brand name finalization.', loggedAt: '2026-02-17' },
  { clientId: C.VRINDAVAN, type: 'meeting', summary: 'Meeting arranged by Anant Sir with Mr. Ranjeet. Signed documents to be handed over. NDA shared with client. Follow-up message sent.', loggedAt: '2026-02-23' },
  { clientId: C.VRINDAVAN, type: 'note', summary: '13 Mar 2026: Voice agent deployment deadline 20 March (final). Balance payment ₹65,000 + monthly maintenance ₹50,000 pending. Monthly invoice ₹50,000 to begin this month.', loggedAt: '2026-03-13' },

  // Vedic Farms
  { clientId: C.VEDIC, type: 'note', summary: '17-18 Feb 2026: Welcome message sent - Done. NDA, SLA, work proposal already shared with client K. Ponnaiah. Not receiving any response. Anant Sir to meet Mr. K. Ponnaiah at 5pm.', loggedAt: '2026-02-17' },
  { clientId: C.VEDIC, type: 'note', summary: '21-27 Feb 2026: No response from client. Invoice raised post documentation. All deployment tasks pending post documentation and requirement finalization.', loggedAt: '2026-02-21' },
  { clientId: C.VEDIC, type: 'note', summary: 'Services scope: WhatsApp Chat Agent ₹50,000 + ₹5,000/month, AI Voice Agent ₹50,000 + ₹5,000/month, CRM App ₹50,000 + ₹5,000/month, Landing Page ₹10,000, Content Building ₹20,000, Social Media Ads ₹15,000. Total ₹1,60,000 + ₹50,000/month.', loggedAt: '2026-02-18' },
];

async function run() {
  const client = await pool.connect();
  try {
    let storiesInserted = 0, commsInserted = 0;

    for (const s of stories) {
      await client.query(
        `INSERT INTO stories (client_id, title, description, person, priority, status, progress_percent, tags, due_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [s.clientId, s.title, s.description, s.person || null, s.priority, s.status, s.progressPercent || 0, s.tags || null, s.dueDate || '2026-03-31']
      );
      storiesInserted++;
      process.stdout.write(`STORY: ${s.title.substring(0, 50)}\n`);
    }

    for (const c of comms) {
      await client.query(
        `INSERT INTO client_communications (client_id, type, summary, logged_by, logged_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [c.clientId, c.type, c.summary, 'Agentix Team', c.loggedAt]
      );
      commsInserted++;
    }

    console.log(`\n✓ Stories inserted: ${storiesInserted}`);
    console.log(`✓ Communications inserted: ${commsInserted}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
