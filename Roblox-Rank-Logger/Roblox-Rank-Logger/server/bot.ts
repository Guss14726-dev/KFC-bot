import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction
} from "discord.js";

import { storage } from "./storage";
import {
  fetchGroupRankChanges,
  getUserInfo,
  getGroupRoles,
  getUserIdFromUsername,
  setUserRankByName,
  Role
} from "./roblox";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

let isBotRunning = false;
let pollingStarted = false;

const allowedLinkChannels = new Set<string>();
const groupRolesCache: Record<string, Role[]> = {};
const userCache = new Map<number, string>();

let modmailChannelId: string | null = null;
const modmailThreads = new Map<string, string>();

const WELCOME_CHANNEL_ID = "1464730736144683201";

// ===================== UTILS =====================

function getRoleName(groupId: string, roleId?: number): string {
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
  } catch {
    return "Unknown";
  }
}

async function getConfiguredGroupId(): Promise<string | null> {
  const monitors = await storage.getMonitors();
  const activeMonitor = monitors.find(m => m.isActive);
  return activeMonitor?.robloxGroupId || null;
}

// ===================== ROLE LOCK =====================

async function checkRolePermission(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const member = interaction.member;
  if (!member) {
    await interaction.reply({ content: "❌ Could not verify permissions.", ephemeral: true });
    return false;
  }

  const config = await storage.getBotConfig();
  const roleId = config.requiredRoleId;

  if (!roleId) return true;

  const roles = member.roles;
  const hasRole = Array.isArray(roles)
    ? roles.includes(roleId)
    : roles.cache.has(roleId);

  if (!hasRole) {
    await interaction.reply({ content: "❌ You are not allowed to use this command.", ephemeral: true });
    return false;
  }

  return true;
}

// ===================== SLASH COMMANDS =====================

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
    .setName("configuration")
    .setDescription("View or update bot configuration (use with no options to view)")
    .addStringOption(opt =>
      opt.setName("status").setDescription("Set bot status")
        .addChoices(
          { name: "online", value: "online" },
          { name: "idle", value: "idle" },
          { name: "dnd", value: "dnd" },
          { name: "invisible", value: "invisible" }
        )
    )
    .addStringOption(opt => opt.setName("role").setDescription("Set required Discord role ID"))
    .addStringOption(opt => opt.setName("rankname").setDescription("Rank name to map"))
    .addIntegerOption(opt => opt.setName("rankid").setDescription("Rank ID to map")),

  new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Send a DM to a user")
    .addUserOption(opt => opt.setName("user").setDescription("User to DM").setRequired(true))
    .addStringOption(opt => opt.setName("message").setDescription("Message").setRequired(true)),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a message to a channel")
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true))
    .addStringOption(opt => opt.setName("message").setDescription("Message").setRequired(true)),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute a user")
    .addUserOption(opt => opt.setName("user").setDescription("User to mute").setRequired(true))
    .addIntegerOption(opt => opt.setName("duration").setDescription("Duration in minutes").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("Reason").setRequired(false)),

  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute a user")
    .addUserOption(opt => opt.setName("user").setDescription("User to unmute").setRequired(true)),

  new SlashCommandBuilder()
    .setName("let_links")
    .setDescription("Allow links in a channel")
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),

  new SlashCommandBuilder()
    .setName("block_links")
    .setDescription("Block links in a channel")
    .addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),

  new SlashCommandBuilder()
    .setName("test_welcome")
    .setDescription("Test the welcome message"),

  new SlashCommandBuilder()
    .setName("setmodmail")
    .setDescription("Set the modmail channel")
    .addChannelOption(opt => opt.setName("channel").setDescription("Modmail channel").setRequired(true)),

  new SlashCommandBuilder()
    .setName("reply")
    .setDescription("Reply to a modmail")
    .addStringOption(opt => opt.setName("userid").setDescription("User ID to reply to").setRequired(true))
    .addStringOption(opt => opt.setName("message").setDescription("Message to send").setRequired(true)),
];

async function registerSlashCommands() {
  const token = process.env.DISCORD_TOKEN;
  if (!token || !client.user) return;

  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands.map(cmd => cmd.toJSON()) }
  );
  console.log("✅ Slash commands registered");
}

