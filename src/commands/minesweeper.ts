import { CommandInteraction, Formatters } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, Slash } from 'discordx'

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
        board += Formatters.spoiler(`:${this.randomBomb()}:`)
      } else {
        if (tile === 0 && !startRevealed) {
          board += `:${Board.neighborCounts[tile]}:`
          startRevealed = true
        } else {
          board += Formatters.spoiler(`:${Board.neighborCounts[tile]}:`)
        }
      }
    }
    return board
  }
}

@Discord()
class Minesweeper {
  static cooldown = 10 * 60 * 1000 // Cooldown period is 10 minutes
  private lastUse = 0

  @SimpleCommand('minesweeper')
  async simpleCommand(command: SimpleCommandMessage) {
    const content = this.newGame()
    if (content) {
      await command.message.channel.send(content)
    }
  }

  @Slash('minesweeper', { description: 'Play a game of minesweeper' })
  async slashCommand(interaction: CommandInteraction) {
    const content = this.newGame()
    if (!content) {
      await interaction.reply({ content: 'This command is on cooldown.', ephemeral: true })
      return
    }
    await interaction.reply({ content, allowedMentions: { repliedUser: false } })
  }

  private newGame(): string | undefined {
    if (Date.now() < this.lastUse + Minesweeper.cooldown) {
      return
    }

    this.lastUse = Date.now()
    const board = new Board()
    return board.printBoard()
  }
}
