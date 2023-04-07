import { Discord, SimpleCommand, SimpleCommandMessage, Slash, SlashOption } from 'discordx'
import { ApplicationCommandOptionType, CommandInteraction, GuildMember, GuildMemberRoleManager, User } from 'discord.js'
import { memberIsSU } from '../../guards/RoleChecks'

// Intentionally leaving out the slash command for this as it doesn't really make sense to
// clutter the slash menu with a command that most users will only ever use once

@Discord()
class EmbedPls {
  // private roleId = '787815221317992448'
  private roleId = '930791790490030100'

  @SimpleCommand({ name: 'embedpls' })
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

  @Slash({ name: 'embedpls', description: 'Toggle the ability of embedding images/videos', dmPermission: false })
  slash(
    @SlashOption({
      name: 'target',
      type: ApplicationCommandOptionType.User,
      description: '(Mod only) User to add/remove role for',
      required: false,
    })
    target: GuildMember,
    interaction: CommandInteraction
  ) {
    if (target && target.id !== interaction.user.id && !memberIsSU(interaction.member)) {
      return interaction.reply({
        content: "You don't have the power to add/remove the role to someone other than yourself.",
        ephemeral: true,
      })
    }

    const embedRole = interaction.guild?.roles?.cache?.find((role) => role.id === this.roleId)
    if (!embedRole) {
      return interaction.reply({
        content: 'There was an error finding the embed role for this server.',
        ephemeral: true,
      })
    }

    const recipient = target ? target : interaction.member

    const memberRoles = recipient?.roles
    if (!memberRoles || memberRoles instanceof Array) {
      return interaction.reply({
        content: 'There was an error getting your member roles.',
        ephemeral: true,
      })
    }

    if (memberRoles.cache.some((role) => role === embedRole)) {
      memberRoles.remove(embedRole).catch(console.error)
      return interaction.reply({ content: `The embed has been removed from ${recipient}.`, ephemeral: true })
    }

    memberRoles.add(embedRole).catch(console.error)
    return interaction.reply({ content: `The embed role has been added to ${recipient}.`, ephemeral: true })
  }
}
