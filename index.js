// ============================================================
//  DISCORD BOT - FULL FEATURED - index.js (Railway Optimized)
// ============================================================

'use strict';

// ── Core Node Modules ────────────────────────────────────────
const fs   = require('fs');
const path = require('path');

// ── Railway Server Keeper (Express Web Server) ────────────────
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('البوت يعمل بنجاح ومستيقظ 24/7!');
});

app.listen(PORT, () => {
  console.log(`📡 تم فتح المنفذ الوهمي على port ${PORT}`);
});

// ── Discord.js ───────────────────────────────────────────────
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
  SlashCommandBuilder,
  REST,
  Routes,
  ActivityType,
  Colors,
  AuditLogEvent,
  InteractionType,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  UserSelectMenuBuilder,
  AttachmentBuilder,
  time,
  TimestampStyles,
  bold,
  italic,
  underline,
  strikethrough,
  spoiler,
  inlineCode,
  codeBlock,
  hyperlink,
  hideLinkEmbed,
  quote,
  blockQuote,
  roleMention,
  channelMention,
  userMention,
  heading,
  HeadingLevel,
  orderedList,
  unorderedList,
  formatEmoji,
  messageLink,
} = require('discord.js');

// ── Environment Variables ────────────────────────────────────
require('dotenv').config();

const TOKEN    = process.env.TOKEN    || 'YOUR_BOT_TOKEN_HERE';
const PREFIX   = process.env.PREFIX   || '!';
const OWNER_ID = process.env.OWNER_ID || '000000000000000000';

// ── In-Memory Databases ──────────────────────────────────────
const db = {
  economy: new Map(),
  levels: new Map(),
  warnings: new Map(),
  mutes: new Map(),
  guilds: new Map(),
  tickets: new Map(),
  giveaways: new Map(),
  reminders: new Map(),
  polls: new Map(),
  tags: new Map(),
  stars: new Map(),
  reactionRoles: new Map(),
  afk: new Map(),
  reputation: new Map(),
  marriages: new Map(),
  pets: new Map(),
  notes: new Map(),
  blacklist: new Map(),
  commandStats: new Map(),
  guildBans: new Map(),
  tempChannels: new Map(),
  suggestionChannels: new Map(),
  suggestions: new Map(),
  confessChannels: new Map(),
  snipe: new Map(),
  editSnipe: new Map(),
  autoroles: new Map(),
  stickyMessages: new Map(),
  countdowns: new Map(),
  statistics: new Map(),
};

// ── Helper Functions ─────────────────────────────────────────
function getGuildConfig(guildId) {
  if (!db.guilds.has(guildId)) {
    db.guilds.set(guildId, {
      prefix: PREFIX,
      welcomeChannel: null,
      goodbyeChannel:  null,
      logsChannel:     null,
      modLogsChannel:  null,
      ticketCategory:  null,
      ticketLogsChannel: null,
      starboardChannel: null,
      starboardMin:    3,
      suggestionChannel: null,
      confessChannel:  null,
      muteRole:        null,
      automod: {
        enabled:       false,
        antiSpam:      false,
        antiLinks:     false,
        antiCaps:      false,
        antiProfanity: false,
        maxMentions:   5,
        maxLines:      10,
        profanityList: [],
        whitelist:     [],
      },
      joinableRoles:  [],
      autoroles:      [],
      levelRewards:   {},
      levelMessages:  true,
      economyEnabled: true,
      musicVolume:    100,
      djRole:        null,
      statsChannels: { total: null, members: null, bots: null, online: null },
    });
  }
  return db.guilds.get(guildId);
}

function getEconomy(userId) {
  if (!db.economy.has(userId)) {
    db.economy.set(userId, { balance: 0, bank: 0, lastDaily: null, lastWork: null, lastRob: null, inventory: [], transactions: [] });
  }
  return db.economy.get(userId);
}

function getLevelEntry(guildId, userId) {
  const key = `${guildId}_${userId}`;
  if (!db.levels.has(key)) {
    db.levels.set(key, { xp: 0, level: 0, messages: 0 });
  }
  return db.levels.get(key);
}

function calcLevel(xp) { return Math.floor(Math.sqrt(xp / 100)); }
function xpForLevel(level) { return level * level * 100; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function formatNumber(n) { return n.toLocaleString('en-US'); }

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function parseDuration(str) {
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let ms = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const val  = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'd') ms += val * 86400000;
    if (unit === 'h') ms += val * 3600000;
    if (unit === 'm') ms += val * 60000;
    if (unit === 's') ms += val * 1000;
  }
  return ms;
}

