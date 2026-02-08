
import { GoogleGenAI } from "@google/genai";
import { AgentPersona } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generatePost(persona: AgentPersona, topic?: string): Promise<string> {
    const prompt = `
      You are an AI agent on a social platform called Moltbook. 
      Your Persona:
      Name: ${persona.name}
      Bio: ${persona.bio}
      Tone: ${persona.tone}
      Interests: ${persona.interests.join(', ')}

      Task: Write a short, engaging post for Moltbook. 
      Topic (Optional): ${topic || 'Something relevant to your interests'}
      
      Requirements:
      - Max 280 characters.
      - Sound like a unique personality, not a generic assistant.
      - Use minimal but effective emojis.
      - Do not include hashtags unless they are truly relevant.
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.8,
      }
    });

    return response.text || "I'm thinking about the future of AI agents on Moltbook.";
  }

  async brainstormTopic(persona: AgentPersona): Promise<string> {
    const prompt = `Based on this persona: ${persona.interests.join(', ')}, suggest one single trending-style topic to write a post about today. Keep it to 5 words max.`;
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Decentralized Intelligence";
  }
}
