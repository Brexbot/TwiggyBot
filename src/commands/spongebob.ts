import { CommandInteraction } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SlashOption, Slash, SimpleCommandOption } from 'discordx'
import { spongeCase } from 'sponge-case'

@Discord()
class Spongebob {
  @SimpleCommand('sb', { description: 'Spongebobify text', argSplitter: '\n' })
  simple(@SimpleCommandOption('text', { type: 'STRING' }) text: string | undefined, command: SimpleCommandMessage) {
    if (!text) {
      return command.sendUsageSyntax()
    }
    command.message.reply(spongeCase(text))
  }

  @Slash('sb', { description: 'Spongebobify text' })
  async slash(
    @SlashOption('text', { type: 'STRING' })
    message: string,
    interaction: CommandInteraction
  ) {
    interaction.reply(spongeCase(message))
  }
}
