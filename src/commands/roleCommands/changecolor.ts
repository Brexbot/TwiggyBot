import {
  Discord,
  Permission,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  Slash,
  SlashOption
} from 'discordx'
import { CommandInteraction, Formatters, Guild, GuildMember, HexColorString } from 'discord.js'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'
import { GuildOptions, Prisma } from '../../../prisma/generated/prisma-client-js'
import { SuperUsers } from '../../guards/RoleChecks'

@Discord()
@injectable()
export class ColorRoles {
  private static modRoles = [
    '103679575694774272', // BRex Mods
    '104750975268483072', // BRex Ultimate Scum
  ]

  private static allowedMemberRoles = [
    '345501570483355648', // BRex Subscriber
  ]

  private static hexExp = /^#?[0-9A-F]{6}$/i
  private static cooldown = 60 * 60 * 1000
  private static guildOptions: GuildOptions

  public constructor(private client: ORM) {}

  @SimpleCommand('uncolor')
  @Permission(SuperUsers)
  async simpleUncolor(command: SimpleCommandMessage) {
    let mentionedMember: GuildMember | undefined
    if ((command.message.mentions.members?.size ?? 0) > 0) {
      mentionedMember = command.message.mentions.members?.first()
    }

    if (!mentionedMember) {
      return
    }

    await ColorRoles.uncolor(mentionedMember.id, command)
  }

  @SimpleCommand('changecolor')
  async simpleChangeColor(
    @SimpleCommandOption('color', {
      description: 'The hex color to change to',
    })
    color: string,
    @SimpleCommandOption('is_favorite', {
      description: 'Should this color be registered as your favorite',
    })
    isFavorite: boolean,
    command: SimpleCommandMessage
  ) {
    this.changeUserColor(color, isFavorite ?? false, command)
      .then(async (reply) => {
        await command.message.channel.send(reply)
      })
      .catch(console.error)
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
    this.changeUserColor(color, isFavorite ?? false, interaction)
      .then(async (reply) => {
        await interaction.reply(reply)
      })
      .catch(console.error)
  }

  @SimpleCommand('random')
  async simpleRandomColor(command: SimpleCommandMessage) {
    this.changeUserColor('RANDOM', false, command)
      .then(async (reply) => {
        await command.message.channel.send(reply)
      })
      .catch(console.error)
  }

  @Slash('random', { description: 'Change to a random display color' })
  async slashRandomColor(interaction: CommandInteraction) {
    this.changeUserColor('RANDOM', false, interaction)
      .then(async (reply) => {
        await interaction.reply(reply)
      })
      .catch(console.error)
  }

  @SimpleCommand('lazy')
  async simpleLazyColor(command: SimpleCommandMessage) {
    this.changeUserColor('LAZY', false, command)
      .then(async (reply) => {
        await command.message.channel.send(reply)
      })
      .catch(console.error)
  }

  @Slash('lazy', { description: 'Change to your favorite display color' })
  async slashLazyColor(interaction: CommandInteraction) {
    this.changeUserColor('LAZY', false, interaction)
      .then(async (reply) => {
        await interaction.reply(reply)
      })
      .catch(console.error)
  }

  @SimpleCommand('gamble')
  async simpleGamble(command: SimpleCommandMessage) {
    this.changeUserColor('GAMBLE', false, command)
      .then(async (reply) => {
        return await command.message.channel.send(reply)
      })
      .catch(console.error)
  }

  @Slash('gamble', { description: 'Tempt The Wheel of Fate for a new color... or not!' })
  async slashGamble(interaction: CommandInteraction) {
    this.changeUserColor('GAMBLE', false, interaction)
      .then(async (reply) => {
        return await interaction.reply(reply)
      })
      .catch(console.error)
  }

