import { CommandInteraction, Guild } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, Slash } from 'discordx'
import { injectable } from 'tsyringe'
import { ORM } from '../persistence/ORM.js'
import { BestMixu } from '../../prisma/generated/prisma-client-js/index.js'
import { shuffleArray } from '../utils/Helpers.js'

@Discord()
@injectable()
class Mixu {
  private numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  private bestMixu: BestMixu = {
    id: '1',
    owner: '',
    tiles: '',
    score: 0,
  }

  private mixuChannel = '340275382093611011'

  constructor(private client: ORM) {}

  private async getBestMixu(): Promise<BestMixu> {
    // If mixu has never been queried from the DB, the owner will be an empty string
    if (this.bestMixu.owner === '') {
      // upsert with an empty update {} can be used as a findOrCreate
      this.bestMixu = await this.client.bestMixu.upsert({
        where: { id: '1' },
        create: {},
        update: {},
      })
    }
    return this.bestMixu
  }

  private async setBestMixu(mixu: BestMixu) {
    this.bestMixu = mixu

    await this.client.bestMixu
      .update({
        where: { id: '1' },
        data: mixu,
      })
      .catch(console.error)
  }

  private score(tiles: number[]): number {
    // Score Miku based on
    // the position the tile should be in finished picture
    // if it is followed by the correct tile
    // if it has the correct under it
    // https://discord.com/channels/103678524375699456/340275382093611011/341046054952632330
    let score = 0
    for (const [i, tile] of tiles.entries()) {
      if (i === tile) {
        score++
      }
      if (
        i % 4 != 3 && // not the last tile in the row
        (tile + 1) % 4 != 0 && // not a row end tile
        i + 1 < tiles.length &&
        tiles[i + 1] - tile === 1
      ) {
        score++
      }
      if (i + 4 < 16 && tiles[i + 4] - tile === 4) {
        score++
      }
    }
    return score
  }

  private stringify(tiles: number[], guild: Guild): string {
    // Find emote corresponding to the tile
    return tiles
      .map((t, i) => {
        const emote = guild.emojis.cache.find((e) => e.name === `miku${t + 1}`)?.toString()
        return i % 4 === 0 ? '\n' + emote : emote
      })
      .join('')
  }

  private isMixuChannel(channel: string): boolean {
    return channel === this.mixuChannel
  }

  private async generateMixu(guild: Guild, username: string): Promise<string> {
    const tiles = shuffleArray([...this.numbers])
    const score = this.score(tiles)

    if (score > (await this.getBestMixu()).score) {
      this.setBestMixu({ id: '1', owner: username, tiles: tiles.join(','), score })
    }

    const text = this.stringify(tiles, guild)
    return `:regional_indicator_m::regional_indicator_i::regional_indicator_x::regional_indicator_u:${text}`
  }

  private async formatBestMixu(guild: Guild): Promise<[string, string] | null> {
    const mixu = await this.getBestMixu()
    const tiles = mixu.tiles.split(',').map((n) => +n)
    if (tiles.length !== 16) {
      return null
    }

    const text = this.stringify(tiles, guild)
    return [`Best Mixu by ${mixu.owner}`, text]
  }

  @SimpleCommand({ name: 'mixu', directMessage: false })
  async mixuCommand(command: SimpleCommandMessage) {
    if (!command.message.guild || !this.isMixuChannel(command.message.channel.id)) {
      return
    }

    const message = await this.generateMixu(command.message.guild, command.message.author.username)
    const channel = command.message.channel
    if (channel && channel.isSendable()) {
      await channel.send(message)
    }
  }

  @Slash({ name: 'mixu', description: 'Miku tile game' })
  async mixuSlashCommand(interaction: CommandInteraction) {
    if (
      !interaction.command?.guild ||
      !interaction.channel?.id ||
      !this.isMixuChannel(interaction.channel.id) ||
      !interaction.command.client.user?.username
    ) {
      await interaction.reply({ content: 'This command can only be used in the #mixu channel', ephemeral: true })
      return
    }

    await interaction.deferReply()
    const message = await this.generateMixu(interaction.command.guild, interaction.command.client.user.username)
    await interaction.followUp(message)
  }

  @SimpleCommand({ name: 'bestmixu', directMessage: false })
  async bestMixuSimpleCommand(command: SimpleCommandMessage) {
    if (!command.message.guild || !this.isMixuChannel(command.message.channel.id)) {
      return
    }

    const mixuInfo = await this.formatBestMixu(command.message.guild)
    if (!mixuInfo) {
      return
    }
    const [owner, text] = mixuInfo

    // Sending 2 separate messages to keep the Mixu emotes size big
    const channel = command.message.channel
    if (channel && channel.isSendable()) {
      channel.send(owner)
      channel.send(text)
    }
  }

  @Slash({ name: 'bestmixu', description: 'Show best mixu' })
  async bestMixuSlashCommand(interaction: CommandInteraction) {
    if (
      !interaction.command?.guild ||
      !interaction.channel?.id ||
      !this.isMixuChannel(interaction.channel.id) ||
      !interaction.command.client.user?.username
    ) {
      await interaction.reply({ content: 'This command can only be used in the #mixu channel', ephemeral: true })
      return
    }

    await interaction.deferReply()
    const mixuInfo = await this.formatBestMixu(interaction.command.guild)
    if (!mixuInfo) {
      await interaction.followUp({ content: 'Unable to get current Mixu right now', ephemeral: true })
      return
    }
    const [owner, text] = mixuInfo

    await interaction.followUp(owner)
    await interaction.followUp(text)
  }

  @SimpleCommand({ name: 'mikustare', directMessage: false })
  mikustareSimple(command: SimpleCommandMessage) {
    if (!command.message.guild || !this.isMixuChannel(command.message.channel.id)) {
      return
    }

    const text = this.stringify(this.numbers, command.message.guild)
    const channel = command.message.channel
    if (channel && channel.isSendable()) {
      channel.send(`:regional_indicator_m::regional_indicator_i::regional_indicator_k::regional_indicator_u:${text}`)
    }
  }

  @Slash({ name: 'mikustare', description: 'Output correctly aligned Miku picture' })
  async mikustareSlash(interaction: CommandInteraction) {
    if (!interaction.command?.guild || !interaction.channel?.id || !this.isMixuChannel(interaction.channel.id)) {
      await interaction.reply({ content: 'This command can only be used in the #mixu channel', ephemeral: true })
      return
    }

    await interaction.deferReply()
    const text = this.stringify(this.numbers, interaction.command.guild)
    await interaction.followUp(
      `:regional_indicator_m::regional_indicator_i::regional_indicator_k::regional_indicator_u:${text}`
    )
  }
}
