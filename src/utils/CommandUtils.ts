import {
  ButtonInteraction,
  CommandInteraction,
  Guild,
  GuildMember,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  User,
} from 'discord.js'
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

export function ephemeralReply(
  interaction: CommandInteraction,
  options: InteractionReplyOptions
): Promise<InteractionResponse<boolean>> {
  return interaction.reply({
    ephemeral: true,
    allowedMentions: { repliedUser: false },
    ...options,
  })
}

export function ephemeralButtonFollowup(
  interaction: ButtonInteraction,
  options: InteractionReplyOptions
): Promise<Message<boolean>> {
  return interaction.followUp({
    ephemeral: true,
    allowedMentions: { repliedUser: false },
    ...options,
  })
}
