import type { Challenge } from "@/features/generation/types/challenge";
import { generateChallengesFromNotes } from "@/lib/services/challengeGenerationService";

export type { Challenge };

export const generateChallengeClips = async (
  notes: string,
): Promise<Challenge[]> => {
  return generateChallengesFromNotes(notes);
};
