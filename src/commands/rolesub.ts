import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption } from 'discordx'

@Discord()
class Rolesub {
  // Mod role id 103679575694774272
  private modRoleId = '754737174162702448'

  @SimpleCommand('createrole')
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
    if (guildRoles?.cache.some((role) => role.name === modifiedRoleName)) {
      command.message.channel.send(`\`${modifiedRoleName}\` already exists.`)
      return
    }

    guildRoles
      ?.create({
        name: modifiedRoleName,
        mentionable: true,
      })
      .then(() => {
        command.message.channel.send(`\`${modifiedRoleName}\` was created. Use \`>rolesub ${roleName}\` to join it.`)
      })
      .catch(console.error)
  }

  @SimpleCommand('delrole')
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
    const roleToBeDeleted = guildRoles?.cache.find((role) => role.name === modifiedRoleName)
    if (!roleToBeDeleted) {
      command.message.channel.send(`Couldn't find a \`${modifiedRoleName}\` role to delete`)
      return
    }

    await guildRoles
      ?.delete(roleToBeDeleted.id)
      .then(() => command.message.channel.send(`\`${modifiedRoleName}\` has been deleted.`))
      .catch(console.error)
  }

  @SimpleCommand('rolesub')
  async rolesub(@SimpleCommandOption('role_name') roleName: string, command: SimpleCommandMessage) {
    const guildRoles = command.message.guild?.roles
    if (!roleName) {
      command.message.channel.send(
        'To use this command, get a role from `>rolesub list` and use `>rolesub ROLENAME` to join or leave it. These roles are meant to be quick ways to message everyone in the group when people are planning activities or for setting up channels for certain groups.'
      )
      return
    } else if (roleName === 'list') {
      // todo: make this print a little prettier... text embed?
      const roles = guildRoles?.cache
        .filter((role) => role.name.endsWith('[BOT]'))
        .map((role) => role.name)
        .join(', ')

      if (!roles || roles.length < 1) {
        command.message.channel.send('There are no roles on the server.')
      } else {
        command.message.channel.send(roles)
      }

      return
    }

    const modifiedRoleName = `${roleName} [BOT]`
    const whichRole = guildRoles?.cache.find((role) => role.name === modifiedRoleName)
    if (whichRole) {
      const memberRoles = command.message.member?.roles
      if (memberRoles?.cache.some((role) => role.id === whichRole.id)) {
        await memberRoles
          ?.remove(whichRole)
          .then(() =>
            command.message.reply({
              content: `${modifiedRoleName} has been removed.`,
              allowedMentions: {
                repliedUser: false,
              },
            })
          )
          .catch(console.error)
      } else {
        await memberRoles
          ?.add(whichRole)
          .then(() =>
            command.message.reply({
              content: `${modifiedRoleName} has been added.`,
              allowedMentions: {
                repliedUser: false,
              },
            })
          )
          .catch(console.error)
      }
    } else {
      command.message.channel.send('That role does not exist on the server.')
    }
  }
}
