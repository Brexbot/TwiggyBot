import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, Slash, SlashOption } from 'discordx'
import { CommandInteraction, Formatters, Guild, GuildMember, HexColorString } from 'discord.js'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'
import { GuildOptions, Prisma } from '../../../prisma/generated/prisma-client-js'
import { PermissionSuperUserOnly, superUserIds, superUserRoles } from '../../guards/RoleChecks'
import { getGuildAndCallerFromCommand, getGuildFromCommand } from '../../utils/CommandUtils'
import { Duel } from '../duel'
import { getTimeLeftInReadableFormat } from '../../utils/CooldownUtils'

@Discord()
@injectable()
export class ColorRoles {
  // guildId, roleId
  private static allowedMemberRoles = new Map<string, string[]>([
    ['103678524375699456', ['345501570483355648']], // BRex Subscriber
  ])

  private static hexExp = /^#?[0-9A-F]{6}$/i
  private static cooldown = 60 * 60 * 1000
  private static guildOptions: GuildOptions

  public constructor(private client: ORM) {}

  @SimpleCommand('uncolor')
  @PermissionSuperUserOnly
  async simpleUncolor(command: SimpleCommandMessage) {
    const guild = getGuildFromCommand(command)
    let mentionedMember: GuildMember | undefined
    if ((command.message.mentions.members?.size ?? 0) > 0) {
      mentionedMember = command.message.mentions.members?.first()
    }

    if (!guild || !mentionedMember) {
      return
    }

    await ColorRoles.setColor('uncolor', mentionedMember, guild)
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
    const [guild, member] = getGuildAndCallerFromCommand(command)

    if (!member || !guild) {
      return Promise.reject()
    }

    // User Role Check
    if (!member.roles.cache.some((_, id) => ColorRoles.getAllowedRoles(guild.id).includes(id))) {
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

    if (!superUserIds.some((id) => id.id === member.id)) {
      if ((userOptions.lastLoss.getTime() + Duel.cooldown) > Date.now()) {
        return `${member.user}, you have recently lost a duel. Please wait ${getTimeLeftInReadableFormat(
          userOptions.lastLoss,
          Duel.cooldown
        )} before trying again.`
      } else if ((userOptions.lastRandom.getTime() + ColorRoles.cooldown) > Date.now()) {
        return `${member.user}, you have recently randomed/gambled. Please wait ${getTimeLeftInReadableFormat(
          userOptions.lastRandom,
          Duel.cooldown
        )} before trying again.`
      }
    }

    // Valid option check
    if (
      !color ||
      (color.toUpperCase() !== 'LAZY' &&
        color.toUpperCase() !== 'GAMBLE' &&
        color.toUpperCase() !== 'RANDOM' &&
        !ColorRoles.hexExp.test(color)) ||
      color.includes('000000')
    ) {
      return 'Please enter a valid 6 digit hex color'
    }

    // Get Lazy/Random/Gambled color
    let randomed = false
    color = color.toUpperCase()
    if (color === 'LAZY') {
      if (userOptions.favColor) {
        color = userOptions.favColor.toUpperCase()

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
            lastRandom: new Date(),
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
          lastRandom: new Date(),
        },
      })
      randomed = true
      color = ColorRoles.getRandomColor()
    }

    // Update role and favorite color
    const hexColor: HexColorString = color[0] !== '#' ? `#${color}` : (color as HexColorString)
    let favoriteString = ' '
    if (isFavorite || hexColor === userOptions.favColor?.toUpperCase()) {
      favoriteString += Formatters.italic('favorite') + ' '
    }

    await ColorRoles.setColor(hexColor, member, guild)
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
        }
      })
      .catch(console.error)

    if (randomed) {
      return `Hahaha. Get stuck with ${hexColor} for an hour.`
    } else {
      return `${hexColor} has been set, enjoy your${favoriteString}color!`
    }
  }

  static async setColor(color: HexColorString | 'uncolor', member?: GuildMember, guild?: Guild) {
    if (!member || !guild) {
      return Promise.reject('An unexpected error occurred')
    }

    // Needed to allow priority if there are multiple roles with colors; e.g. Nitro or Subscriber
    const baseRole = guild.roles.cache.find((role) => role.id === ColorRoles.allowedMemberRoles.get(guild.id)?.at(0))
    let rolePosition = baseRole?.position
    if (rolePosition) {
      rolePosition += 1 // Higher priority == more important
    }

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

    if (color === 'uncolor') {
      return member
    } else {
      // Finally add the new role to the member
      color = color.toUpperCase() as HexColorString
      const colorRole =
        guild.roles.cache.find((role) => role.name === color) ??
        (await guild.roles.create({
          name: color,
          color: color,
          permissions: [],
          position: rolePosition,
          mentionable: false,
        }))
      return member.roles.add(colorRole)
    }
  }

  private static getRandomColor(): string {
    // This could technically return 0x000000, which is an invalid role color in Discord (doesn't crash)
    // we prevent the user from setting this but I'm gonna leave it here as a god roll/easter egg
    return Math.floor(Math.random() * 0xffffff)
      .toString(16) // Convert to Hex
      .padStart(6, '0') // In case the number is too small to fill all 6 hex digits
      .toUpperCase()
  }

  private static getAllowedRoles(guildId: string): string[] {
    return superUserRoles.map((su) => su.id).concat(ColorRoles.allowedMemberRoles.get(guildId) ?? [])
  }
}