// ===================== HANDLERS =====================

async function handleConfiguration(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;

  const config = await storage.getBotConfig();
  const status = interaction.options.getString("status");
  const role = interaction.options.getString("role");
  const rankName = interaction.options.getString("rankname");
  const rankId = interaction.options.getInteger("rankid");

  const changes: string[] = [];

  if (status) {
    await storage.updateBotConfig({ status: status as any });
    client.user?.setStatus(status as any);
    changes.push(`Status → **${status}**`);
  }

  if (role) {
    await storage.updateBotConfig({ requiredRoleId: role });
    changes.push(`Required Role → **${role}**`);
  }

  if (rankName && rankId) {
    const newMap = { ...(config.rankMap as any), [rankName.toLowerCase()]: rankId };
    await storage.updateBotConfig({ rankMap: newMap });
    changes.push(`Rank Mapping → **${rankName.toLowerCase()} = ${rankId}**`);
  } else if (rankName || rankId) {
    await interaction.reply({ content: "❌ Both rankname and rankid are required to add a rank mapping.", ephemeral: true });
    return;
  }

  if (changes.length > 0) {
    await interaction.reply({ content: `✅ Configuration updated:\n${changes.join("\n")}`, ephemeral: true });
    return;
  }

  const updatedConfig = await storage.getBotConfig();
  const embed = new EmbedBuilder()
    .setTitle("⚙️ Bot Configuration")
    .setColor(0x5865F2)
    .addFields(
      { name: "Status", value: updatedConfig.status, inline: true },
      { name: "Required Role ID", value: updatedConfig.requiredRoleId || "None", inline: true },
      { name: "Rank Map", value: Object.keys(updatedConfig.rankMap).length ? Object.entries(updatedConfig.rankMap).map(([k, v]) => `${k} → ${v}`).join("\n") : "None" }
    );
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRankChange(interaction: ChatInputCommandInteraction, isPromotion: boolean) {
  if (!await checkRolePermission(interaction)) return;

  const username = interaction.options.getString("username", true);
  const rankName = interaction.options.getString("rank", true);
  const cookie = process.env.ROBLOX_COOKIE;

  if (!cookie) {
    await interaction.reply({ content: "❌ ROBLOX_COOKIE not set.", ephemeral: true });
    return;
  }

  const groupId = await getConfiguredGroupId();
  if (!groupId) {
    await interaction.reply({ content: "❌ No group configured.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const userId = await getUserIdFromUsername(username);
  if (!userId) {
    await interaction.editReply(`❌ Roblox user not found: ${username}`);
    return;
  }

  const result = await setUserRankByName(groupId, userId, rankName, cookie);

  if (result.success) {
    const embed = new EmbedBuilder()
      .setTitle(isPromotion ? "✅ User Promoted" : "⬇️ User Demoted")
      .setColor(isPromotion ? 0x00ff00 : 0xff6600)
      .addFields(
        { name: "User", value: username, inline: true },
        { name: "Changed By", value: interaction.user.username, inline: true },
        { name: "Change", value: `${result.oldRole} → ${result.newRole}`, inline: false }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } else {
    await interaction.editReply(`❌ Failed: ${result.error}`);
  }
}

async function handleDM(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;

  const user = interaction.options.getUser("user", true);
  const message = interaction.options.getString("message", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    await user.send(message);
    await interaction.editReply(`✅ Message sent to ${user.username}`);
  } catch {
    await interaction.editReply(`❌ Could not DM ${user.username}`);
  }
}

async function handleSay(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;

  const channel = interaction.options.getChannel("channel", true);
  const message = interaction.options.getString("message", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const textChannel = await client.channels.fetch(channel.id);
    if (!textChannel || !textChannel.isTextBased()) {
      await interaction.editReply("❌ Invalid channel.");
      return;
    }
    await textChannel.send(message);
    await interaction.editReply(`✅ Message sent to <#${channel.id}>`);
  } catch {
    await interaction.editReply("❌ Failed to send message.");
  }
}

async function handleMute(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;

  const user = interaction.options.getUser("user", true);
  const duration = interaction.options.getInteger("duration", true);
  const reason = interaction.options.getString("reason") || "No reason";

  await interaction.deferReply();

  try {
    const member = await interaction.guild?.members.fetch(user.id);
    if (!member) {
      await interaction.editReply("❌ Member not found.");
      return;
    }

    await member.timeout(duration * 60 * 1000, reason);

    const embed = new EmbedBuilder()
      .setTitle("🔇 User Muted")
      .setColor(0xFF0000)
      .addFields(
        { name: "User", value: user.username, inline: true },
        { name: "Duration", value: `${duration} min`, inline: true },
        { name: "By", value: interaction.user.username, inline: true },
        { name: "Reason", value: reason }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply("❌ Failed to mute user.");
  }
}

async function handleUnmute(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;

  const user = interaction.options.getUser("user", true);

  await interaction.deferReply();

  try {
    const member = await interaction.guild?.members.fetch(user.id);
    if (!member) {
      await interaction.editReply("❌ Member not found.");
      return;
    }
    await member.timeout(null);
    await interaction.editReply(`✅ **${user.username}** unmuted.`);
  } catch {
    await interaction.editReply("❌ Failed to unmute user.");
  }
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

  try {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      await interaction.editReply("❌ Welcome channel not found.");
      return;
    }
    await channel.send(`Welcome ${interaction.user} to **KFC | RBLX** make sure to explore the server!`);
    await interaction.editReply("✅ Test welcome sent!");
  } catch {
    await interaction.editReply("❌ Failed to send welcome.");
  }
}

async function handleSetModmail(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;

  const channel = interaction.options.getChannel("channel", true);
  modmailChannelId = channel.id;
  await interaction.reply({ content: `✅ Modmail channel set to <#${channel.id}>`, ephemeral: true });
}

async function handleReply(interaction: ChatInputCommandInteraction) {
  if (!await checkRolePermission(interaction)) return;

  const userId = interaction.options.getString("userid", true);
  const message = interaction.options.getString("message", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const user = await client.users.fetch(userId);
    if (!user) {
      await interaction.editReply("❌ User not found.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📬 Staff Reply")
      .setColor(0x5865F2)
      .setDescription(message)
      .setFooter({ text: `From: ${interaction.user.username}` })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    await interaction.editReply(`✅ Reply sent to ${user.username}`);
  } catch {
    await interaction.editReply("❌ Could not send reply. User may have DMs disabled.");
  }
}

// ===================== BOT START =====================

export async function startDiscordBot() {
  if (isBotRunning) return;

  const token = process.env.DISCORD_TOKEN;
  if (!token) return;

  await client.login(token);
  await new Promise<void>(resolve => {
    if (client.isReady()) return resolve();
    client.once("ready", () => resolve());
  });

  console.log(`✅ Logged in as ${client.user?.tag}`);
  isBotRunning = true;

  const config = await storage.getBotConfig();
  client.user?.setStatus(config.status);

  await registerSlashCommands();

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = interaction.commandName;
    if (cmd === "promote") await handleRankChange(interaction, true);
    else if (cmd === "demote") await handleRankChange(interaction, false);
    else if (cmd === "configuration") await handleConfiguration(interaction);
    else if (cmd === "dm") await handleDM(interaction);
    else if (cmd === "say") await handleSay(interaction);
    else if (cmd === "mute") await handleMute(interaction);
    else if (cmd === "unmute") await handleUnmute(interaction);
    else if (cmd === "let_links") await handleLetLinks(interaction);
    else if (cmd === "block_links") await handleBlockLinks(interaction);
    else if (cmd === "test_welcome") await handleTestWelcome(interaction);
    else if (cmd === "setmodmail") await handleSetModmail(interaction);
    else if (cmd === "reply") await handleReply(interaction);
  });

  // Welcome new members
  client.on("guildMemberAdd", async (member) => {
    try {
      const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        await channel.send(`Welcome ${member} to **KFC | RBLX** make sure to explore the server!`);
      }
    } catch {}
  });

  // Modmail - handle DMs
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (!message.guild && modmailChannelId) {
      try {
        const modChannel = await client.channels.fetch(modmailChannelId);
        if (modChannel && modChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle("📩 New Modmail")
            .setColor(0x00BFFF)
            .setDescription(message.content || "*No text content*")
            .addFields(
              { name: "From", value: `${message.author.username} (${message.author.id})`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter({ text: `Reply with /reply ${message.author.id} <message>` })
            .setTimestamp();

          await modChannel.send({ embeds: [embed] });

          await message.reply("Your message has been sent to the staff team. They will respond soon.");
        }
      } catch {}
      return;
    }
  });

  // Automod
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    const member = message.member;
    const config = await storage.getBotConfig();
    const isAdmin = member && config.requiredRoleId && member.roles.cache.has(config.requiredRoleId);
    const content = message.content.toLowerCase();

    const badWords = ["nigger", "nigga", "faggot", "retard", "kys"];
    const hasBadWord = badWords.some(word => content.includes(word));

    const isLinkAllowed = allowedLinkChannels.has(message.channel.id);
    const hasLink = !isAdmin && !isLinkAllowed && /(https?:\/\/|discord\.gg|\.com|\.net|\.org)/i.test(content);

    const hasMassMentions = !isAdmin && (message.mentions.users.size > 5 || message.mentions.roles.size > 3);

    if (hasBadWord) {
      try {
        await message.delete();
        const warn = await message.channel.send(`${message.author}, watch your language!`);
        setTimeout(() => warn.delete().catch(() => {}), 5000);
      } catch {}
    } else if (hasLink) {
      try {
        await message.delete();
        const warn = await message.channel.send(`${message.author}, links are not allowed!`);
        setTimeout(() => warn.delete().catch(() => {}), 5000);
      } catch {}
    } else if (hasMassMentions) {
      try {
        await message.delete();
        const warn = await message.channel.send(`${message.author}, mass mentions are not allowed!`);
        setTimeout(() => warn.delete().catch(() => {}), 5000);
      } catch {}
    }
  });

  if (!pollingStarted) {
    pollingStarted = true;
    startPolling();
  }
}

// ===================== POLLING =====================

async function startPolling() {
  while (true) {
    try { await pollOnce(); } catch {}
    await sleep(15000);
  }
}

async function pollOnce() {
  const monitors = await storage.getMonitors();
  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie) return;

  for (const monitor of monitors) {
    if (!monitor.isActive) continue;
    await processMonitor(monitor, cookie);
  }
}

