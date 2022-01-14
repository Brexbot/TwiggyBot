import { ButtonInteraction, CommandInteraction, MessageButton, MessageActionRow, Message, User } from 'discord.js'
import { Discord, Slash } from 'discordx'
import { injectable } from 'tsyringe'
import { ORM } from '../persistence/ORM'

import { Duels } from '../../prisma/generated/prisma-client-js'

@Discord()
@injectable()
class Duel {
  private inProgress = false
  private cooldown = 5 * 60 * 1000 // Cooldown period after loss in milliseconds

  private timeoutDuration = 5 * 60 * 1000 // Time before the duel is declared dead in milliseconds
  private timeout: ReturnType<typeof setTimeout> | null = null

  public constructor(private client: ORM) {}

  @Slash('duel', { description: 'Challenge the chat to a duel' })
  private async duel(interaction: CommandInteraction) {
    await interaction.deferReply()

    // Get the challenger from the DB. Create them if they don't exist yet.
    const challenger = interaction.user
    let challengerStats = await this.client.duels.findUnique({
      where: {
        userId: challenger.id
      }
    })
    if (!challengerStats) {
      challengerStats = await this.client.duels.create({ data: { userId: challenger.id } })
    }

    // Check if a duel is currently already going on.
    if (this.inProgress) {
      await interaction.followUp('A duel is already in progress.')
      return
    }

    // check if the challenger has recently lost
    if (challengerStats.lastLoss.getTime() + this.cooldown > Date.now()) {
      const remaining = Math.ceil(Math.abs(Date.now() - (challengerStats.lastLoss.getTime() + this.cooldown)) / 1000)
      await interaction.followUp({
        content: `${challenger}, you have recently lost. Please wait ${remaining} seconds before trying again.`,
      })
      return
    }

    this.inProgress = true

    // Disable the duel after a timeout
    this.timeout = setTimeout(async () => {
      // Disable the button
      const button = this.createButton(true)
      const row = new MessageActionRow().addComponents(button)
      await interaction.editReply({
        content: `${challenger} failed to find someone to duel.`,
        components: [row],
      })
      this.inProgress = false
    }, this.timeoutDuration)

    const row = new MessageActionRow().addComponents(this.createButton(false))
    const message = await interaction.followUp({
      content: `${challenger} is looking for a duel, press the button to accept.`,
      fetchReply: true,
      components: [row],
    })

    if (!(message instanceof Message)) {
      throw Error('InvalidMessage instance')
    }

    const collector = message.createMessageComponentCollector()
    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()

      const accepter = collectionInteraction.member?.user
      // Prevent accepting your own duels and ensure that the accepter is valid.
      if (!accepter || accepter.id === challenger.id) {
        return
      }

      // Get the accepter from the DB. Create them if they don't exist yet.
      let accepterStats = await this.client.duels.findUnique({
        where: {
          userId: accepter.id,
        },
      })
      if (!accepterStats) {
        accepterStats = await this.client.duels.create({ data: { userId: accepter.id } })
      }

      // Check if the accepter has recently lost and can't duel right now. Print their timeout.
      if (accepterStats.lastLoss.getTime() + this.cooldown > Date.now()) {
        const remaining = Math.ceil(Math.abs(Date.now() - (accepterStats.lastLoss.getTime() + this.cooldown)) / 1000)
        await collectionInteraction.followUp({
          content: `You have just duelled and lost. Please wait ${remaining} seconds before trying again.`,
        })
      } else if (!this.inProgress) {
        // This case is not really supposed to happen because you should not be able to accept a duel after it has expired
        // We are handling this anyways

        // Check if there is no current duel
        await collectionInteraction.followUp({
          content: `There is no duel right now, it has probably expired. Use /duel to create one.`,
        })
        // Disable the button
        const button = this.createButton(true)
        const row = new MessageActionRow().addComponents(button)
        await collectionInteraction.editReply({
          components: [row],
        })
        return
      } else {
        // Disable duel
        this.inProgress = false

        // Disable the button
        const button = this.createButton(true)
        const row = new MessageActionRow().addComponents(button)
        await collectionInteraction.editReply({
          components: [row],
        })

        // Get and announce the winner
        const accepterScore = this.getRandomScore()
        const challengerScore = this.getRandomScore()
        let winnerText = ''
        if (challengerScore > accepterScore) {
          await this.updateUserScore(challengerStats, 'win')
          await this.updateUserScore(accepterStats, 'loss')

          winnerText = `${challenger} has won!`
        } else if (accepterScore > challengerScore) {
          await this.updateUserScore(challengerStats, 'loss')
          await this.updateUserScore(accepterStats, 'win')

          winnerText = `${accepter} has won!`
        } else {
          await this.updateUserScore(challengerStats, 'draw')
          await this.updateUserScore(accepterStats, 'draw')

          winnerText = "It's a draw!"
        }

        await collectionInteraction.followUp({
          content: `${accepter} has rolled a ${accepterScore} and ${challenger} has rolled a ${challengerScore}. ${winnerText}`,
        })
      }
    })
  }

  @Slash('duelstats', { description: 'Display your duel statistics' })
  private async duelStats(interaction: CommandInteraction) {
    await interaction.deferReply()

    const user = interaction.user
    const stats = await this.client.duels.findUnique({
      where: {
        userId: user.id,
      },
    })
    if (stats) {
      const statsMessage = [`${user}: ${stats.wins}-${stats.losses}-${stats.draws}`]
      if (stats.winStreak > 0) {
        // User is currently on a win streak
        statsMessage.push(`Win streak: ${stats.winStreak}`)
      } else if (stats.lossStreak > 0) {
        // User is currently on a loss streak
        statsMessage.push(`Loss streak: ${stats.lossStreak}`)
      } else {
        // User's last duel was a draw which reset both streaks
        statsMessage.push(`Your last duel was a draw.`)
      }
      statsMessage.push(
        `Best win streak: ${stats.winStreakMax}`,
        `Worst loss streak: ${stats.lossStreakMax}`
      )
      await interaction.followUp(statsMessage.join('\n'))
    } else {
      await interaction.followUp(`${user}, you have never duelled before.`)
    }
  }

  private async updateUserScore(stats: Duels, outcome: 'win' | 'loss' | 'draw') {
    switch (outcome) {
      case 'draw': {
        await this.client.duels.update({
          where: {
            userId: stats.userId,
          },
          data: {
            draws: { increment: 1 },
            lossStreak: 0,
            winStreak: 0,
          }
        })
        break
      }
      case 'win': {
        await this.client.duels.update({
          where: {
            userId: stats.userId,
          },
          data: {
            wins: { increment: 1 },
            lossStreak: 0,
            winStreak: { increment: 1 },
            // Increment win streak if it's bigger than the current one
            winStreakMax: stats.winStreak + 1 > stats.winStreakMax ? stats.winStreakMax + 1 : stats.winStreakMax,
          },
        })
        break
      }
      default: {
        // loss
        await this.client.duels.update({
          where: {
            userId: stats.userId,
          },
          data: {
            losses: { increment: 1 },
            winStreak: 0,
            lossStreak: { increment: 1 },
            // Increment losss streak if it's bigger than the current one
            lossStreakMax: stats.lossStreak + 1 > stats.lossStreakMax ? stats.lossStreakMax + 1 : stats.lossStreakMax,
            lastLoss: new Date(),
          },
        })
      }
    }
  }

  private getRandomScore(): number {
    return Math.floor(Math.random() * 100)
  }

  private createButton(disabled: boolean): MessageButton {
    let button = new MessageButton().setEmoji('⚔️').setStyle('PRIMARY').setCustomId('duel-btn')
    if (disabled) {
      button = button.setLabel("It's over").setDisabled(true)
    } else {
      button = button.setLabel('Accept duel')
    }
    return button
  }
}
