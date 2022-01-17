import { Guild } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage } from 'discordx'

@Discord()
abstract class Mixu {
  private numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  private bestScore = 0
  private bestMixuTiles: number[] = []
  private mixuChannel = '340275382093611011'

  private shuffle(): number[] {
    return [...this.numbers].sort(() => 0.5 - Math.random())
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
        tile % 4 != 0 && // not a row end tile
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

  @SimpleCommand('mixu', { directMessage: false })
  mixu(command: SimpleCommandMessage) {
    if (!command.message.guild || !this.isMixuChannel(command.message.channel.id)) return

    const tiles = this.shuffle()
    const score = this.score(tiles)

    if (score > this.bestScore) {
      this.bestScore = score
      this.bestMixuTiles = tiles
    }

    const text = this.stringify(tiles, command.message.guild)
    command.message.channel.send(
      `:regional_indicator_m::regional_indicator_i::regional_indicator_x::regional_indicator_u:${text}`
    )
  }

  @SimpleCommand('bestmixu', { directMessage: false })
  bestMixu(command: SimpleCommandMessage) {
    if (!command.message.guild || !this.isMixuChannel(command.message.channel.id) || this.bestMixuTiles.length === 0) {
      return
    }

    const text = this.stringify(this.bestMixuTiles, command.message.guild)
    command.message.channel.send(`${text}`)
  }

  @SimpleCommand('mikustare', { directMessage: false })
  mikustare(command: SimpleCommandMessage) {
    if (!command.message.guild || !this.isMixuChannel(command.message.channel.id)) return

    const text = this.stringify(this.numbers, command.message.guild)
    command.message.channel.send(
      `:regional_indicator_m::regional_indicator_i::regional_indicator_k::regional_indicator_u:${text}`
    )
  }
}
