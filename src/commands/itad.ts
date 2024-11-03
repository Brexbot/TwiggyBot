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

type PlainResponse = {
  data: { plain: string } | []
}

type ShopInfo = {
  drm: string[]
  price_cut: number
  price_new: number
  price_old: number
  shop: {
    id: string
    name: string
  }
  url: string
}

type PriceResponse = {
  data: {
    [game: string]: {
      list: ShopInfo[]
      urls: {
        game: string
      }
    }
  }
}

@Discord()
class IsThereAnyDeal {
  // API reference: https://itad.docs.apiary.io
  private baseUrl = 'https://api.isthereanydeal.com'
  private apiToken: string

  constructor() {
    this.apiToken = process.env.ITAD_TOKEN ?? ''

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
      .catch(async (_) => {
        await command.message.reply({ content: `No deals found for ${game}`, allowedMentions: { repliedUser: false } })
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

  private async getDeals(game: string): Promise<string> {
    // Get plain name
    const plainResponse = await fetch(
      `${this.baseUrl}/v02/game/plain/?key=${this.apiToken}&title=${encodeURIComponent(game)}`
    )
    if (!plainResponse.ok) {
      return Promise.reject(`Unable to query api, returned ${plainResponse.status}`)
    }
    const plainJson = await plainResponse.json()
    const plainData = plainJson as PlainResponse

    if (plainData.data instanceof Array) {
      return Promise.reject(`No game found for query ${game}`)
    }

    const plain = plainData.data.plain

    // Use the plain name to get the actual deal info
    const gameResponse = await fetch(`${this.baseUrl}/v01/game/prices/?key=${this.apiToken}&country=US&plains=${plain}`)
    if (!gameResponse.ok) {
      return Promise.reject('Unable to find deals for this game')
    }
    const gameJson = await gameResponse.json()
    const gameInfo = gameJson as PriceResponse
    return (
      gameInfo.data[plain].list.map((entry) => `${entry.shop.name}: $${entry.price_new.toFixed(2)}`).join('; ') +
      `\n <${gameInfo.data[plain].urls.game}>`
    )
  }
}
