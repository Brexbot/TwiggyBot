import { CommandInteraction } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, Slash, SlashOption } from 'discordx'

export const uwuify = (text: string): string => {
  // Each pattern is a tuple containing a search pattern and its associated replacement string
  const patterns: [RegExp, string][] = [
    [/r|l/g, 'w'],
    [/R|L/g, 'W'],
    [/n([aeiouAEIOU])/g, 'ny$1'],
    [/N([aeiou])/g, 'Ny$1'],
    [/N([AEIOU])/g, 'NY$1'],
    [/ove/g, 'uv']
  ]

  // Iterate over each pattern and replace it in the user input string
  patterns.forEach(([re, replacement]) => {
    text = text.replace(re, replacement)
  })

  return text
}

@Discord()
class UwU {
  @SimpleCommand('uwu', { description: 'UwUify text', argSplitter: '\n' })
  async simple(
    @SimpleCommandOption('text', { type: 'STRING' }) text: string | undefined,
    command: SimpleCommandMessage
  ) {
    if (!text) {
      return command.sendUsageSyntax()
    }

    await command.message.channel.send(uwuify(text))
  }

  @Slash('uwu', { description: 'UwUify text' })
  private async slash(
    @SlashOption('text', { type: 'STRING' })
    text: string,
    interaction: CommandInteraction
  ) {
    await interaction.deferReply()

    await interaction.followUp(uwuify(text))
  }
}
