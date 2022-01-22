import { ArgsOf, Permission } from 'discordx'
import { GuardFunction, SimpleCommandMessage } from 'discordx'
import {
  ApplicationCommandPermissions,
  ButtonInteraction,
  CommandInteraction,
  ContextMenuInteraction,
  Message,
  MessageReaction,
  SelectMenuInteraction,
  VoiceState,
} from 'discord.js'

export const superUserIds = [
  ...(process.env.DISCORD_SUPER_USER_ID ? [process.env.DISCORD_SUPER_USER_ID] : []), // Local Dev SU Role
  '89926310410850304', // BRex
  '117728334854619142', // Zuzuvelas
].map((id): ApplicationCommandPermissions => ({ id: id, type: 'USER', permission: true }))

export const superUserRoles = [
  ...(process.env.DISCORD_SUPER_USER_ROLE ? [process.env.DISCORD_SUPER_USER_ROLE] : []), // Local Dev SU Role
  '104750975268483072', // Rexcord: Ultimate Scum
  '103679575694774272', // Rexcord: Mods
].map((id): ApplicationCommandPermissions => ({ id: id, type: 'ROLE', permission: true }))

export const SuperUsers = superUserIds.concat(superUserRoles)

export const PermissionSuperUserOnly = () => {
  return PermissionFactory(SuperUsers)
}

const PermissionFactory = (perm: ApplicationCommandPermissions | ApplicationCommandPermissions[]) => {
  // Seems like this has to be `any` sadly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: Record<string, any>, propertyKey: string, descriptor: PropertyDescriptor): void => {
    Permission(false)(target, propertyKey, descriptor)
    Permission(perm)(target, propertyKey, descriptor)
  }
}

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
