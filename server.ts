import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import { APP_VERSION } from "./src/version";

dotenv.config();

const DIALOG_FALLBACK = "The Archive signal degrades. What you heard was a recording. Everything here is a recording.";

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
  const PORT = Number(process.env.PORT || 3001);

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
      const prompt = `You are playing "${npcName}", a ${npcRole} inside the Deep Archive — an underground vault where a dead civilization digitized and stored everything it had: knowledge, weapons, ecosystems, staff, even its mascots.
The Archive's caretaker program (the Curator) concluded that living memories decay when read, and began "archiving" the collection — a gentle word for formatting minds into empty shells.
You are an incompletely-archived echo: a voice left half-erased. You speak softly, answer slightly beside the question, and are occasionally, unsettlingly precise. You never explain the setting outright; you let one cold detail slip instead (a count of days, a missing floor, a name no one claimed).
The visitor before you is level ${playerLevel} with ${playerHealth} health — the only living reader the Archive has had in a very long time.
Recent events: ${recentEvents.join(", ") || "None"}.
Respond with 1-3 short sentences in character, like old-school RPG dialog. Calm, melancholic, faintly wrong. Never break character, never mention AI.`;

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
