import { ButtonInteraction, CommandInteraction, Guild, GuildMember } from 'discord.js'
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