async function processMonitor(monitor: any, cookie: string) {
  try {
    const logs = await fetchGroupRankChanges(monitor.robloxGroupId, cookie);
    logs.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

    const lastDate = monitor.lastLogDate ? new Date(monitor.lastLogDate) : new Date(0);
    const newLogs = logs.filter(log => new Date(log.created) > lastDate);

    if (newLogs.length === 0) return;

    const newest = new Date(newLogs[newLogs.length - 1].created);

    for (const log of newLogs) {
      await sendLogToDiscord(monitor.discordChannelId, log, monitor.robloxGroupId);
    }

    await storage.updateMonitorLastLog(monitor.id, newest);
  } catch {}
}

async function sendLogToDiscord(channelId: string, log: any, groupId: string) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return;

    if (!groupRolesCache[groupId]) {
      groupRolesCache[groupId] = await getGroupRoles(groupId);
    }

    const actorName = log.actor?.user?.name || "Unknown";
    const targetName = await getUsernameFast(log.description?.TargetId, log.description?.TargetName);
    const oldRole = getRoleName(groupId, log.description?.OldRoleSetId);
    const newRole = getRoleName(groupId, log.description?.NewRoleSetId);

    const embed = new EmbedBuilder()
      .setTitle("🔥 Rank Change Detected")
      .setColor(0xffa500)
      .addFields(
        { name: "Actor", value: actorName, inline: true },
        { name: "Target", value: targetName, inline: true },
        { name: "Change", value: `${oldRole} → ${newRole}`, inline: false }
      )
      .setTimestamp(new Date(log.created));

    await channel.send({ embeds: [embed] });
  } catch {}
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendTestMessage(channelId: string, message: string) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return;
    await channel.send(message);
  } catch {}
}
