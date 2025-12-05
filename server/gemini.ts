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
