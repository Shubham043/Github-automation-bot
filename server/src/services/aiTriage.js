import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let genAI = null;
if (config.gemini.apiKey) {
  genAI = new GoogleGenerativeAI(config.gemini.apiKey);
}

/**
 * Triages an issue or PR using Gemini AI
 */
export async function triageContent({ title, body, type = 'issue' }) {
  if (!genAI) {
    logger.warn('AI Triage skipped: GEMINI_API_KEY is not configured');
    return {
      summary: title,
      suggested_labels: ['needs-triage'],
      priority: 'medium',
      reasoning: 'AI triage disabled (no API key configured).',
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an automated GitHub repository triage assistant.
Analyze the following ${type} and provide a strictly valid JSON response (no markdown formatting, no backticks, just raw JSON).

${type.toUpperCase()} TITLE:
${title}

${type.toUpperCase()} DESCRIPTION:
${body || '(No description provided)'}

Respond with this exact JSON structure:
{
  "summary": "Concise 1-sentence summary of the core topic or bug",
  "suggested_labels": ["array", "of", "labels", "like", "bug", "enhancement", "documentation", "frontend", "security"],
  "priority": "low" | "medium" | "high" | "critical",
  "sentiment": "positive" | "neutral" | "negative",
  "suggested_comment": "Short helpful comment acknowledging the author and detailing next steps"
}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // Clean any accidental markdown backticks from LLM output
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleanJson);

    logger.info({ title, priority: parsed.priority }, 'AI Triage completed successfully');
    return parsed;
  } catch (err) {
    logger.error({ err, title }, 'Failed to triage content via Gemini');
    return {
      summary: title,
      suggested_labels: ['needs-review'],
      priority: 'medium',
      reasoning: `AI Triage error: ${err.message}`,
    };
  }
}
