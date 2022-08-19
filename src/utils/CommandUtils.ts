import { ButtonInteraction, CommandInteraction, Guild, GuildMember, User } from 'discord.js'
import { SimpleCommandMessage } from 'discordx'

export function getGuildFromCommand(
  command: CommandInteraction | ButtonInteraction | SimpleCommandMessage
): Guild | null {
  if (command instanceof CommandInteraction || command instanceof ButtonInteraction) {
    return command.guild
  } else {
    return command.message.guild
  }
}

export function getCallerFromCommand(
  command: CommandInteraction | ButtonInteraction | SimpleCommandMessage
): GuildMember | null {
  if (command instanceof CommandInteraction || command instanceof ButtonInteraction) {
    // Do we care if member is of type APIInteractionGuildMember?
    const caller = command.member
    if (caller instanceof GuildMember) {
      return caller
    } else {
      return null
    }
  } else {
    return command.message.member
  }
}

export function getGuildAndCallerFromCommand(
  command: CommandInteraction | ButtonInteraction | SimpleCommandMessage
): [Guild | undefined, GuildMember | undefined] {
  return [getGuildFromCommand(command) ?? undefined, getCallerFromCommand(command) ?? undefined]
}

export function getNicknameFromUser(target: User | GuildMember, guild: Guild): string {
  if (target instanceof GuildMember) {
    return target.nickname ?? target.user.username
  }

  const guildMember = guild.members.cache.get(target.id)
  if (guildMember) {
    return guildMember.nickname ?? guildMember.user.username
  } else {
    // Implies the user has left the server
    return target.username
  }
}

export function isTwitchSub(user: GuildMember, guild: Guild) {
  const PRIVILEGED_ROLES: Record<string, string[]> = {
    '103678524375699456': ['345501570483355648'], // The Banana Hammock ['Banana Hammock']
  }

  try {
    const roles = PRIVILEGED_ROLES[guild.id]
    for (let i = 0; i < roles.length; i++) {
      if (user.roles.cache.has(roles[i])) {
        return true
      }
    }
  } catch (e) {
    console.log(`ERROR: Looking for guild: ${guild.name} [${guild.id}] and did not find list of Twitch sub roles.`)
    return false
  }
  // No guild matched. So we return false.
  return false
}
