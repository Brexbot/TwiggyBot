import type { ArgsOf } from 'discordx'
import { GuardFunction, SimpleCommandMessage } from 'discordx'
import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuInteraction,
  GuildMemberRoleManager,
  Message,
  MessageReaction,
  SelectMenuInteraction,
  VoiceState,
} from 'discord.js'

// From https://discord-ts.js.org/docs/decorators/general/guard/#guard-datas
export const NotBot: GuardFunction<
  | ArgsOf<'messageCreate' | 'messageReactionAdd' | 'voiceStateUpdate'>
  | CommandInteraction
  | ContextMenuInteraction
  | SelectMenuInteraction
  | ButtonInteraction
  | SimpleCommandMessage
> = async (arg, _, next) => {
  const argObj = arg instanceof Array ? arg[0] : arg
  const user =
    argObj instanceof CommandInteraction
      ? argObj.user
      : argObj instanceof MessageReaction
      ? argObj.message.author
      : argObj instanceof VoiceState
      ? argObj.member?.user
      : argObj instanceof Message
      ? argObj.author
      : argObj instanceof SimpleCommandMessage
      ? argObj.message.author
      : argObj instanceof CommandInteraction ||
        argObj instanceof ContextMenuInteraction ||
        argObj instanceof SelectMenuInteraction ||
        argObj instanceof ButtonInteraction
      ? argObj.member?.user
      : argObj?.message?.author
  if (!user?.bot) {
    await next()
  }
}

const superUserIds = [
  '89926310410850304', // BRex
  '117728334854619142', // Zuzuvelas
]

const superUserRoles = [
  '104750975268483072', // Rexcord: Ultimate Scum
  '103679575694774272', // Rexcord: Mods
]

export const IsSuperUser: GuardFunction<
  | ArgsOf<'messageCreate' | 'messageReactionAdd' | 'voiceStateUpdate'>
  | CommandInteraction
  | ContextMenuInteraction
  | SelectMenuInteraction
  | ButtonInteraction
  | SimpleCommandMessage
> = async (arg, _, next) => {
  const argObj = arg instanceof Array ? arg[0] : arg
  const member =
    argObj instanceof CommandInteraction
      ? argObj.member
      : argObj instanceof MessageReaction
      ? argObj.message.member
      : argObj instanceof VoiceState
      ? argObj.member
      : argObj instanceof Message
      ? argObj.member
      : argObj instanceof SimpleCommandMessage
      ? argObj.message.member
      : argObj instanceof CommandInteraction ||
        argObj instanceof ContextMenuInteraction ||
        argObj instanceof SelectMenuInteraction ||
        argObj instanceof ButtonInteraction
      ? argObj.member
      : argObj?.message.member
  if (member) {
    // Super User Id Checks
    if (superUserIds.some((id) => id === member.user.id)) {
      await next()
    } else if (
      // Super User Role Checks
      member.roles instanceof GuildMemberRoleManager &&
      member.roles.cache.some((role) => superUserRoles.some((id) => id === role.id))
    ) {
      await next()
    }
  }
}
