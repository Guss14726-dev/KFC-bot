import express from "express";
import { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { storage } from "./storage";
import { fetchGroupRankChanges, getUserInfo, getGroupRoles, getUserIdFromUsername, setUserRankByName, Role } from "./roblox";

// ---------------- DISCORD CLIENT ----------------
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});
let isBotRunning = false;
let pollingStarted = false;

// ---------------- CACHES ----------------
const allowedLinkChannels = new Set<string>();
const groupRolesCache: Record<string, Role[]> = {};
const userCache = new Map<number, string>();

// ---------------- CONFIG ----------------
const REQUIRED_ROLE_ID = "1464723868429058160";
const SHIFT_ROLE_ID = "1465378316667326574";
const SHIFT_CHANNEL_ID = "1464728630193160336";
const WELCOME_CHANNEL_ID = "1464730736144683201";

// ---------------- UTILS ----------------
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function getRoleName(groupId: string, roleId?: number) {
  if (!roleId) return "Unknown Role";
  const roles = groupRolesCache[groupId] || [];
  const role = roles.find(r => r.id === roleId);
  return role ? role.name : `Unknown Role (${roleId})`;
}

async function getUsernameFast(targetId?: number, targetName?: string) {
  if (targetName) return targetName;
  if (!targetId) return "Unknown";
  if (userCache.has(targetId)) return userCache.get(targetId)!;

  try {
    const user = await getUserInfo(targetId);
    const name = user.username || "Unknown";
    userCache.set(targetId, name);
    return name;
  } catch { return "Unknown"; }
}

async function getConfiguredGroupId(): Promise<string | null> {
  const monitors = await storage.getMonitors();
  const activeMonitor = monitors.find(m => m.isActive);
  return activeMonitor?.robloxGroupId || null;
}

// ---------------- SLASH COMMANDS ----------------
const commands = [
  new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Set a user to a specific rank in your Roblox group")
    .addStringOption(opt => opt.setName("username").setDescription("Roblox username").setRequired(true))
    .addStringOption(opt => opt.setName("rank").setDescription("Rank name").setRequired(true)),

  new SlashCommandBuilder()
    .setName("demote")
    .setDescription("Set a user to a specific rank in your Roblox group")
    .addStringOption(opt => opt.setName("username").setDescription("Roblox username").setRequired(true))
    .addStringOption(opt => opt.setName("rank").setDescription("Rank name").setRequired(true)),

  new SlashCommandBuilder()
    .setName("shift")
    .setDescription("Announce a shift")
    .addStringOption(opt => opt.setName("game").setDescription("Game being hosted").setRequired(true))
    .addStringOption(opt => opt.setName("description").setDescription("Brief description").setRequired(true))
    .addStringOption(opt => opt.setName("cohost").setDescription("Optional co-host").setRequired(false)),

  new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Send a DM")
    .addUserOption(opt => opt.setName("user").setDescription("User to DM").setRequired(true))
    .addStringOption(opt => opt.setName("message").setDescription("Message").setRequired(true)),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send message to channel")
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true))
    .addStringOption(opt => opt.setName("message").setDescription("Message").setRequired(true)),

  new SlashCommandBuilder().setName("test_welcome").setDescription("Test welcome message"),

  new SlashCommandBuilder()
    .setName("let_links")
    .setDescription("Allow links in a channel")
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),

  new SlashCommandBuilder()
    .setName("block_links")
    .setDescription("Block links in a channel")
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),
];

async function registerSlashCommands() {
  if (!process.env.DISCORD_TOKEN || !client.user) return;
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(c => c.toJSON()) });
    console.log("✅ Slash commands registered!");
  } catch (err) { console.error("❌ Failed to register slash commands:", err); }
}

// ---------------- PERMISSIONS ----------------
async function checkRolePermission(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;
  if (!member || !("roles" in member)) return false;
  const hasRole = member.roles.cache.has(REQUIRED_ROLE_ID);
  if (!hasRole) await interaction.reply({ content: "❌ You don't have permission.", ephemeral: true });
  return hasRole;
}

async function checkShiftPermission(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;
  if (!member || !("roles" in member)) return false;
  const hasRole = member.roles.cache.has(SHIFT_ROLE_ID);
  if (!hasRole) await interaction.reply({ content: "❌ You can't host shifts.", ephemeral: true });
  return hasRole;
}

