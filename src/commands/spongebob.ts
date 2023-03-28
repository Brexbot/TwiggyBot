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
import { spongeCase } from 'sponge-case'

@Discord()
class Spongebob {
  private mainChannel = '103678524375699456'

  @SimpleCommand({ name: 'sb', description: 'Spongebobify text', argSplitter: '\n' })
  async simple(
    @SimpleCommandOption({ name: 'text', type: SimpleCommandOptionType.String }) text: string | undefined,
    command: SimpleCommandMessage
  ) {
    if (!text) {
      await command.message.reply({
        content: 'Usage: >sb <text> (More than 200 characters only outside of the main channel)',
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
    await command.message.reply({ content: spongeCase(text), allowedMentions: { repliedUser: false } })
  }

  @Slash({ name: 'sb', description: 'Spongebobify text' })
  async slash(
    @SlashOption({
      name: 'text',
      description: 'THe texT to sPongebOBifY.',
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    message: string,
    interaction: CommandInteraction
  ) {
    if (message.length > 200 && interaction.channel?.id === this.mainChannel) {
      await interaction.reply({
        content: 'Messages longer than 200 characters are only allowed outside of the main channel.',
        ephemeral: true,
      })
      return
    }
    await interaction.reply(spongeCase(message))
  }
}
