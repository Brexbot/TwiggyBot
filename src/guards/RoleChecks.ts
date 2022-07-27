import { ArgsOf, GuardFunction, SimpleCommandMessage } from 'discordx'
import { APIInteractionGuildMember, ApplicationCommandPermissionType } from 'discord-api-types/v10'
import {
  ApplicationCommandPermissions,
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  GuildMember,
  Message,
  MessageReaction,
  SelectMenuInteraction,
  VoiceState,
} from 'discord.js'

export const superUserIds = [
  ...(process.env.DISCORD_SUPER_USER_ID ? [process.env.DISCORD_SUPER_USER_ID] : []), // Local Dev SU Role
  '89926310410850304', // BRex
  '117728334854619142', // Zuzuvelas
].map(
  (id): ApplicationCommandPermissions => ({ id: id, type: ApplicationCommandPermissionType.User, permission: true })
)

export const superUserRoles = [
  ...(process.env.DISCORD_SUPER_USER_ROLE ? [process.env.DISCORD_SUPER_USER_ROLE] : []), // Local Dev SU Role
  '104750975268483072', // Rexcord: Ultimate Scum
  '103679575694774272', // Rexcord: Mods
].map(
  (id): ApplicationCommandPermissions => ({ id: id, type: ApplicationCommandPermissionType.Role, permission: true })
)

export const SuperUsers = superUserIds.concat(superUserRoles)

// From https://discord-ts.js.org/docs/decorators/general/guard/#guard-datas
export const NotBot: GuardFunction<
  | ArgsOf<'messageCreate' | 'messageReactionAdd' | 'voiceStateUpdate'>
  | CommandInteraction
  | ContextMenuCommandInteraction
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
        argObj instanceof ContextMenuCommandInteraction ||
        argObj instanceof SelectMenuInteraction ||
        argObj instanceof ButtonInteraction
      ? argObj.member?.user
      : argObj?.message?.author
  if (!user?.bot) {
    await next()
  }
}

export const IsSuperUser: GuardFunction<
  | ArgsOf<'messageCreate' | 'messageReactionAdd' | 'voiceStateUpdate'>
  | CommandInteraction
  | ContextMenuCommandInteraction
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
        argObj instanceof ContextMenuCommandInteraction ||
        argObj instanceof SelectMenuInteraction ||
        argObj instanceof ButtonInteraction
      ? argObj.member
      : argObj?.message?.member
  if (memberIsSU(member)) {
    await next()
  }
}

export function memberIsSU(member?: GuildMember | APIInteractionGuildMember | null): boolean {
  return SuperUsers.some((permission) => {
    switch (permission.type) {
      case ApplicationCommandPermissionType.Role:
        if (member instanceof GuildMember) {
          return member.roles.cache.has(permission.id)
        } else {
          return member?.roles?.includes(permission.id)
        }
      case ApplicationCommandPermissionType.User:
        if (member instanceof GuildMember) {
          return member.id === permission.id
        } else {
          return member?.user?.id === permission.id
        }
    }
  })
}
