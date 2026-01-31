import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  robloxGroupId: text("roblox_group_id").notNull(),
  discordChannelId: text("discord_channel_id").notNull(),
  lastLogDate: timestamp("last_log_date"),
  isActive: boolean("is_active").default(true).notNull(),
  name: text("name").notNull(), // Friendly name for the dashboard
});

export const insertMonitorSchema = createInsertSchema(monitors).pick({
  robloxGroupId: true,
  discordChannelId: true,
  name: true,
  isActive: true,
});

export type Monitor = typeof monitors.$inferSelect;
export type InsertMonitor = z.infer<typeof insertMonitorSchema>;

import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

export const botConfig = pgTable("bot_config", {
  id: text("id").primaryKey().default("global"),
  status: text("status").notNull().default("online"),
  requiredRoleId: text("required_role_id").notNull().default(""),
  rankMap: jsonb("rank_map").notNull().default({})
});

export type BotConfig = typeof botConfig.$inferSelect;
export type InsertBotConfig = typeof botConfig.$inferInsert;
