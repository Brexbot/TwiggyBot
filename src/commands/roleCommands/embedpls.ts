import { Discord, SimpleCommand, SimpleCommandMessage } from 'discordx'
import { GuildMemberRoleManager } from 'discord.js'
import { memberIsSU } from '../../guards/RoleChecks'

// Intentionally leaving out the slash command for this as it doesn't really make sense to
// clutter the slash menu with a command that most users will only ever use once

@Discord()
class EmbedPls {
  private roleId = '787815221317992448'

  @SimpleCommand('embedpls')
  simple(command: SimpleCommandMessage) {
    const mentions = command.message.mentions
    const embedRole = command.message.guild?.roles?.cache?.find((role) => role.id === this.roleId)

    let memberRoles: GuildMemberRoleManager | undefined
    if ((mentions.members?.size ?? 0) > 0 && memberIsSU(command.message.member)) {
      memberRoles = mentions.members?.first()?.roles
    } else {
      memberRoles = command.message.member?.roles
    }

    if (embedRole && memberRoles) {
      if (memberRoles.cache.some((role) => role === embedRole)) {
        memberRoles.remove(embedRole).catch(console.error)
      } else {
        memberRoles.add(embedRole).catch(console.error)
      }
    }
  }
}