  private async changeUserColor(
    color: string,
    isFavorite: boolean,
    command: CommandInteraction | SimpleCommandMessage
  ): Promise<string> {
    let member: GuildMember
    let guild: Guild
    if (command instanceof CommandInteraction) {
      const _member = command.member
      const _guild = command.guild
      if (!_member || !(_member instanceof GuildMember) || !_guild) {
        return Promise.reject('An unexpected error occurred')
      }

      member = _member
      guild = _guild
    } else {
      const _member = command.message.member
      const _guild = command.message.guild
      if (!_member || !_guild) {
        return Promise.reject('An unexpected error occurred')
      }

      member = _member
      guild = _guild
    }

    if (!member || !guild) {
      return Promise.reject()
    }

    // User Role Check
    if (!member.roles.cache.some((_, id) => ColorRoles.getAllowedRoles().includes(id))) {
      return 'Yay! You get to keep your white color!'
    }

    // User Cooldown Check
    if (!ColorRoles.guildOptions) {
      ColorRoles.guildOptions = await this.client.guildOptions.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id },
        update: {},
      })
    }

    const userOptions = await this.client.user.upsert({
      where: { id: member.id },
      create: { id: member.id },
      update: {},
    })

    const timeLeftInMillis = userOptions.lastLoss.getTime() + ColorRoles.cooldown
    if (timeLeftInMillis > Date.now()) {
      const timeLeftInMinutes = Math.round((timeLeftInMillis - Date.now()) / 1000 / 60)
      return `${member.user}, You have recently lost a duel or gamble. Wait another ${timeLeftInMinutes} minutes.`
    }

    // Valid option check
    if (
      !color ||
      (color.toUpperCase() !== 'LAZY' &&
        color.toUpperCase() !== 'GAMBLE' &&
        color.toUpperCase() !== 'RANDOM' &&
        !ColorRoles.hexExp.test(color))
    ) {
      return 'Please enter a valid 6 digit hex color'
    }

    // Get Lazy/Random/Gambled color
    let randomed = false
    color = color.toUpperCase()
    if (color === 'LAZY') {
      if (userOptions.favColor) {
        color = userOptions.favColor

        if (member.roles.cache.some((role) => role.name === color)) {
          return 'Wow, you really are lazy... you already have your favorite color! 🎉'
        }
      } else {
        return 'You have not registered a color. Set the `favorite` param to true the next time you change your color.'
      }
    } else if (color === 'GAMBLE') {
      const randChance = Prisma.Decimal.random().mul(100)
      if (randChance.lessThanOrEqualTo(ColorRoles.guildOptions.gambleChance)) {
        await this.client.user.update({
          where: { id: member.id },
          data: {
            lastLoss: new Date(),
          },
        })
        randomed = true
        color = ColorRoles.getRandomColor()
      } else {
        return 'Huzzah. You get to keep your color.'
      }
    } else if (color === 'RANDOM') {
      await this.client.user.update({
        where: { id: member.id },
        data: {
          lastLoss: new Date(),
        },
      })
      randomed = true
      color = ColorRoles.getRandomColor()
    }

    const hexColor: HexColorString = color[0] !== '#' ? `#${color}` : (color as HexColorString)
    const baseRole = guild.roles.cache.find((role) => role.id === ColorRoles.allowedMemberRoles[0])
    let rolePosition = baseRole?.position
    if (rolePosition) {
      rolePosition += 1
    }
    const colorRole =
      guild.roles.cache.find((role) => role.name === hexColor) ??
      (await guild.roles.create({
        name: hexColor,
        color: hexColor,
        permissions: [],
        position: rolePosition, // Needed to allow priority if there are multiple roles with colors; e.g. Nitro or Subscriber
        mentionable: false,
      }))

    // Remove and delete existing role if exists
    const existingRole = member.roles.cache.find((role) => ColorRoles.hexExp.test(role.name))
    if (existingRole) {
      await member.roles.remove(existingRole).catch(console.error)
      const roleToDelete = guild.roles.cache.find((role) => role.id === existingRole.id)
      if (
        roleToDelete &&
        (roleToDelete.members.size === 0 ||
          (roleToDelete.members.size === 1 && roleToDelete.members.some((_, id) => id === member.id)))
      ) {
        await guild.roles.delete(existingRole.id).catch(console.error)
      }
    }

    // Update role and favorite color
    let favoriteString = ' '
    await member.roles
      .add(colorRole)
      .then(async (_) => {
        if (isFavorite) {
          await this.client.user
            .update({
              where: {
                id: member.id,
              },
              data: {
                favColor: hexColor,
              },
            })
            .catch(console.error)
          favoriteString += Formatters.italic('favorite') + ' '
        }
      })
      .catch(console.error)

    if (randomed) {
      return `Hahaha. Get stuck with ${hexColor} for an hour.`
    } else {
      return `${hexColor} has been set, enjoy your${favoriteString}color!`
    }
  }

  static async uncolor(userId: string, command: CommandInteraction | SimpleCommandMessage) {
    let guild: Guild
    if (command instanceof CommandInteraction) {
      const _guild = command.guild
      if (!_guild) {
        return Promise.reject('An unexpected error occurred')
      }

      guild = _guild
    } else {
      const _guild = command.message.guild
      if (!_guild) {
        return Promise.reject('An unexpected error occurred')
      }

      guild = _guild
    }

    const colorRole = guild.roles?.cache?.find((role) => ColorRoles.hexExp.test(role.name))
    const unColoredMember = guild.members.cache.find((member) => member.id === userId)
    if (colorRole && unColoredMember) {
      unColoredMember.roles
        .remove(colorRole)
        .then(async (_) => {
          if (
            colorRole &&
            (colorRole.members.size === 0 ||
              (colorRole.members.size === 1 && colorRole.members.some((_, id) => id === userId)))
          ) {
            await guild.roles.delete(colorRole.id)
          }
        })
        .catch(console.error)
    }
  }

  private static getRandomColor(): string {
    return Math.floor(Math.random() * 0xffffff)
      .toString(16) // Convert to Hex
      .padStart(6, '0') // In case the number is too small to fill all 6 hex digits
      .toUpperCase()
  }

  private static getAllowedRoles(): string[] {
    return ColorRoles.modRoles.concat(ColorRoles.allowedMemberRoles)
  }
}
