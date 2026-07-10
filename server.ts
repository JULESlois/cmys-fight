import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "cmys-fight", version: "0.8.0" });
  });

  // AI Dialog Endpoint
  app.post("/api/generate-dialog", async (req, res) => {
    try {
      const { npcName, npcRole, playerLevel, playerHealth, recentEvents } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
        res.json({ text: "I'm a bit overwhelmed right now. Please give me a moment to think." });
      } else {
        console.error("Error generating dialog:", error);
        res.status(500).json({ error: "Failed to generate dialog." });
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
