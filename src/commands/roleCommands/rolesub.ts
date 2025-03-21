import {
  Discord,
  Guard,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
} from 'discordx'
import { ApplicationCommandOptionType, CommandInteraction, GuildMemberRoleManager, RoleManager } from 'discord.js'
import { IsSuperUser } from '../../guards/RoleChecks.js'

@Discord()
class Rolesub {
  @SimpleCommand({ name: 'createrole', argSplitter: '\n' })
  @Guard(IsSuperUser)
  async createRole(
    @SimpleCommandOption({
      name: 'role_name',
      type: SimpleCommandOptionType.String,
      description: 'The name of the role to be created',
    })
    roleName: string,
    command: SimpleCommandMessage
  ) {
    if (!roleName) {
      return command.sendUsageSyntax()
    }

    const channel = command.message.channel
    const modifiedRoleName = `${roleName} [BOT]`
    const guildRoles = command.message.guild?.roles
    if (guildRoles?.cache.some((role) => role.name.toLowerCase() === modifiedRoleName.toLowerCase())) {
      if (channel && channel.isSendable()) {
        channel.send(`\`${modifiedRoleName}\` already exists.`)
      }
      return
    }

    guildRoles
      ?.create({
        name: modifiedRoleName,
        permissions: [],
        mentionable: true,
      })
      .then(() => {
        if (channel && channel.isSendable()) {
          channel.send(`\`${modifiedRoleName}\` was created. Use \`>rolesub ${roleName}\` to join it.`)
        }
      })
      .catch(console.error)
  }

  @SimpleCommand({ name: 'delrole', argSplitter: '\n' })
  @Guard(IsSuperUser)
  async delRole(
    @SimpleCommandOption({
      name: 'role_name',
      description: 'The name of the role to be created',
      type: SimpleCommandOptionType.String,
    })
    roleName: string,
    command: SimpleCommandMessage
  ) {
    if (!roleName) {
      return command.sendUsageSyntax()
    }

    const channel = command.message.channel
    const modifiedRoleName = `${roleName} [BOT]`
    const guildRoles = command.message.guild?.roles
    const roleToBeDeleted = guildRoles?.cache.find((role) => role.name.toLowerCase() === modifiedRoleName.toLowerCase())
    if (!roleToBeDeleted) {
      const channel = command.message.channel
      if (channel && channel.isSendable()) {
        channel.send(`Couldn't find the \`${modifiedRoleName}\` role to delete`)
      }
      return
    }

    await guildRoles
      ?.delete(roleToBeDeleted.id)
      .then(async () => {
        if (channel && channel.isSendable()) {
          channel.send(`\`${modifiedRoleName}\` has been deleted.`)
        }
      })
      .catch(console.error)
  }

  @SimpleCommand({ name: 'rolesub', argSplitter: '\n' })
  async simpleRolesub(
    @SimpleCommandOption({
      name: 'role_name',
      description: 'Name of the rule to acquire',
      type: SimpleCommandOptionType.String,
    })
    roleName: string,
    command: SimpleCommandMessage
  ) {
    const msg = this.rolesub(roleName, command.message.guild?.roles, command.message.member?.roles)
    await command.message
      .reply({
        content: msg,
        allowedMentions: {
          repliedUser: false,
        },
      })
      .catch(console.error)
  }

  @Slash({ name: 'rolesub', description: 'Add or remove one of the many community roles!' })
  async slashRolesub(
    @SlashOption({
      name: 'role',
      required: false,
      description: 'Get the role list or select a role to add/remove',
      type: ApplicationCommandOptionType.String,
    })
    roleName: string,
    interaction: CommandInteraction
  ) {
    const memberRoles = interaction.member?.roles
    if (memberRoles instanceof Array) {
      return
    }

    const msg = this.rolesub(roleName, interaction.guild?.roles, memberRoles)
    await interaction
      .reply({
        content: msg,
        allowedMentions: {
          repliedUser: false,
        },
        ephemeral: true,
      })
      .catch(console.error)
  }

  private rolesub(
    roleName: string,
    guildRoles: RoleManager | undefined,
    memberRoles: GuildMemberRoleManager | undefined
  ): string {
    if (!roleName) {
      return 'To use this command, get a role from `>rolesub list` and use `>rolesub ROLENAME` to join or leave it. These roles are meant to be quick ways to message everyone in the group when people are planning activities or for setting up channels for certain groups.'
    } else if (roleName.toLowerCase() === 'list') {
      const roles = guildRoles?.cache
        .filter((role) => role.name.endsWith('[BOT]'))
        .map((role) => role.name.replace(' [BOT]', ''))

      if (!roles || roles.length < 1) {
        return 'There are no roles on the server.'
      } else {
        roles.sort()
        return `**Roles:** ${roles.join(', ')}`
      }
    }

    const modifiedRoleName = `${roleName} [BOT]`
    const whichRole = guildRoles?.cache.find((role) => role.name.toLowerCase() === modifiedRoleName.toLowerCase())
    if (whichRole) {
      if (memberRoles?.cache.some((role) => role.id === whichRole.id)) {
        memberRoles?.remove(whichRole).catch(console.error)
        return `${whichRole.name} has been removed.`
      } else {
        memberRoles?.add(whichRole).catch(console.error)
        return `${whichRole.name} has been added.`
      }
    } else {
      return 'That role does not exist on the server.'
    }
  }
}
