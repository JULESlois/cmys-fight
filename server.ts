import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import { APP_VERSION } from "./src/version";

dotenv.config();

const DIALOG_FALLBACK = "The archive signal is unstable. Return when the memory is clearer.";

function boundedText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized.slice(0, maxLength) : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "cmys-fight", version: APP_VERSION });
  });

  // AI Dialog Endpoint
  app.post("/api/generate-dialog", async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body as Record<string, unknown>
        : {};
      const npcName = boundedText(body.npcName, "ARCHIVE ECHO", 64);
      const npcRole = boundedText(body.npcRole, "memory keeper", 96);
      const playerLevel = boundedNumber(body.playerLevel, 1, 1, 999);
      const playerHealth = boundedNumber(body.playerHealth, 1, 0, 99999);
      const recentEvents = Array.isArray(body.recentEvents)
        ? body.recentEvents
          .filter((event): event is string => typeof event === "string")
          .slice(-5)
          .map(event => boundedText(event, "", 120))
          .filter(Boolean)
        : [];

      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        res.json({ text: DIALOG_FALLBACK, fallback: true });
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are playing the role of "${npcName}", who is a ${npcRole} in a retro pixel-art JRPG. 
Crucially, this world is actually an "Old Memory" or "Tactical Simulation" – a remnant of a bygone era. You are a glitching or echoing voice from the past.
The player is a modern explorer visiting this simulation. They are level ${playerLevel} with ${playerHealth} health.
Recent events: ${recentEvents.join(", ") || "None"}.
Respond with 1-3 short sentences as this character. Keep it brief, like an old-school RPG dialog, but subtly hint at the fact that this is an old simulation.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        }
      });
      
      res.json({ text: response.text });
    } catch (error: any) {
      const isRateLimit = 
        error?.status === 429 || 
        error?.status === "RESOURCE_EXHAUSTED" || 
        error?.message?.includes("429") || 
        error?.message?.includes("Quota exceeded");
        
      if (isRateLimit) {
        res.json({ text: DIALOG_FALLBACK, fallback: true });
      } else {
        console.error("Error generating dialog:", error);
        res.status(502).json({ error: "Failed to generate dialog.", fallback: DIALOG_FALLBACK });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
