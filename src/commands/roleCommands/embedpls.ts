import { Discord, SimpleCommand, SimpleCommandMessage } from 'discordx'

// Intentionally leaving out the slash command for this as it doesn't really make sense to
// clutter the slash menu with a command that most users will only ever use once

@Discord()
class EmbedPls {
  private roleId = '787815221317992448'

  @SimpleCommand('embedpls')
  simple(command: SimpleCommandMessage) {
    const embedRole = command.message.guild?.roles?.cache?.find((role) => role.id === this.roleId)
    const memberRoles = command.message.member?.roles
    if (embedRole && memberRoles) {
      if (memberRoles.cache.some((role) => role === embedRole)) {
        memberRoles.remove(embedRole).catch(console.error)
      } else {
        memberRoles.add(embedRole).catch(console.error)
      }
    }
  }
}
