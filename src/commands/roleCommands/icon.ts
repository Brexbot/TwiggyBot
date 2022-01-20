import {
  Discord,
  Permission,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  Slash,
  SlashOption
} from 'discordx'
import { CommandInteraction, GuildMemberRoleManager, RoleManager } from 'discord.js'
import { SuperUsers } from '../../guards/RoleChecks'

@Discord()
class Icon {
  @SimpleCommand('createicon')
  @Permission(false)
  @Permission(SuperUsers)
  async createIconRole(
    @SimpleCommandOption('emote', {
      description: 'The emote to create an icon role from',
    })
    emote: string,
    command: SimpleCommandMessage
  ) {
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
  @Permission(false)
  @Permission(SuperUsers)
  async delRole(
    @SimpleCommandOption('emote', {
      description: 'The emote of the icon to delete',
    })
    emote: string,
    command: SimpleCommandMessage
  ) {
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
    const msg = await this.icon(emote, command.message.guild?.roles, command.message.member?.roles)
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

    const msg = await this.icon(emote, interaction.guild?.roles, memberRoles)
    await interaction
      .reply({
        content: msg,
        allowedMentions: {
          repliedUser: false,
        },
      })
      .catch(console.error)
  }

  private async icon(
    emoteName: string,
    guildRoles: RoleManager | undefined,
    memberRoles: GuildMemberRoleManager | undefined
  ): Promise<string> {
    if (!emoteName) {
      return 'To use this command, get an icon from `>icon list` and use `>icon [EmoteName]` to add or remove it.'
    } else if (emoteName.toLowerCase() === 'list') {
      const iconRoles = guildRoles?.cache
        .filter((role) => role.name.endsWith('[ICON]'))
        .map((role) => role.name.replace(' [ICON]', ''))

      if (!iconRoles || iconRoles.length < 1) {
        return 'There are no icons on the server.'
      } else {
        iconRoles.sort()
        return `**Icons:** ${iconRoles.join(', ')}`
      }
    }

    const modifiedRoleName = `${emoteName} [ICON]`
    const whichRole = guildRoles?.cache.find((role) => role.name.toLowerCase() === modifiedRoleName.toLowerCase())
    if (whichRole) {
      if (memberRoles?.cache.some((role) => role.id === whichRole.id)) {
        await memberRoles?.remove(whichRole).catch(console.error)
        return `${whichRole.name} has been removed.`
      } else {
        const existingRole = memberRoles?.cache.find((role) => role.name.endsWith('[ICON]'))
        if (existingRole) {
          await memberRoles?.remove(existingRole).catch(console.error)
        }

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
