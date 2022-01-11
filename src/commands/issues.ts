import { CommandInteraction } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, Slash } from 'discordx'

@Discord()
class Issues {
  private url = 'https://github.com/Brexbot/DiscordBot/issues'

  @SimpleCommand('issues')
  simple(command: SimpleCommandMessage) {
    command.message.reply(this.url)
  }

  @Slash('issues', { description: "Output link to this bot's issues on GitHub" })
  async slash(interaction: CommandInteraction) {
    interaction.reply(this.url)
  }
}
