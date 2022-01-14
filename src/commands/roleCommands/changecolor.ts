import { Discord, Slash, SlashOption } from 'discordx'
import { CommandInteraction, GuildMemberRoleManager, HexColorString } from 'discord.js'

@Discord()
class ColorRoles {
  private static allowedRoles = [
    '345501570483355648', // BRex Subscriber
    '103679575694774272', // BRex Mods
  ]
  private static hexExp = /^#?[0-9A-F]{6}$/i

  @Slash('changecolor', { description: 'Change your display color' })
  async slashChangeColor(
    @SlashOption('color', {
      description: 'The hex color to change to',
    })
    color: string,
    interaction: CommandInteraction
  ) {
    const memberRoles = interaction.member?.roles
    const guildRoles = interaction.guild?.roles
    if (!memberRoles || !(memberRoles instanceof GuildMemberRoleManager) || !guildRoles) {
      return
    }

    if (!memberRoles.cache.some((_, id) => ColorRoles.allowedRoles.includes(id))) {
      await interaction.reply('Yay! You get to keep your white color!')
      return
    }

    color = color.toUpperCase()
    if (color.toLowerCase() !== 'LAZY' && !ColorRoles.hexExp.test(color)) {
      await interaction.reply('Please enter a valid 6 digit hex color')
      return
    }

    if (color === 'LAZY') {
      // Get the registered color from prisma
      await interaction.reply('Not yet implemented :(')
      return
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
          (roleToDelete.members.size === 1 && roleToDelete.members.some((_, id) => id === interaction.user.id)))
      ) {
        await guildRoles.delete(existingRole.id).catch(console.error)
      }
    }

    await memberRoles.add(colorRole).catch(console.error)
    await interaction.reply(`${hexColor} has been set, enjoy your new color!`)
  }
}
