import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js'
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
} from 'discordx'

export const uwuify = (text: string): string => {
  // Each pattern is a tuple containing a search pattern and its associated replacement string
  const patterns: [RegExp, string][] = [
    [/r|l/g, 'w'],
    [/R|L/g, 'W'],
    [/n([aeiouAEIOU])/g, 'ny$1'],
    [/N([aeiou])/g, 'Ny$1'],
    [/N([AEIOU])/g, 'NY$1'],
    [/ove/g, 'uv'],
  ]

  // Iterate over each pattern and replace it in the user input string
  patterns.forEach(([re, replacement]) => {
    text = text.replace(re, replacement)
  })

  return text
}

@Discord()
class UwU {
  private mainChannel = '103678524375699456'

  @SimpleCommand({ name: 'uwu', description: 'UwUify text', argSplitter: '\n' })
  async simple(
    @SimpleCommandOption({ name: 'text', type: SimpleCommandOptionType.String }) text: string | undefined,
    command: SimpleCommandMessage
  ) {
    if (!text) {
      await command.message.reply({
        content: 'Usage: >uwu <text> (More than 200 characters only outside of the main channel)',
        allowedMentions: { repliedUser: false },
      })
      return
    }

    if (text.length > 200 && command.message.channel.id === this.mainChannel) {
      await command.message.reply({
        content: 'Messages longer than 200 characters are only allowed outside of the main channel.',
        allowedMentions: { repliedUser: false },
      })
      return
    }
    await command.message.reply({ content: uwuify(text), allowedMentions: { repliedUser: false } })
  }

  @Slash({ name: 'uwu', description: 'UwUify text' })
  private async slash(
    @SlashOption({ name: 'text', description: 'Text to UwUify', type: ApplicationCommandOptionType.String })
    text: string,
    interaction: CommandInteraction
  ) {
    if (text.length > 200 && interaction.channel?.id === this.mainChannel) {
      interaction.reply({
        content: 'Messages longer than 200 characters are only allowed in the #mixu channel.',
        ephemeral: true,
      })
      return
    }
    interaction.reply(uwuify(text))
  }
}
