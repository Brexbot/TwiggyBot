import { CommandInteraction, Guild, GuildMember, GuildMemberRoleManager } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, Slash } from 'discordx'

@Discord()
abstract class Timeout {
  hasPermission(command: SimpleCommandMessage | CommandInteraction): boolean {
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

    const highestBotRole = guild?.me?.roles.highest
    const highestMemberRole = memberRoles?.highest
    if (!highestBotRole || !highestMemberRole) {
      return false
    }
    return !(guild?.ownerId === userId) || highestMemberRole.comparePositionTo(highestBotRole) > 0
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
}
