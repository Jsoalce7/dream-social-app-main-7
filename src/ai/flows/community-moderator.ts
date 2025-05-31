'use server';

/**
 * @fileOverview A community moderator AI agent.
 *
 * - moderateCommunityMessage - A function that handles the moderation of community messages.
 * - ModerateCommunityMessageInput - The input type for the moderateCommunityMessage function.
 * - ModerateCommunityMessageOutput - The return type for the moderateCommunityMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ModerateCommunityMessageInputSchema = z.object({
  message: z.string().describe('The message to be checked for guideline violations.'),
  communityGuidelines: z
    .string()
    .describe('The community guidelines that the message should adhere to.'),
});
export type ModerateCommunityMessageInput = z.infer<typeof ModerateCommunityMessageInputSchema>;

const ModerateCommunityMessageOutputSchema = z.object({
  violatesGuidelines: z
    .boolean()
    .describe('Whether the message violates the community guidelines.'),
  explanation: z
    .string()
    .describe('The explanation of why the message violates the guidelines.'),
});
export type ModerateCommunityMessageOutput = z.infer<typeof ModerateCommunityMessageOutputSchema>;

export async function moderateCommunityMessage(
  input: ModerateCommunityMessageInput
): Promise<ModerateCommunityMessageOutput> {
  return moderateCommunityMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateCommunityMessagePrompt',
  input: {schema: ModerateCommunityMessageInputSchema},
  output: {schema: ModerateCommunityMessageOutputSchema},
  prompt: `You are a community moderator. You will determine whether a given message violates the community guidelines.

Community Guidelines: {{{communityGuidelines}}}

Message: {{{message}}}

Respond with whether the message violates the guidelines, and explain why. Be concise.

Here is the output schema:
${JSON.stringify(ModerateCommunityMessageOutputSchema)}`,
});

const moderateCommunityMessageFlow = ai.defineFlow(
  {
    name: 'moderateCommunityMessageFlow',
    inputSchema: ModerateCommunityMessageInputSchema,
    outputSchema: ModerateCommunityMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