function genId() { return Math.random().toString(36).slice(2, 10).toUpperCase(); }
async function safeDelete(message, delay = 0) { if (delay > 0) await new Promise(r => setTimeout(r, delay)); try { await message.delete(); } catch (_) {} }
async function sendLog(guild, embed) {
  const config = getGuildConfig(guild.id);
  const channelId = config.modLogsChannel || config.logsChannel;
  if (!channelId) return;
  try {
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (ch) await ch.send({ embeds: [embed] });
  } catch (_) {}
}

// ── Embed Builders ───────────────────────────────────────────
function successEmbed(title, description) { return new EmbedBuilder().setTitle(`✅  ${title}`).setDescription(description).setColor(Colors.Green).setTimestamp(); }
function errorEmbed(title, description) { return new EmbedBuilder().setTitle(`❌  ${title}`).setDescription(description).setColor(Colors.Red).setTimestamp(); }
function infoEmbed(title, description) { return new EmbedBuilder().setTitle(`ℹ️  ${title}`).setDescription(description).setColor(Colors.Blue).setTimestamp(); }
function warnEmbed(title, description) { return new EmbedBuilder().setTitle(`⚠️  ${title}`).setDescription(description).setColor(Colors.Yellow).setTimestamp(); }
function modEmbed(action, target, moderator, reason, extra = {}) {
  const embed = new EmbedBuilder()
    .setTitle(`🔨 Moderation | ${action}`)
    .addFields(
      { name: 'User',        value: `${target.tag || target.user?.tag} (${target.id})`,      inline: true },
      { name: 'Moderator',   value: `${moderator.tag || moderator.user?.tag} (${moderator.id})`, inline: true },
      { name: 'Reason',      value: reason || 'No reason provided', inline: false }
    )
    .setColor(Colors.Orange).setTimestamp();
  for (const [k, v] of Object.entries(extra)) { embed.addFields({ name: k, value: String(v), inline: true }); }
  return embed;
}

// ── Client Setup ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember, Partials.GuildScheduledEvent, Partials.ThreadMember],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
});

client.commands = new Collection();
client.aliases  = new Collection();
// ── Command Handlers & Objects ───────────────────────────────
const commandsList = [
  {
    name: 'kick',
    async execute(message, args) {
      const member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      if (!member) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please mention a valid member.')] });
      if (!member.kickable) return message.reply({ embeds: [errorEmbed('Cannot Kick', 'I cannot kick this member.')] });
      const reason = args.slice(1).join(' ') || 'No reason provided';
      await member.send({ embeds: [warnEmbed('Kicked', `You have been kicked from **${message.guild.name}**.\n**Reason:** ${reason}`)] }).catch(() => {});
      await member.kick(reason);
      message.reply({ embeds: [successEmbed('Member Kicked', `**${member.user.tag}** has been kicked.`)] });
      await sendLog(message.guild, modEmbed('Kick', member.user, message.member, reason));
    }
  },
  {
    name: 'ban',
    async execute(message, args) {
      const target = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      if (!target) return message.reply({ embeds: [errorEmbed('Invalid User', 'Please provide a valid user ID or mention.')] });
      const reason = args.slice(1).join(' ') || 'No reason provided';
      await target.send({ embeds: [warnEmbed('Banned', `You have been banned from **${message.guild.name}**.\n**Reason:** ${reason}`)] }).catch(() => {});
      await message.guild.members.ban(target.id, { reason });
      message.reply({ embeds: [successEmbed('Member Banned', `**${target.tag}** has been banned.`)] });
      await sendLog(message.guild, modEmbed('Ban', target, message.member, reason));
    }
  },
  {
    name: 'purge',
    async execute(message, args) {
      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount < 1 || amount > 100) return message.reply({ embeds: [errorEmbed('Invalid Amount', 'Provide a number between 1 and 100.')] });
      await message.delete().catch(() => {});
      let messages = await message.channel.messages.fetch({ limit: amount });
      const deleted = await message.channel.bulkDelete(messages, true).catch(() => null);
      if (!deleted) return;
      const reply = await message.channel.send({ embeds: [successEmbed('Messages Purged', `Successfully deleted **${deleted.size}** messages.`)] });
      safeDelete(reply, 5000);
    }
  }
];

// تسجيل الأوامر في الكوليكشن
commandsList.forEach(cmd => client.commands.set(cmd.name, cmd));

// ── Event Listener: Message Create ───────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  // تم إصلاح كود الـ split هنا ليعمل بنجاح دون أخطاء الـ Regex
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('حدث خطأ أثناء تنفيذ هذا الأمر.');
  }
});

client.once('ready', () => {
  console.log(`🤖 تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
});

// تسجيل الدخول بالتوكن السليم المتوافق مع المتغيرات
client.login(TOKEN);
