import { CommandInteraction, Guild, GuildMember, GuildMemberRoleManager, User } from 'discord.js'
import {
  Discord,
  Permission,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  Slash,
  SlashOption,
} from 'discordx'

@Discord()
abstract class Timeout {
  // TODO: import roles from global config
  private modRoles = [
    '103679575694774272', // Brex Mods
    '104750975268483072', // Brex scum
  ]
  private gozId = '104819134017118208'

  hasModPowers(member: GuildMember | null): boolean {
    return member?.roles.cache.some((role) => this.modRoles.includes(role.id)) ?? false
  }

  hasPermission(command: SimpleCommandMessage | CommandInteraction, target?: GuildMember): boolean {
    let guild: Guild | null
    let memberRoles: GuildMemberRoleManager | undefined
    let userId: string

    if (command instanceof SimpleCommandMessage) {
      guild = command.message.guild
      memberRoles = command.message.member?.roles
      userId = command.message.author.id
    } else {
      guild = command.guild
      userId = command.user.id
      const _memberRoles = command.member?.roles
      if (_memberRoles instanceof Array) {
        return false
      }
      memberRoles = _memberRoles
    }

    if (target) {
      memberRoles = target.roles
      userId = target.user.id
    }

    const highestBotRole = guild?.me?.roles.highest
    const highestMemberRole = memberRoles?.highest
    if (!highestBotRole || !highestMemberRole) {
      return false
    }
    return !(guild?.ownerId === userId && highestBotRole.comparePositionTo(highestMemberRole) > 0)
  }

  sudokuDuration(): number {
    return Math.floor(Math.random() * (690 - 420 + 1)) + 420
  }

  @SimpleCommand('sudoku')
  async sudokuCommand(command: SimpleCommandMessage) {
    if (!this.hasPermission(command)) {
      return
    }

    const time = this.sudokuDuration()
    await command.message.member?.timeout(time * 1000, "Sudoku'd")
    await command.message.channel.send(`${command.message.author}, you're timed out for ${time} seconds.`)
  }

  @Slash('sudoku', { description: 'Commit sudoku' })
  async sudokuInteraction(interaction: CommandInteraction) {
    if (!(interaction.member instanceof GuildMember) || !this.hasPermission(interaction)) {
      await interaction.reply({
        content: 'I cannot time you out.',
        ephemeral: true,
      })
      return
    }

    const time = this.sudokuDuration()
    await interaction.member.timeout(time * 1000, "Sudoku'd")
    await interaction.reply(`${interaction.user}, you're timed out for ${time} seconds.`)
  }

  @SimpleCommand('timeout')
  async timeoutCommand(
    @SimpleCommandOption('user', { type: 'USER' }) user: GuildMember | User | undefined,
    @SimpleCommandOption('duration', { type: 'NUMBER' }) duration: number | undefined,
    command: SimpleCommandMessage
  ) {
    if (
      !(user instanceof GuildMember) ||
      !this.hasModPowers(command.message.member) ||
      !this.hasPermission(command, user)
    ) {
      return
    }

    if (!duration) {
      await command.message.channel.send('Duration has to be a number.')
      return
    }

    // Max timeout is 10 days
    if (duration > 10 * 24 * 60 * 60 * 1000) {
      return
    }

    await user.timeout(duration * 1000, `${command.message.author} used timeout command`)
    if (command.message.author.id === this.gozId) {
      await command.message.channel.send('In the name of the Moon, I shall punish you!')
    }
  }

  @Slash('timeout')
  @Permission(false)
  // TODO: import roles from global config
  @Permission({ id: '103679575694774272', type: 'ROLE', permission: true }) // Brex Mods
  @Permission({ id: '104750975268483072', type: 'ROLE', permission: true }) // Brex scum
  async timeoutInteraction(
    @SlashOption('user', { type: 'USER', description: 'User you want to timeout' }) user: GuildMember,
    @SlashOption('duration', { type: 'NUMBER', description: 'Duration of the timeout in seconds' }) duration: number,
    interaction: CommandInteraction
  ) {
    if (
      !(interaction.member instanceof GuildMember) ||
      // This should never fail but I'm not familiar enough
      // with interaction permissions to know for sure
      !this.hasModPowers(interaction.member) ||
      !this.hasPermission(interaction, user)
    ) {
      await interaction.reply({ content: 'Cannot timeout user.', ephemeral: true })
      return
    }

    if (!duration) {
      await interaction.reply({ content: 'Duration has to be a number.', ephemeral: true })
      return
    }

    // Max timeout is 10 days
    if (duration > 10 * 24 * 60 * 60 * 1000) {
      return
    }

    await user.timeout(duration * 1000, `${interaction.user} used timeout command`)
    if (interaction.user.id === this.gozId) {
      await interaction.reply('In the name of the Moon, I shall punish you!')
    } else {
      await interaction.reply({ content: `${user} has been timed out for ${duration} seconds`, ephemeral: true })
    }
  }
}
