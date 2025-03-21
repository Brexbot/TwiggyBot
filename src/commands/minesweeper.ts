import { ApplicationCommandOptionType, CommandInteraction, spoiler } from 'discord.js'
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

class Board {
  private width: number
  private height: number
  private numMines: number

  private neighbors: number[]

  static bombs = ['bomb', 'skull', 'skull_crossbones', 'anger', 'coffin']
  static neighborCounts: Record<number, string> = {
    0: 'zero',
    1: 'one',
    2: 'two',
    3: 'three',
    4: 'four',
    5: 'five',
    6: 'six',
    7: 'seven',
    8: 'eight',
  }

  constructor(width = 8, height = 8, numMines = 8) {
    this.width = width
    this.height = height
    this.numMines = numMines

    const neighbors = this.generateMines()
    this.neighbors = neighbors
  }

  private generateMines(): number[] {
    const area = this.width * this.height
    const mines: boolean[] = Array(area).fill(false)

    for (let i = 0; i < this.numMines; i++) {
      let index: number
      // choose a new index if that index is already a mine
      do {
        index = Math.floor(Math.random() * area)
      } while (mines[index])

      mines[index] = true
    }

    const neighbors: number[] = []
    for (let i = 0; i < mines.length; i++) {
      if (mines[i]) {
        neighbors.push(-1)
      } else {
        const count = this.surroundingMinesCount(mines, i)
        neighbors.push(count)
      }
    }

    return neighbors
  }

  private surroundingMinesCount(mines: boolean[], index: number): number {
    const x = this.xFromIndex(index)
    const y = this.yFromIndex(index)
    const allNeighbors = [
      [x - 1, y - 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x - 1, y + 1],
      [x, y + 1],
      [x + 1, y + 1],
    ]
    const allowedNeighbors = allNeighbors.filter(([x, y]) => this.isInBounds(x, y))
    return allowedNeighbors.reduce((count, [x, y]) => {
      const neighborIsMine = mines[this.indexFromXY(x, y)]
      return (count += neighborIsMine ? 1 : 0)
    }, 0)
  }

  private xFromIndex(index: number): number {
    return Math.floor(index / this.height)
  }

  private yFromIndex(index: number): number {
    return index % this.height
  }

  private indexFromXY(x: number, y: number): number {
    return x * this.height + y
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  private randomBomb(): string {
    return Board.bombs[Math.floor(Math.random() * Board.bombs.length)]
  }

  printBoard(): string {
    let startRevealed = false
    let board = ''
    for (let i = 0; i < this.neighbors.length; i++) {
      if (i % this.width === 0) {
        board += '\n'
      }

      const tile = this.neighbors[i]
      if (tile === -1) {
        board += spoiler(`:${this.randomBomb()}:`)
      } else {
        if (tile === 0 && !startRevealed) {
          board += `:${Board.neighborCounts[tile]}:`
          startRevealed = true
        } else {
          board += spoiler(`:${Board.neighborCounts[tile]}:`)
        }
      }
    }
    return board
  }
}

@Discord()
class Minesweeper {
  static cooldown = 10 * 60 * 1000 // Cooldown period is 10 minutes
  static mixuChannel = '340275382093611011'
  private lastUse = 0

  @SimpleCommand({ name: 'minesweeper', description: 'Play a game of minesweeper', argSplitter: '\t' })
  async simpleCommand(
    @SimpleCommandOption({ name: 'difficulty', type: SimpleCommandOptionType.String })
    difficulty: string | undefined,
    command: SimpleCommandMessage
  ) {
    const { content, ephemeral } = this.newGame(command.message.channelId, difficulty)
    if (!ephemeral) {
      const channel = command.message.channel
      if (channel && channel.isSendable()) {
        await channel.send(content)
      }
    }
  }

  @Slash({ name: 'minesweeper', description: 'Play a game of minesweeper' })
  async slashCommand(
    @SlashChoice({ name: 'Easy', value: 'easy' })
    @SlashChoice({ name: 'Normal', value: 'normal' })
    @SlashChoice({ name: 'Hard', value: 'hard' })
    @SlashChoice({ name: 'Ultra nightmare', value: 'ultra nightmare' })
    @SlashOption({
      name: 'difficulty',
      description: 'Which difficulty would you like to choose?',
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    difficulty: string | undefined,
    interaction: CommandInteraction
  ) {
    const reply = this.newGame(interaction.channelId, difficulty)
    await interaction.reply(reply)
  }

  private newGame(channelId: string, difficulty?: string): { content: string; ephemeral: boolean } {
    if (channelId !== Minesweeper.mixuChannel) {
      return { content: 'You cannot use this command outside of #Mixu.', ephemeral: true }
    }
    if (Date.now() < this.lastUse + Minesweeper.cooldown) {
      return { content: 'Command is on cooldown.', ephemeral: true }
    }

    this.lastUse = Date.now()
    const board = new Board(...this.chooseDifficulty(difficulty))
    return { content: board.printBoard(), ephemeral: false }
  }

  private chooseDifficulty(difficulty?: string): [number, number, number] {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return [8, 8, 8]
      case 'hard':
        return [8, 8, 18]
      case 'ultra nightmare':
        return [8, 8, 24]
      default:
        return [8, 8, 12]
    }
  }
}
