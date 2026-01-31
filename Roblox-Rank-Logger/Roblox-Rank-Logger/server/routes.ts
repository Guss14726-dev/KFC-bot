import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertMonitorSchema } from "@shared/schema";
import { startDiscordBot, sendTestMessage } from "./bot";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.monitors.list.path, async (req, res) => {
    const monitors = await storage.getMonitors();
    res.json(monitors);
  });

  app.post(api.monitors.create.path, async (req, res) => {
    try {
      const input = insertMonitorSchema.parse(req.body);
      const monitor = await storage.createMonitor(input);

      // Prevent spamming old logs
      await storage.updateMonitorLastLog(monitor.id, new Date());

      res.status(201).json(monitor);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.monitors.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });

    await storage.deleteMonitor(id);
    res.status(204).send();
  });

  app.post(api.monitors.test.path, async (req, res) => {
    const id = Number(req.params.id);
    const monitor = await storage.getMonitor(id);

    if (!monitor) return res.status(404).json({ message: "Monitor not found" });

    try {
      await sendTestMessage(monitor.discordChannelId);
      res.json({ success: true, message: "Test message sent!" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send test message" });
    }
  });

  // ---------------- Discord Bot Safety ----------------
  async function safeStartBot(retries = 3) {
    try {
      await startDiscordBot();
    } catch (err) {
      console.error("Discord bot failed to start:", err);
      if (retries > 0) {
        console.log(`Retrying bot start (${retries} attempts left)...`);
        setTimeout(() => safeStartBot(retries - 1), 5000);
      } else {
        console.error("Discord bot failed to start after multiple attempts.");
      }
    }
  }

  // Listen for unexpected client errors
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
  });

  safeStartBot();

  return httpServer;
}
