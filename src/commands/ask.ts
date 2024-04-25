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

const COMMAND_NAME = 'ask'
const COMMAND_DESC = 'Ask a question to Wolfram Alpha'

@Discord()
class Ask {
  private apiToken: string

  constructor() {
    this.apiToken = process.env.WOLFRAM_APP_ID ?? ''

    if (this.apiToken == '') {
      throw Error('WOLFRAM_APP_ID needs to be set')
    }
  }

  @SimpleCommand({ name: COMMAND_NAME, description: COMMAND_DESC })
  async simple(
    @SimpleCommandOption({ name: 'question', type: SimpleCommandOptionType.String })
    question: string | undefined,
    command: SimpleCommandMessage
  ) {
    if (!question) {
      return await command.message.reply({ content: 'Usage: >ask <question>', allowedMentions: { repliedUser: false } })
    }

    this.fetchAnswer(question)
      .then((answer) => command.message.reply({ content: answer, allowedMentions: { repliedUser: false } }))
      .catch((err) => {
        console.error(err)
        command.message.reply({
          content: 'There was a problem communicating with Wolfram Alpha.',
          allowedMentions: { repliedUser: false },
        })
      })
  }

  @Slash({ name: COMMAND_NAME, description: COMMAND_DESC })
  private async slash(
    @SlashOption({
      name: 'question',
      type: ApplicationCommandOptionType.String,
      description: 'The question you want to ask',
      required: true,
    })
    question: string,
    interaction: CommandInteraction
  ) {
    this.fetchAnswer(question)
      .then((answer) => interaction.reply(answer))
      .catch((err) => {
        console.error(err)
        interaction.reply('There was a problem communicating with Wolfram Alpha.')
      })
  }

  private async fetchAnswer(question: string): Promise<string> {
    const url = new URL('https://api.wolframalpha.com/v1/result')
    url.searchParams.append('appid', this.apiToken)
    url.searchParams.append('i', question)
    url.searchParams.append('units', 'metric')

    const response = await fetch(url)

    if (response.ok) {
      return response.text()
    }

    switch (response.status) {
      case 501: {
        return 'The bot was not able to answer.'
      }
      case 400: {
        return 'Something was wrong with that input. Did Tip try to break bot again?'
      }
      default: {
        throw new Error(`Something went wrong while asking Wolfram Alpha a question. Status Code: ${response.status}`)
      }
    }
  }
}
