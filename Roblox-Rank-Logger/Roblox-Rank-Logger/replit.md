# Roblox Group Rank Logger Discord Bot

## Overview
A Discord bot that monitors Roblox group rank changes and logs them to a Discord channel. Also includes slash commands to promote and demote users directly from Discord.

## Features
- **Rank Change Logging**: Polls Roblox groups every 15 seconds and sends embeds to Discord when rank changes are detected
- **Slash Commands**:
  - `/promote username:xxx group_id:xxx` - Promote a user to the next rank
  - `/demote username:xxx group_id:xxx` - Demote a user to the previous rank
- **Dashboard**: Web interface to manage monitor configurations

## Architecture

### Backend (server/)
- `bot.ts` - Discord bot with slash commands and polling logic
- `roblox.ts` - Roblox API integration (audit logs, rank changes, user lookups)
- `routes.ts` - Express API routes for monitor CRUD
- `storage.ts` - Database storage layer
- `db.ts` - PostgreSQL connection

### Frontend (client/)
- Dashboard to add/remove monitors
- Each monitor tracks one Roblox group → one Discord channel

### Database
- PostgreSQL with `monitors` table:
  - `id`, `name`, `roblox_group_id`, `discord_channel_id`, `last_log_date`, `is_active`

## Required Secrets
- `DISCORD_TOKEN` - Discord bot token from Developer Portal
- `ROBLOX_COOKIE` - .ROBLOSECURITY cookie for a Roblox account with group permissions
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)

## User Preferences
- Dark mode preferred (Discord-themed UI)
- Simple, functional interface

## Recent Changes
- 2026-01-26: Added /promote and /demote slash commands
- 2026-01-26: Improved rank change detection with role name caching
- 2026-01-25: Initial setup with monitoring dashboard
