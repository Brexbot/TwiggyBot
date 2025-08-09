import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  InteractionResponse,
  Message,
  escapeMarkdown,
} from 'discord.js'
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx'

import { getRandomElement } from '../utils/Helpers.js'

const COMMAND_NAME = 'ask'
const COMMAND_DESC = 'Ask a question to Wolfram Alpha'

const COOLDOWN_MILLISECONDS = 30 * 1000

// Replies for when Wolfram Alpha does not know the answer
const REPLIES = [
  'You should really know that yourself.',
  'What kind of dumbass question is that?',
  'I have no idea what you\'re talking about.',
  'Go bother someone else!',
  'I\'m not your personal assistant.',
  'I think I heard that somewhere but can\'t remember the details.',
  'https://www.giybf.com/',
  'Next question!',
  'The answer to that question would only confuse you.',
  'Beep, boop, nope.',
  'Scientists are still trying to figure out the answer to that question.',
  'I don\'t know you well enough to be comfortable to tell you.',
  'Huh?',
  'No idea.',
  'Math is hard, let\'s go shopping!',
  'I could tell you, but then I\'d have to kill you.',
  'Didn\'t you just ask me that?',
  'yes or no',
]

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
  ): Promise<Message<boolean> | InteractionResponse<boolean>> {
    const cooldownMessage = this.isOnCooldown()

    if (cooldownMessage) {
      return interaction.reply({ content: cooldownMessage, ephemeral: true })
    }

    await interaction.deferReply()
    try {
      const answer = await this.fetchAnswer(question, units)
      const capitalizedAnswer = answer.charAt(0).toUpperCase() + answer.slice(1)
      const embed = new EmbedBuilder()
        .setColor('#FBAB00') // MasterMind's color
        .setTitle(truncate(escapeMarkdown(question).trim(), 256))
        .setDescription(truncate(capitalizedAnswer.trim(), 4096))

      return await interaction.followUp({ embeds: [embed] })
    } catch (err) {
      console.error(err)
      return interaction.followUp({ content: 'There was a problem communicating with Wolfram Alpha.', ephemeral: true })
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

    const response = await fetch(url)
    if (response.ok) {
      return escapeMarkdown(await response.text())
    }

    switch (response.status) {
      case 501: {
        return getRandomElement(REPLIES)
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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength - 1).trim() + '…'
}
