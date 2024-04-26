import {
  ApplicationCommandOptionType,
  CommandInteraction,
  InteractionResponse,
  escapeMarkdown,
  bold,
  quote
} from 'discord.js'
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashChoice,
  SlashOption,
} from 'discordx'

const COMMAND_NAME = 'ask'
const COMMAND_DESC = 'Ask a question to Wolfram Alpha'

const COOLDOWN_MILLISECONDS = 3 * 60 * 1000

@Discord()
class Ask {
  private apiToken: string
  private lastUsage: number

  constructor() {
    this.apiToken = process.env.WOLFRAM_APP_ID ?? ''
    this.lastUsage = 0

    if (this.apiToken == '') {
      throw new Error('WOLFRAM_APP_ID needs to be set')
    }
  }

  @SimpleCommand({ name: COMMAND_NAME, description: COMMAND_DESC, argSplitter: '\n' })
  async simple(
    @SimpleCommandOption({ name: 'question', type: SimpleCommandOptionType.String })
    question: string | undefined,
    @SimpleCommandOption({ name: 'units of measurement', type: SimpleCommandOptionType.Boolean })
    units: string | undefined,
    command: SimpleCommandMessage
  ) {
    if (!question) {
      return await command.message.reply({
        content: 'Usage: >ask <question>\n<units?> (metric or imperial)',
        allowedMentions: { repliedUser: false },
      })
    }

    if (this.isOnCooldown()) {
      return
    }

    try {
      const answer = await this.fetchAnswer(question, units)
      return command.message.reply({ content: quote(answer), allowedMentions: { repliedUser: false } })
    } catch (err) {
      console.error(err)
      return command.message.reply({
        content: 'There was a problem communicating with Wolfram Alpha.',
        allowedMentions: { repliedUser: false },
      })
    }
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
    @SlashChoice({ name: 'Metric', value: 'metric' })
    @SlashChoice({ name: 'Imperial', value: 'imperial' })
    @SlashOption({
      name: 'units_of_measurement',
      description: 'Which units of measurements you want to use',
      type: ApplicationCommandOptionType.String,
      required: false,
    })
    units: string,
    interaction: CommandInteraction
  ): Promise<InteractionResponse<boolean>> {
    const cooldownMessage = this.isOnCooldown()
    if (cooldownMessage) {
      return interaction.reply({ content: cooldownMessage, ephemeral: true })
    }

    try {
      const answer = await this.fetchAnswer(question, units)
      return interaction.reply(
        `### ${escapeMarkdown(question)}
          ${quote(answer)}
          `
      )
    } catch (err) {
      console.error(err)
      return interaction.reply('There was a problem communicating with Wolfram Alpha.')
    }
  }

  private async fetchAnswer(question: string, units: string | undefined): Promise<string> {
    if (units?.toLowerCase() !== 'imperial') {
      units = 'metric'
    }

    const url = new URL('https://api.wolframalpha.com/v1/result')
    url.searchParams.append('appid', this.apiToken)
    url.searchParams.append('i', question)
    url.searchParams.append('units', units.toLowerCase())

    console.log(url)

    const response = await fetch(url)

    if (response.ok) {
      return escapeMarkdown(await response.text())
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

  private isOnCooldown(): string | null {
    const now = Date.now()
    const cooldownEnd = this.lastUsage + COOLDOWN_MILLISECONDS

    if (cooldownEnd > now) {
      return `Command will be off cooldown <t:${Math.floor(cooldownEnd / 1000)}:R>.`
    }

    this.lastUsage = now
    return null
  }
}
