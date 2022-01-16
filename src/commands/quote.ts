import { CommandInteraction } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, Slash, SlashOption } from 'discordx'
import { uwuify } from './uwu'
import fetch from 'node-fetch'

interface Quote {
  id: number
  body: string
}

interface QuoteData {
  error: boolean
  type: number
  total: number
  data: Array<Quote>
}

@Discord()
class quoteCommand {
  private endpoint = 'https://api.bufutda.com/bot/quote?channel=bananasaurus_rex'
  private quotes: Array<Quote> = []
  private lastFetch: Date = new Date()
  private cacheDuration = 30 * 60 * 1000 // 30 minutes in milliseconds

  @Slash('quote', { description: 'Get server quote' })
  private async quoteSlash(
    @SlashOption('quoteid', { type: 'NUMBER', required: false })
    id: number,
    interaction: CommandInteraction
  ) {
    await interaction.deferReply()

    await this.updateQuotes().then(async () => {
      if (id) {
        const quote = this.quotes.find((quote) => quote.id == id)
        if (!quote) {
          await interaction.followUp(`Unable to find quote with ID ${id}`)
        } else {
          await interaction.followUp(quote.body)
        }
      } else {
        const randomQuote = this.getRandomQuote()
        if (randomQuote) {
          await interaction.followUp(randomQuote.body)
        } else {
          await interaction.followUp('Unable to get quotes.')
        }
      }
    })
  }

  @SimpleCommand('quote', { description: 'Get server quote', argSplitter: '\n' })
  private async quoteSimple(
    @SimpleCommandOption('id', { type: 'NUMBER' })
    id: number,
    command: SimpleCommandMessage
  ) {
    await this.updateQuotes().then(async () => {
      const channel = command.message.channel
      if (id) {
        const quote = this.quotes.find((quote) => quote.id == id)
        if (!quote) {
          await channel.send(`Unable to find quote with ID ${id}`)
        } else {
          await channel.send(quote.body)
        }
      } else {
        const randomQuote = this.getRandomQuote()
        if (randomQuote) {
          await channel.send(randomQuote.body)
        } else {
          await channel.send('Unable to get quotes.')
        }
      }
    })
  }

  @Slash('quwuote', { description: 'Get sewvew quwuote' })
  private async quwuoteSlash(
    @SlashOption('quwuoteid', { type: 'NUMBER', required: false })
    id: number,
    interaction: CommandInteraction
  ) {
    await interaction.deferReply()

    await this.updateQuotes().then(async () => {
      if (id) {
        const quote = this.quotes.find((quote) => quote.id == id)
        if (!quote) {
          await interaction.followUp(`Unable to find quwuote with ID ${id}`)
        } else {
          await interaction.followUp(uwuify(quote.body))
        }
      } else {
        const randomQuote = this.getRandomQuote()
        if (randomQuote) {
          await interaction.followUp(uwuify(randomQuote.body))
        } else {
          await interaction.followUp('Unable to get quwuotes.')
        }
      }
    })
  }

  @SimpleCommand('quwuote', { description: 'Get sewvew quwuote', argSplitter: '\n' })
  private async quwuoteSimple(
    @SimpleCommandOption('id', { type: 'NUMBER' })
    id: number,
    command: SimpleCommandMessage
  ) {
    await this.updateQuotes().then(async () => {
      const channel = command.message.channel
      if (id) {
        const quote = this.quotes.find((quote) => quote.id == id)
        if (!quote) {
          await channel.send(`Unyable to find quwuote with ID ${id}`)
        } else {
          await channel.send(uwuify(quote.body))
        }
      } else {
        const randomQuote = this.getRandomQuote()
        if (randomQuote) {
          await channel.send(uwuify(randomQuote.body))
        } else {
          await channel.send('Unyable to get quwuote.')
        }
      }
    })
  }

  private getRandomQuote(): Quote|null {
    if (this.quotes.length == 0) {
      return null
    }
    return this.quotes[Math.floor(Math.random() * this.quotes.length)]
  }

  private async updateQuotes() {
    // Only get the quotes if there aren't any yet or the cache has expired
    if (this.quotes.length == 0 || this.lastFetch.getTime() + this.cacheDuration < Date.now()) {
      const quotes = await this.fetchQuotes()
      if (quotes) {
        this.lastFetch = new Date()
        this.quotes = quotes.data
      }
    }
  }

  private async fetchQuotes(): Promise<QuoteData> {
    console.log('Fetching quotes from API')
    return await fetch(this.endpoint).then(async (resp) => {
      if (resp.ok) {
        return await resp.json()
      } else return Promise.reject('An error occurred while fetching quotes')
    })
  }
}
