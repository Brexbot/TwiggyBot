import { Discord, SimpleCommand, SimpleCommandMessage, Slash, SlashOption } from 'discordx'
import {
  CommandInteraction,
  Formatters,
  GuildMember,
  GuildMemberRoleManager,
  HexColorString,
  RoleManager,
} from 'discord.js'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'

@Discord()
@injectable()
class ColorRoles {
  private static modRoles = [
    '103679575694774272', // BRex Mods
    '104750975268483072', // BRex Ultimate Scum
  ]

  private static allowedMemberRoles = [
    '345501570483355648', // BRex Subscriber
  ]

  private static hexExp = /^#?[0-9A-F]{6}$/i

  public constructor(private client: ORM) {}

  @SimpleCommand('uncolor')
  async uncolor(command: SimpleCommandMessage) {
    if (!command.message.member?.roles.cache.some((_, id) => ColorRoles.modRoles.includes(id)) ?? true) {
      return Promise.reject()
    }

    const mentions = command.message.mentions
    const colorRole = command.message.guild?.roles?.cache?.find((role) => ColorRoles.hexExp.test(role.name))

    let mentionedMember: GuildMember | undefined
    if ((mentions.members?.size ?? 0) > 0 && command.message.member?.permissions?.has('MANAGE_ROLES')) {
      mentionedMember = mentions.members?.first()
    }

    if (colorRole && mentionedMember) {
      mentionedMember.roles
        .remove(colorRole)
        .then(async (_) => {
          if (
            colorRole &&
            (colorRole.members.size === 0 ||
              (colorRole.members.size === 1 && colorRole.members.some((_, id) => id === mentionedMember?.id)))
          ) {
            await command.message.guild?.roles.delete(colorRole.id).catch(console.error)
          }
        })
        .catch(console.error)
    }
  }

  @Slash('changecolor', { description: 'Change your display color' })
  async slashChangeColor(
    @SlashOption('color', {
      description: 'The hex color to change to',
    })
    color: string,
    @SlashOption('favorite', {
      description: 'Is this your favorite color?',
      required: false,
    })
    isFavorite: boolean,
    interaction: CommandInteraction
  ) {
    const memberRoles = interaction.member?.roles
    const guildRoles = interaction.guild?.roles
    if (!memberRoles || !(memberRoles instanceof GuildMemberRoleManager) || !guildRoles) {
      return Promise.reject('An unexpected error occurred')
    }

    const reply = await this.changeUserColor(color, isFavorite ?? false, interaction).catch(console.error)
    await interaction.reply(reply ?? '').catch(console.error)
  }

  private async changeUserColor(
    color: string,
    isFavorite: boolean,
    command: CommandInteraction | SimpleCommandMessage
  ): Promise<string> {
    let userId: string
    let memberRoles: GuildMemberRoleManager
    let guildRoles: RoleManager
    if (command instanceof CommandInteraction) {
      const _memberRoles = command.member?.roles
      const _guildRoles = command.guild?.roles
      if (!_memberRoles || !(_memberRoles instanceof GuildMemberRoleManager) || !_guildRoles) {
        return Promise.reject('An unexpected error occurred')
      }

      userId = command.user.id
      memberRoles = _memberRoles
      guildRoles = _guildRoles
    } else {
      userId = command.message.author.id
      return Promise.reject('Not yet implemented')
    }

    if (!memberRoles || !guildRoles) {
      return Promise.reject()
    }

    if (!memberRoles.cache.some((_, id) => ColorRoles.getAllowedRoles().includes(id))) {
      return 'Yay! You get to keep your white color!'
    }

    color = color.toUpperCase()
    if (color.toUpperCase() !== 'LAZY' && !ColorRoles.hexExp.test(color)) {
      return 'Please enter a valid 6 digit hex color'
    }

    if (color === 'LAZY') {
      const userOptions = await this.client.userOptions.findUnique({
        where: {
          userId: userId,
        },
      })
      if (userOptions && userOptions.favColor) {
        color = userOptions.favColor
      } else {
        return 'You have not registered a color. Set the `favorite` param to true the next time you change your color.'
      }
    }

    // TODO: Hardcoding the position for Rexcord. We'll need some way to define it dynamically
    // maybe by using a role with a predefined name... get that role and then take it's position + 1 for the new color
    const hexColor: HexColorString = color[0] !== '#' ? `#${color}` : (color as HexColorString)
    const colorRole =
      guildRoles.cache.find((role) => role.name === hexColor) ??
      (await guildRoles.create({
        name: hexColor,
        color: hexColor,
        permissions: [],
        position: 8, // Needed to allow priority if there are multiple roles with colors; e.g. Nitro or Subscriber
        mentionable: false,
      }))

    const existingRole = memberRoles.cache.find((role) => ColorRoles.hexExp.test(role.name))
    if (existingRole) {
      await memberRoles.remove(existingRole).catch(console.error)
      const roleToDelete = guildRoles.cache.find((role) => role.id === existingRole.id)
      if (
        roleToDelete &&
        (roleToDelete.members.size === 0 ||
          (roleToDelete.members.size === 1 && roleToDelete.members.some((_, id) => id === userId)))
      ) {
        await guildRoles.delete(existingRole.id).catch(console.error)
      }
    }

    let favoriteString = ' '
    await memberRoles
      .add(colorRole)
      .then(async (_) => {
        if (isFavorite) {
          await this.client.userOptions
            .upsert({
              where: {
                userId: userId,
              },
              update: {
                favColor: hexColor,
              },
              create: {
                userId: userId,
                favColor: hexColor,
              },
            })
            .catch(console.error)
          favoriteString += Formatters.italic('favorite') + ' '
        }
      })
      .catch(console.error)
    return `${hexColor} has been set, enjoy your${favoriteString}color!`
  }

  private static getAllowedRoles(): string[] {
    return ColorRoles.modRoles.concat(ColorRoles.allowedMemberRoles)
  }
}
