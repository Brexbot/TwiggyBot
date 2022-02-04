import { CommandInteraction, Formatters, Guild, GuildMember, GuildMemberRoleManager, User } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, Slash, SlashOption } from 'discordx'
import { PermissionSuperUserOnly } from '../guards/RoleChecks'

@Discord()
abstract class Timeout {
  private gozId = '104819134017118208'

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

  async sudoku(member: GuildMember | null, message?: string): Promise<string> {
    const time = this.sudokuDuration()
    await member?.timeout(time * 1000, "Sudoku'd").catch(console.error)
    const msg = message && message.length < 150 ? `\n${Formatters.quote(message)}` : ''

    return `${member}, you're timed out for ${time} seconds.${msg}`
  }

  @SimpleCommand('sudoku', { argSplitter: '\n' })
  async sudokuCommand(
    // message: everything after the command and before a new line
    @SimpleCommandOption('message', {
      type: 'STRING',
      description: 'Your last message before committing sudoku',
    })
    message: string | undefined,
    command: SimpleCommandMessage
  ) {
    if (!this.hasPermission(command)) {
      return
    }

    await command.message.channel.send(await this.sudoku(command.message.member, message))
  }

  @Slash('sudoku', { description: 'Commit sudoku' })
  async sudokuInteraction(
    @SlashOption('message', {
      type: 'STRING',
      description: 'Your last message before committing sudoku',
      required: false,
    })
    message: string | undefined,
    interaction: CommandInteraction
  ) {
    if (!(interaction.member instanceof GuildMember) || !this.hasPermission(interaction)) {
      await interaction.reply({
        content: 'I cannot time you out.',
        ephemeral: true,
      })
      return
    }

    await interaction.reply(await this.sudoku(interaction.member, message))
  }

  @SimpleCommand('timeout')
  @PermissionSuperUserOnly
  async timeoutCommand(
    @SimpleCommandOption('user', { type: 'USER' }) user: GuildMember | User | undefined,
    @SimpleCommandOption('duration', { type: 'NUMBER' }) duration: number | undefined,
    command: SimpleCommandMessage
  ) {
    if (!(user instanceof GuildMember) || !this.hasPermission(command, user)) {
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
  @PermissionSuperUserOnly
  async timeoutInteraction(
    @SlashOption('user', { type: 'USER', description: 'User you want to timeout' }) user: GuildMember,
    @SlashOption('duration', { type: 'NUMBER', description: 'Duration of the timeout in seconds' }) duration: number,
    interaction: CommandInteraction
  ) {
    if (!(interaction.member instanceof GuildMember) || !this.hasPermission(interaction, user)) {
      await interaction.reply({ content: 'Cannot timeout user.', ephemeral: true })
      return
    }

    if (!duration) {
      await interaction.reply({ content: 'Duration has to be a number.', ephemeral: true })
      return
    }

    // Max timeout is 10 days
    if (duration > 10 * 24 * 60 * 60 * 1000) {
      await interaction.reply({ content: 'Duration exceeds the 10 days limit.', ephemeral: true })
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
