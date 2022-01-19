import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, Slash, SlashOption } from 'discordx'
import { CommandInteraction, GuildEmojiManager, GuildMemberRoleManager, RoleManager } from 'discord.js'

@Discord()
class Icon {
  // todo: Should probably be in some global along with other SU ids
  private modRoleId = '754737174162702448' //'103679575694774272'

  @SimpleCommand('createicon')
  async createIconRole(
    @SimpleCommandOption('emote', {
      description: 'The emote to create an icon role from',
    })
    emote: string,
    command: SimpleCommandMessage
  ) {
    if (!command.message.member?.roles?.cache.some((role) => role.id === this.modRoleId)) {
      return
    }

    if (!emote) {
      return command.sendUsageSyntax()
    }

    const emoteName = Icon.parseEmoteName(emote)
    const icon = command.message.guild?.emojis?.cache?.find((emoji) => emoji.name === emoteName)
    if (!icon) {
      command.message.channel.send(`\`${emoteName}\` is not from this server!`)
      return
    }

    const modifiedRoleName = `${emoteName} [ICON]`
    const guildRoles = command.message.guild?.roles
    if (guildRoles?.cache.some((role) => role.name.toLowerCase() === modifiedRoleName.toLowerCase())) {
      command.message.channel.send(`\`${modifiedRoleName}\` already exists.`)
      return
    }

    guildRoles
      ?.create({
        name: modifiedRoleName,
        permissions: [],
        mentionable: false,
        icon: icon,
      })
      .then(() => {
        command.message.channel.send(`\`${modifiedRoleName}\` was created. Use \`>icon ${emoteName}\` to join it.`)
      })
      .catch(console.error)
  }

  @SimpleCommand('delicon')
  async delRole(
    @SimpleCommandOption('emote', {
      description: 'The emote of the icon to delete',
    })
    emote: string,
    command: SimpleCommandMessage
  ) {
    if (!command.message.member?.roles?.cache.some((role) => role.id === this.modRoleId)) {
      return
    }

    if (!emote) {
      return command.sendUsageSyntax()
    }

    const emoteName = Icon.parseEmoteName(emote)
    const modifiedRoleName = `${emoteName} [ICON]`
    const guildRoles = command.message.guild?.roles
    const roleToBeDeleted = guildRoles?.cache.find((role) => role.name.toLowerCase() === modifiedRoleName.toLowerCase())
    if (!roleToBeDeleted) {
      command.message.channel.send(`Couldn't find the \`${modifiedRoleName}\` icon to delete`)
      return
    }

    await guildRoles
      ?.delete(roleToBeDeleted.id)
      .then(() => command.message.channel.send(`\`${modifiedRoleName}\` has been deleted.`))
      .catch(console.error)
  }

  @SimpleCommand('icon')
  async simpleRolesub(
    @SimpleCommandOption('emote', {
      description: 'The emote of the icon to delete',
    })
    emote: string,
    command: SimpleCommandMessage
  ) {
    const msg = this.icon(
      emote,
      command.message.guild?.emojis,
      command.message.guild?.roles,
      command.message.member?.roles
    )
    await command.message
      .reply({
        content: msg,
        allowedMentions: {
          repliedUser: false,
        },
      })
      .catch(console.error)
  }

  @Slash('icon', { description: 'Add or remove one of the many icon roles!' })
  async slashRolesub(
    @SlashOption('emote', {
      required: false,
      description: 'Get the icon list or select an icon to add/remove',
      type: 'STRING',
    })
    emote: string,
    interaction: CommandInteraction
  ) {
    const memberRoles = interaction.member?.roles
    if (memberRoles instanceof Array) {
      return
    }

    const msg = this.icon(emote, interaction.guild?.emojis, interaction.guild?.roles, memberRoles)
    await interaction
      .reply({
        content: msg,
        allowedMentions: {
          repliedUser: false,
        },
      })
      .catch(console.error)
  }

  private icon(
    roleName: string,
    guildEmotes: GuildEmojiManager | undefined,
    guildRoles: RoleManager | undefined,
    memberRoles: GuildMemberRoleManager | undefined
  ): string {
    if (!roleName) {
      return 'To use this command, get an icon from `>icon list` and use `>icon :emote:` to add or remove it.'
    } else if (roleName.toLowerCase() === 'list') {
      // todo: make this print a little prettier... text embed?
      const roles = guildRoles?.cache
        .filter((role) => role.name.endsWith('[ICON]'))
        .map((role) => {
          const emote: string = guildEmotes?.cache?.find((emote) => emote.name === roleName)?.toString() ?? ''
          ;`${emote} ${role.name}`
        })
        .join(', ')

      if (!roles || roles.length < 1) {
        return 'There are no icons on the server.'
      } else {
        return roles
      }
    }

    const modifiedRoleName = `${roleName} [ICON]`
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
      return 'That icon does not exist on the server.'
    }
  }

  private static parseEmoteName(emote: string): string | undefined {
    const emoteName = emote.match(RegExp(':(.+):'))
    if (emoteName) {
      return emoteName[1]
    } else {
      return undefined
    }
  }
}
