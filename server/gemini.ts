import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface ExtractedProposalData {
  suggestedTasks: {
    title: string;
    description: string;
    priority: "High" | "Medium" | "Low";
    estimatedHours: number;
  }[];
  extractedRevenue: number | null;
  projectSummary: string;
  keyDeliverables: string[];
  suggestedTimeline: string | null;
}

export async function analyzeProposal(
  proposalText: string,
  clientName: string
): Promise<ExtractedProposalData> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are analyzing a business proposal/contract for a CRM system. Extract the following information from the proposal text and return it as JSON:

1. suggestedTasks: An array of tasks that should be created based on the proposal. Each task should have:
   - title: Short, actionable title (e.g., "Design Homepage Mockup")
   - description: Brief description of what needs to be done
   - priority: "High", "Medium", or "Low" based on importance/urgency
   - estimatedHours: Estimated hours to complete (number)

2. extractedRevenue: The total project value/revenue mentioned in the proposal (number, or null if not found)

3. projectSummary: A 1-2 sentence summary of what the project is about

4. keyDeliverables: An array of key deliverables mentioned in the proposal

5. suggestedTimeline: The overall project timeline if mentioned (e.g., "3 months", "Q1 2025"), or null if not found

Client Name: ${clientName}

Proposal Text:
${proposalText}

Return ONLY valid JSON in this exact format, no markdown or explanation:
{
  "suggestedTasks": [...],
  "extractedRevenue": number or null,
  "projectSummary": "...",
  "keyDeliverables": [...],
  "suggestedTimeline": "..." or null
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as ExtractedProposalData;
    return parsed;
  } catch (error) {
    console.error("Error analyzing proposal with Gemini:", error);
    return {
      suggestedTasks: [],
      extractedRevenue: null,
      projectSummary: "Unable to analyze proposal",
      keyDeliverables: [],
      suggestedTimeline: null,
    };
  }
}

export async function generateTasksFromText(
  text: string,
  clientName: string
): Promise<ExtractedProposalData["suggestedTasks"]> {
  const result = await analyzeProposal(text, clientName);
  return result.suggestedTasks;
}

interface EmailGenerationInput {
  storyTitle: string;
  storyDescription: string | null;
  storyStatus: string;
  storyPriority: string;
  progressPercent: number;
  dueDate: string | null;
  clientName: string;
  recipientName: string | null;
  recentComments: { authorName: string; body: string }[];
  userNotes: string;
  senderName: string;
}

interface GeneratedEmail {
  subject: string;
  body: string;
}

export async function generateStatusEmail(input: EmailGenerationInput): Promise<GeneratedEmail> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const commentsContext = input.recentComments.length > 0
    ? input.recentComments.map(c => `${c.authorName}: ${c.body}`).join('\n')
    : 'No recent updates';

  const prompt = `You are drafting a professional client update email for a project management system. Write a concise, friendly, and professional email based on the following context:

PROJECT DETAILS:
- Task: ${input.storyTitle}
- Client Company: ${input.clientName}
- Status: ${input.storyStatus}
- Priority: ${input.storyPriority}
- Progress: ${input.progressPercent}% complete
- Due Date: ${input.dueDate || 'Not set'}

TASK DESCRIPTION (summarize, don't copy verbatim):
${input.storyDescription || 'No description provided'}

RECENT TEAM UPDATES (summarize key points, don't copy verbatim):
${commentsContext}

USER'S ADDITIONAL NOTES TO INCLUDE:
${input.userNotes || 'None'}

INSTRUCTIONS:
1. Write a professional, friendly email to the client contact (${input.recipientName || 'there'})
2. Summarize the current status and progress naturally - don't just list percentages
3. Highlight any important updates from the team comments
4. Include the user's additional notes in a natural way
5. Be concise - the email should be 3-5 short paragraphs max
6. Don't copy the task description or comments word-for-word - summarize professionally
7. End with an offer to answer questions

Return ONLY valid JSON in this format:
{
  "subject": "Brief, clear subject line",
  "body": "The email body with proper line breaks using \\n"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedEmail;
    return parsed;
  } catch (error) {
    console.error("Error generating email with Gemini:", error);
    return {
      subject: `Update on: ${input.storyTitle}`,
      body: `Hi ${input.recipientName || 'there'},\n\nI wanted to give you a quick update on "${input.storyTitle}".\n\nWe are currently at ${input.progressPercent}% completion.\n\nPlease let me know if you have any questions.\n\nBest regards,\n${input.senderName}`
    };
  }
}
