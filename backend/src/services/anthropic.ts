import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error("Missing environment variable: ANTHROPIC_API_KEY");
}

export const anthropic = new Anthropic({ apiKey });
