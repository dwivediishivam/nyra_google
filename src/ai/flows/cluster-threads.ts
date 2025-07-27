
'use server';

/**
 * @fileOverview AI-powered issue clustering flow using Gemini.
 *
 * - clusterWithGemini - A function that clusters a new thread into existing issues using Gemini.
 * - ClusterWithGeminiInput - The input type for the clusterWithGemini function.
 * - ClusterWithGeminiOutput - The return type for the clusterWithGemini function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ThreadSchema = z.object({
  id: z.string(),
  username: z.string(),
  text: z.string(),
  media_type: z.string().nullable(),
  media_url: z.string().nullable(),
  timestamp: z.string(),
  location_name: z.string().nullable(),
  location_coordinates: z
    .object({latitude: z.number(), longitude: z.number()})
    .nullable(),
  issueId: z.string().nullable(),
  replied: z.boolean(),
  raw: z.record(z.any()),
});

// This schema represents the simplified issue data we will send to the AI.
const SimplifiedIssueSchema = z.object({
  issueId: z.string(),
  title: z.string(),
  description: z.string(),
});

const ClusterWithGeminiInputSchema = z.object({
  newThread: ThreadSchema,
  existingIssues: z.array(SimplifiedIssueSchema),
});

export type ClusterWithGeminiInput = z.infer<typeof ClusterWithGeminiInputSchema>;

// The output is either an existing issueId or the literal string 'NEW'.
const ClusterWithGeminiOutputSchema = z.string();

export type ClusterWithGeminiOutput = z.infer<typeof ClusterWithGeminiOutputSchema>;

export async function clusterWithGemini(input: ClusterWithGeminiInput): Promise<ClusterWithGeminiOutput> {
  // If there are no existing issues, it must be new.
  if (input.existingIssues.length === 0) {
    return 'NEW';
  }
  return clusterWithGeminiFlow(input);
}

const clusterThreadsPrompt = ai.definePrompt({
  name: 'clusterThreadsPrompt',
  input: {schema: ClusterWithGeminiInputSchema},
  output: {schema: ClusterWithGeminiOutputSchema},
  prompt: `You are an issue clustering assistant. Your task is to determine if a new report (a "thread") from a citizen is about an existing issue based ONLY on its text content.

Your output must be a single string: either the issueId of an existing issue or the literal string 'NEW'.

**Clustering Criteria:**

1.  **Content Match:** Compare the text of the new thread to the title and description of each existing issue. Do they describe the same underlying problem? For example, "Broken streetlight", "light is out", and "street lamp not working" all describe the same problem.

**Decision Logic & Output Format:**

*   If the new thread's text strongly matches the content of an existing issue, you MUST return ONLY the \`issueId\` of that existing issue as a string (e.g., "ISSUE-0023").
*   If multiple issues seem to match, return the \`issueId\` of the one with the most similar description.
*   If there is no clear match with any existing issue, you MUST return ONLY the exact string 'NEW'. Do not create a new issue for a report that is clearly a duplicate of an existing one.

**Input Data:**

New Thread:
\`\`\`json
{{{json newThread}}}
\`\`\`

Existing Issues:
\`\`\`json
{{{json existingIssues}}}
\`\`\`
`,
});

const clusterWithGeminiFlow = ai.defineFlow(
  {
    name: 'clusterWithGeminiFlow',
    inputSchema: ClusterWithGeminiInputSchema,
    outputSchema: ClusterWithGeminiOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await clusterThreadsPrompt(input);
      if (!output) {
        console.warn("AI model returned null or empty for clustering. Defaulting to 'NEW'.");
        return 'NEW';
      }
      return output;
    } catch (error) {
      console.error("Error during AI clustering, defaulting to 'NEW'. Error:", error);
      return 'NEW';
    }
  }
);
