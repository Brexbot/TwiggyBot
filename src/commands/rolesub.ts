import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption } from 'discordx'

@Discord()
class Rolesub {
  // Mod role id 103679575694774272
  private modRoleId = '754737174162702448'

  @SimpleCommand('createrole')
  async createRole(@SimpleCommandOption('role_name', { type: 'STRING' }) roleName: string | undefined, command: SimpleCommandMessage) {
    if (!command.message.member?.roles?.cache.some((role) => role.id === this.modRoleId)) {
      return
    }

    if (!roleName) {
      return command.sendUsageSyntax()
    }

    const modifiedRoleName = `${roleName} [BOT]`
    const guildRoles = command.message.guild?.roles
    if (!guildRoles || guildRoles.cache.some((role) => role.name === modifiedRoleName)) {
      command.message.channel.send(`\`${modifiedRoleName}\` already exists.`)
      return
    }

    guildRoles
      .create({
        name: modifiedRoleName,
        mentionable: true,
      })
      .then(() => command.message.channel.send(`\`${modifiedRoleName}\` was created. Use \`>rolesub ${roleName}\` to join it.`))
      .catch(console.error)
  }

  @SimpleCommand('delrole')
  async delRole(@SimpleCommandOption('role_name', { type: 'STRING' }) roleName: string | undefined, command: SimpleCommandMessage) {
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
}
