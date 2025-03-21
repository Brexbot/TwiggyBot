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

type SearchResponse = {
  id: string
  slug: string
  title: string
  type: string
  mature: boolean
}[]

type PricesResponse = {
  id: string
  deals: ShopInfo[]
}[]

type ShopInfo = {
  drm: string[]
  price: {
    amount: number
    amountInt: number
    currency: string
  }
  shop: {
    id: string
    name: string
  }
  url: string
}

@Discord()
class IsThereAnyDeal {
  // API reference: https://itad.docs.apiary.io
  private baseUrl = 'https://api.isthereanydeal.com'
  private gamePageBaseUrl = 'https://isthereanydeal.com/game'
  private apiToken: string
  private formatter: Intl.NumberFormat

  constructor() {
    this.apiToken = process.env.ITAD_TOKEN ?? ''
    this.formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

    if (this.apiToken == '') {
      throw Error('ITAD_TOKEN needs to be set')
    }
  }

  @SimpleCommand({ name: 'itad', description: 'Check isthereanydeal.com for deals', argSplitter: '\n' })
  async simple(
    @SimpleCommandOption({ name: 'game', type: SimpleCommandOptionType.String })
    game: string | undefined,
    command: SimpleCommandMessage
  ) {
    if (!game) {
      await command.message.reply({ content: 'Usage: >itad <game>', allowedMentions: { repliedUser: false } })
      return
    }
    await this.getDeals(game)
      .then(async (deals) => {
        await command.message.reply({ content: deals, allowedMentions: { repliedUser: false } })
      })
      .catch(async (reason) => {
        await command.message.reply({ content: reason, allowedMentions: { repliedUser: false } })
      })
  }

  @Slash({ name: 'itad', description: 'Check isthereanydeal.com for deals' })
  private async slash(
    @SlashOption({
      name: 'game',
      type: ApplicationCommandOptionType.String,
      description: 'Game to search for',
      required: true,
    })
    game: string,
    interaction: CommandInteraction
  ) {
    await this.getDeals(game)
      .then(async (deals) => {
        await interaction.reply(deals)
      })
      .catch(async (reason) => {
        await interaction.reply(reason)
      })
  }

  private async getDeals(title: string): Promise<string> {
    // https://docs.isthereanydeal.com/#tag/Game/operation/games-search-v1
    const searchUrl = new URL('/games/search/v1', this.baseUrl)
    searchUrl.searchParams.append('key', this.apiToken)
    searchUrl.searchParams.append('title', title)
    searchUrl.searchParams.append('results', '1')

    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) {
      return Promise.reject(`Unable to query api, returned ${searchResponse.status}`)
    }

    let gameId
    let gameSlug
    try {
      const searchJson = (await searchResponse.json()) as SearchResponse
      gameId = searchJson[0].id
      gameSlug = searchJson[0].slug
    } catch {
      return Promise.reject(`No game found for query ${title}`)
    }

    // https://docs.isthereanydeal.com/#tag/Prices/operation/games-prices-v3
    const pricesUrl = new URL('/games/prices/v3', this.baseUrl)
    pricesUrl.searchParams.append('key', this.apiToken)
    pricesUrl.searchParams.append('country', 'US')
    pricesUrl.searchParams.append('deals', 'true')

    const pricesResponse = await fetch(pricesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([gameId]),
    })

    if (!pricesResponse.ok) {
      return Promise.reject('Unable to find deals for this game')
    }

    try {
      const pricesJson = (await pricesResponse.json()) as PricesResponse
      const game = pricesJson[0]

      const deals = game.deals.map((d) => `${d.shop.name}: ${this.formatter.format(d.price.amount)}`).join('; ')
      const gameInfoUrl = `${this.gamePageBaseUrl}/${gameSlug}/info`

      return Promise.resolve(`${deals}\n<${gameInfoUrl}>`)
    } catch {
      return Promise.reject('Unable to find deals for this game')
    }
  }
}
