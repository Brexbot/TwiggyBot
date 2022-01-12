import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, Slash, SlashOption } from 'discordx'
import { ApplicationCommandOptionChoice, AutocompleteInteraction, CommandInteraction, GuildMemberRoleManager, RoleManager } from 'discord.js'

@Discord()
class Rolesub {
  // todo: Should probably be in some global along with other SU ids
  private modRoleId = '103679575694774272'

  @SimpleCommand('createrole', { argSplitter: '\n' })
  async createRole(
    @SimpleCommandOption('role_name', {
      description: 'The name of the role to be created',
    })
    roleName: string,
    command: SimpleCommandMessage
  ) {
    if (!command.message.member?.roles?.cache.some((role) => role.id === this.modRoleId)) {
      return
    }

    if (!roleName) {
      return command.sendUsageSyntax()
    }

    const modifiedRoleName = `${roleName} [BOT]`
    const guildRoles = command.message.guild?.roles
    if (guildRoles?.cache.some((role) => role.name.toLowerCase() === modifiedRoleName.toLowerCase())) {
      command.message.channel.send(`\`${modifiedRoleName}\` already exists.`)
      return
    }

    guildRoles
      ?.create({
        name: modifiedRoleName,
        permissions: [],
        mentionable: true,
      })
      .then(() => {
        command.message.channel.send(`\`${modifiedRoleName}\` was created. Use \`>rolesub ${roleName}\` to join it.`)
      })
      .catch(console.error)
  }

  @SimpleCommand('delrole', { argSplitter: '\n' })
  async delRole(
    @SimpleCommandOption('role_name', {
      description: 'The name of the role to be created',
    })
    roleName: string,
    command: SimpleCommandMessage
  ) {
    if (!command.message.member?.roles?.cache.some((role) => role.id === this.modRoleId)) {
      return
    }

    if (!roleName) {
      return command.sendUsageSyntax()
    }

    const modifiedRoleName = `${roleName} [BOT]`
    const guildRoles = command.message.guild?.roles
    const roleToBeDeleted = guildRoles?.cache.find((role) => role.name.toLowerCase() === modifiedRoleName.toLowerCase())
    if (!roleToBeDeleted) {
      command.message.channel.send(`Couldn't find the \`${modifiedRoleName}\` role to delete`)
      return
    }

    await guildRoles
      ?.delete(roleToBeDeleted.id)
      .then(() => command.message.channel.send(`\`${modifiedRoleName}\` has been deleted.`))
      .catch(console.error)
  }

  @SimpleCommand('rolesub', { argSplitter: '\n' })
  async simpleRolesub(@SimpleCommandOption('role_name') roleName: string, command: SimpleCommandMessage) {
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

  @Slash('rolesub', { description: 'Add or remove one of the many community roles!' })
  async slashRolesub(
    @SlashOption('role', {
      required: false,
      description: 'Get the role list or select a role to add/remove',
      autocomplete: (interaction: AutocompleteInteraction) => {
        const options =
          interaction.guild?.roles.cache
            .filter((role) => role.name.endsWith('[BOT]'))
            .map((role) => {
              const roleName = role.name.substring(0, role.name.length - 6)
              return <ApplicationCommandOptionChoice>{
                name: roleName,
                value: roleName.toLowerCase(),
              }
            }) ?? []
        options.sort((a, b) => a.name.localeCompare(b.name)).push({ name: 'Role List', value: 'list' })
        interaction.respond(options)
      },
      type: 'STRING',
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
      })
      .catch(console.error)
  }

  private rolesub(roleName: string, guildRoles: RoleManager | undefined, memberRoles: GuildMemberRoleManager | undefined): string {
    if (!roleName) {
      return 'To use this command, get a role from `>rolesub list` and use `>rolesub ROLENAME` to join or leave it. These roles are meant to be quick ways to message everyone in the group when people are planning activities or for setting up channels for certain groups.'
    } else if (roleName.toLowerCase() === 'list') {
      // todo: make this print a little prettier... text embed?
      const roles = guildRoles?.cache
        .filter((role) => role.name.endsWith('[BOT]'))
        .map((role) => role.name)
        .join(', ')

      if (!roles || roles.length < 1) {
        return 'There are no roles on the server.'
      } else {
        return roles
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
