import { Discord, SimpleCommand, SimpleCommandMessage } from 'discordx'

@Discord()
abstract class Timeout {
  hasPermission(command: SimpleCommandMessage): boolean {
    const guild = command.message.guild
    const highestBotRole = guild?.me?.roles.highest
    const highestMemberRole = command.message.member?.roles.highest
    const userId = command.message.author.id

    if (!highestBotRole || !highestMemberRole) {
      return false
    }
    return !(guild?.ownerId === userId) || highestMemberRole.comparePositionTo(highestBotRole) > 0
  }

  @SimpleCommand('sudoku')
  async sudokuCommand(command: SimpleCommandMessage) {
    if (!this.hasPermission(command)) {
      return
    }

    const time = Math.floor(Math.random() * (690 - 420 + 1)) + 420
    await command.message.member?.timeout(time * 1000, "Sudoku'd")
    await command.message.channel.send(`${command.message.author}, you're timed out for ${time} seconds.`)
  }
}