// ---------------- HANDLERS ----------------
async function handleRankChange(interaction: ChatInputCommandInteraction, isPromotion: boolean) {
  if (!await checkRolePermission(interaction)) return;

  const username = interaction.options.getString("username", true);
  const rankName = interaction.options.getString("rank", true);
  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie) return interaction.reply({ content: "❌ ROBLOX_COOKIE not set.", ephemeral: true });

  const groupId = await getConfiguredGroupId();
  if (!groupId) return interaction.reply({ content: "❌ No group configured.", ephemeral: true });

  await interaction.deferReply();
  const userId = await getUserIdFromUsername(username);
  if (!userId) return interaction.editReply(`❌ Could not find Roblox user: **${username}**`);

  const result = await setUserRankByName(groupId, userId, rankName, cookie);
  if (result.success) {
    const embed = new EmbedBuilder()
      .setTitle(isPromotion ? "✅ User Promoted" : "⬇️ User Demoted")
      .setColor(isPromotion ? 0x00FF00 : 0xFF6600)
      .addFields(
        { name: "User", value: username, inline: true },
        { name: "Changed By", value: interaction.user.username, inline: true },
        { name: "Change", value: `${result.oldRole} → ${result.newRole}`, inline: false }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } else { await interaction.editReply(`❌ Failed: ${result.error}`); }
}

async function handleShift(interaction: ChatInputCommandInteraction) {
  if (!await checkShiftPermission(interaction)) return;

  const game = interaction.options.getString("game", true);
  const description = interaction.options.getString("description", true);
  const cohost = interaction.options.getString("cohost");

  await interaction.deferReply();
  const channel = await client.channels.fetch(SHIFT_CHANNEL_ID);
  if (!channel?.isTextBased()) return interaction.editReply("❌ Shift channel not found.");

  const embed = new EmbedBuilder()
    .setTitle("🎮 Shift Announcement")
    .setColor(0x5865F2)
    .addFields(
      { name: "Host", value: interaction.user.username, inline: true },
      { name: "Co-Host", value: cohost || "None", inline: true },
      { name: "Game", value: game, inline: false },
      { name: "Description", value: description, inline: false }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await interaction.editReply("✅ Shift announced!");
}

async function handleDM(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;
  const user = interaction.options.getUser("user", true);
  const message = interaction.options.getString("message", true);
  await interaction.deferReply({ ephemeral: true });

  try { await user.send(message); await interaction.editReply(`✅ Message sent to ${user.username}`); }
  catch { await interaction.editReply(`❌ Could not DM ${user.username}`); }
}

async function handleSay(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;
  const channel = interaction.options.getChannel("channel", true);
  const message = interaction.options.getString("message", true);
  await interaction.deferReply({ ephemeral: true });

  const textChannel = await client.channels.fetch(channel.id);
  if (!textChannel?.isTextBased()) return interaction.editReply("❌ Invalid text channel.");
  await textChannel.send(message);
  await interaction.editReply(`✅ Message sent to <#${channel.id}>`);
}

async function handleLetLinks(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;
  const channel = interaction.options.getChannel("channel", true);
  allowedLinkChannels.add(channel.id);
  await interaction.reply({ content: `✅ Links allowed in <#${channel.id}>`, ephemeral: true });
}

async function handleBlockLinks(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;
  const channel = interaction.options.getChannel("channel", true);
  allowedLinkChannels.delete(channel.id);
  await interaction.reply({ content: `✅ Links blocked in <#${channel.id}>`, ephemeral: true });
}

async function handleTestWelcome(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;
  await interaction.deferReply({ ephemeral: true });
  const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
  if (!channel?.isTextBased()) return interaction.editReply("❌ Welcome channel not found.");
  await channel.send(`Welcome ${interaction.user} to **KFC | RBLX**!`);
  await interaction.editReply("✅ Test welcome sent!");
}

// ---------------- POLLING ----------------
async function startPolling() {
  console.log("🟢 Polling started");
  while (true) {
    try {
      const monitors = await storage.getMonitors();
      const cookie = process.env.ROBLOX_COOKIE;
      if (!cookie) { console.warn("ROBLOX_COOKIE not set"); await sleep(15000); continue; }

      for (const monitor of monitors.filter(m => m.isActive)) {
        try {
          const logs = await fetchGroupRankChanges(monitor.robloxGroupId, cookie);
          logs.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

          const lastDate = monitor.lastLogDate ? new Date(monitor.lastLogDate) : new Date(0);
          const newLogs = logs.filter(log => new Date(log.created) > lastDate);
          if (!newLogs.length) continue;

          for (const log of newLogs) {
            await sendLogToDiscord(monitor.discordChannelId, log, monitor.robloxGroupId);
          }

          const newest = new Date(newLogs[newLogs.length - 1].created);
          await storage.updateMonitorLastLog(monitor.id, newest);
        } catch (err) { console.error("❌ Monitor error:", err); }
      }
    } catch (err) { console.error("❌ Polling error:", err); }
    await sleep(15000);
  }
}

async function sendLogToDiscord(channelId: string, log: any, groupId: string) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;
    if (!groupRolesCache[groupId]) groupRolesCache[groupId] = await getGroupRoles(groupId);

    const actorName = log.actor?.user?.name || "Unknown";
    const targetName = await getUsernameFast(log.description?.TargetId, log.description?.TargetName);
    const oldRole = getRoleName(groupId, log.description?.OldRoleSetId);
    const newRole = getRoleName(groupId, log.description?.NewRoleSetId);

    const embed = new EmbedBuilder()
      .setTitle("🔥 Rank Change Detected")
      .setColor(0xffa500)
      .addFields(
        { name: "Group ID", value: groupId, inline: true },
        { name: "Actor", value: actorName, inline: true },
        { name: "Target", value: targetName, inline: true },
        { name: "Change", value: `${oldRole} → ${newRole}`, inline: false }
      )
      .setTimestamp(new Date(log.created));

    await channel.send({ embeds: [embed] });
  } catch (err) { console.error("❌ Discord send error:", err); }
}

