import { monitors, botConfig, type Monitor, type InsertMonitor, type BotConfig } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getMonitors(): Promise<Monitor[]>;
  getMonitor(id: number): Promise<Monitor | undefined>;
  createMonitor(monitor: InsertMonitor): Promise<Monitor>;
  deleteMonitor(id: number): Promise<void>;
  updateMonitorLastLog(id: number, date: Date): Promise<void>;

  // ✅ CONFIG
  getBotConfig(): Promise<BotConfig>;
  updateBotConfig(data: Partial<BotConfig>): Promise<BotConfig>;
}

export class DatabaseStorage implements IStorage {
  async getMonitors(): Promise<Monitor[]> {
    return await db.select().from(monitors);
  }

  async getMonitor(id: number): Promise<Monitor | undefined> {
    const [monitor] = await db.select().from(monitors).where(eq(monitors.id, id));
    return monitor;
  }

  async createMonitor(insertMonitor: InsertMonitor): Promise<Monitor> {
    const [monitor] = await db.insert(monitors).values(insertMonitor).returning();
    return monitor;
  }

  async deleteMonitor(id: number): Promise<void> {
    await db.delete(monitors).where(eq(monitors.id, id));
  }

  async updateMonitorLastLog(id: number, date: Date): Promise<void> {
    await db.update(monitors).set({ lastLogDate: date }).where(eq(monitors.id, id));
  }

  // ================= BOT CONFIG =================

  async getBotConfig(): Promise<BotConfig> {
    let [config] = await db.select().from(botConfig);

    if (!config) {
      const [created] = await db.insert(botConfig).values({
        id: "global",
        status: "online",
        requiredRoleId: "",
        rankMap: {}
      }).returning();

      config = created;
    }

    return config;
  }

  async updateBotConfig(data: Partial<BotConfig>): Promise<BotConfig> {
    const current = await this.getBotConfig();

    const [updated] = await db.update(botConfig)
      .set({ ...current, ...data })
      .where(eq(botConfig.id, "global"))
      .returning();

    return updated;
  }
}

export const storage = new DatabaseStorage();