// ---------------- BOT START ----------------
async function startBot() {
  if (isBotRunning) return;
  if (!process.env.DISCORD_TOKEN) return console.warn("DISCORD_TOKEN not set");

  await client.login(process.env.DISCORD_TOKEN);
  await new Promise<void>(res => client.once("ready", () => res()));
  console.log(`✅ Logged in as ${client.user?.tag}`);
  isBotRunning = true;

  await registerSlashCommands();

  client.on("interactionCreate", async i => {
    if (!i.isChatInputCommand()) return;

    switch(i.commandName) {
      case "promote": await handleRankChange(i, true); break;
      case "demote": await handleRankChange(i, false); break;
      case "shift": await handleShift(i); break;
      case "dm": await handleDM(i); break;
      case "say": await handleSay(i); break;
      case "test_welcome": await handleTestWelcome(i); break;
      case "let_links": await handleLetLinks(i); break;
      case "block_links": await handleBlockLinks(i); break;
    }
  });

  client.on("guildMemberAdd", async m => {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (channel?.isTextBased()) await channel.send(`Welcome ${m} to **KFC | RBLX**!`);
  });

  client.on("messageCreate", async msg => {
    if (msg.author.bot || !msg.guild) return;
    const member = msg.member;
    const isAdmin = member?.roles.cache.has(REQUIRED_ROLE_ID);
    const content = msg.content.toLowerCase();

    const badWords = ["nigger","nigga","faggot","retard","kys"];
    const hasBadWord = badWords.some(w => content.includes(w));
    const isLinkAllowed = allowedLinkChannels.has(msg.channel.id);
    const hasLink = !isAdmin && !isLinkAllowed && /(https?:\/\/|discord\.gg|\.com|\.net|\.org)/i.test(content);
    const hasMassMentions = !isAdmin && (msg.mentions.users.size > 5 || msg.mentions.roles.size > 3);

    if (hasBadWord || hasLink || hasMassMentions) {
      try { await msg.delete(); 
        const warn = await msg.channel.send(`${msg.author}, watch out!`);
        setTimeout(() => warn.delete().catch(()=>{}), 5000);
      } catch(err){ console.error(err); }
    }
  });

  if (!pollingStarted) { pollingStarted = true; startPolling(); }
}

// ---------------- EXPRESS SERVER ----------------
const app = express();
const PORT = process.env.PORT || 5000;
app.get("/", (_req, res) => res.send("Bot is running"));

app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  await startBot();
});

process.on("unhandledRejection", r => console.error("❌ Unhandled Rejection:", r));
process.on("uncaughtException", e => console.error("❌ Uncaught Exception:", e));
