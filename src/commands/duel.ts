import { ButtonInteraction, CommandInteraction, MessageButton, MessageActionRow, Message } from 'discord.js'
import { Discord, Slash } from 'discordx'
import { injectable } from 'tsyringe'
import { ORM } from '../persistence/ORM'

import { Duels } from '../../prisma/generated/prisma-client-js'
import { ColorRoles } from './roleCommands/changecolor'

@Discord()
@injectable()
class Duel {
  private inProgress = false
  private cooldown = 10 * 60 * 1000 // Cooldown period after loss in milliseconds

  private timeoutDuration = 5 * 60 * 1000 // Time before the duel is declared dead in milliseconds
  private timeout: ReturnType<typeof setTimeout> | null = null

  public constructor(private client: ORM) {}

  @Slash('duel', { description: 'Challenge the chat to a duel' })
  private async duel(interaction: CommandInteraction) {
    await interaction.deferReply()

    // Get the challenger from the DB. Create them if they don't exist yet.
    const challengerName = interaction.user
    const challenger = await this.getUserWithDuelStats(interaction.user.id)
    if (!challenger) {
      await interaction.followUp('An unexpected error occurred.')
      return
    }

    // Check if a duel is currently already going on.
    if (this.inProgress) {
      await interaction.followUp('A duel is already in progress.')
      return
    }

    // check if the challenger has recently lost
    if (challenger.lastLoss.getTime() + this.cooldown > Date.now()) {
      const remaining = Math.ceil(Math.abs(Date.now() - (challenger.lastLoss.getTime() + this.cooldown)) / 1000)
      await interaction.followUp({
        content: `${challengerName}, you have recently lost a duel or gamble. Please wait ${Math.round(
          remaining / 60
        )} minutes before trying again.`,
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
      content: `${challengerName} is looking for a duel, press the button to accept.`,
      fetchReply: true,
      components: [row],
    })

    if (!(message instanceof Message)) {
      throw Error('InvalidMessage instance')
    }

    const collector = message.createMessageComponentCollector()
    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()

      // Prevent accepting your own duels and ensure that the acceptor is valid.
      const acceptorName = collectionInteraction.user
      const acceptor = await this.getUserWithDuelStats(collectionInteraction.user.id)
      if (!acceptor || acceptor.id === challenger.id) {
        return
      }

      // Check if the acceptor has recently lost and can't duel right now. Print their timeout.
      if (acceptor.lastLoss.getTime() + this.cooldown > Date.now()) {
        const remaining = Math.ceil(Math.abs(Date.now() - (acceptor.lastLoss.getTime() + this.cooldown)) / 1000)
        await collectionInteraction.followUp({
          content: `${acceptorName}, you have recently lost a duel or gamble. Please wait ${remaining} seconds before trying again.`,
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
          await this.updateUserScore(challenger.duelStats[0], 'win')
          await this.updateUserScore(acceptor.duelStats[0], 'loss')

          await ColorRoles.uncolor(acceptor.id, interaction)

          winnerText = `${challengerName} has won!`
        } else if (accepterScore > challengerScore) {
          await this.updateUserScore(challenger.duelStats[0] as Duels, 'loss')
          await this.updateUserScore(acceptor.duelStats[0], 'win')

          await ColorRoles.uncolor(challenger.id, interaction)

          winnerText = `${acceptorName} has won!`
        } else {
          await this.updateUserScore(challenger.duelStats[0] as Duels, 'draw')
          await this.updateUserScore(acceptor.duelStats[0], 'draw')

          winnerText = "It's a draw!"
        }

        await collectionInteraction.followUp({
          content: `${acceptorName} has rolled a ${accepterScore} and ${challengerName} has rolled a ${challengerScore}. ${winnerText}`,
        })
      }
    })
  }

  @Slash('duelstats', { description: 'Display your duel statistics' })
  private async duelStats(interaction: CommandInteraction) {
    await interaction.deferReply()

    // TODO: Once/If we implement seasons this will need to change from findFirst
    const user = interaction.user
    const stats = await this.client.duels.findFirst({
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
      statsMessage.push(`Best win streak: ${stats.winStreakMax}`, `Worst loss streak: ${stats.lossStreakMax}`)
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
            id: stats.id,
          },
          data: {
            draws: { increment: 1 },
            lossStreak: 0,
            winStreak: 0,
          },
        })
        break
      }
      case 'win': {
        await this.client.duels.update({
          where: {
            id: stats.id,
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
            id: stats.id,
          },
          data: {
            losses: { increment: 1 },
            winStreak: 0,
            lossStreak: { increment: 1 },
            // Increment losss streak if it's bigger than the current one
            lossStreakMax: stats.lossStreak + 1 > stats.lossStreakMax ? stats.lossStreakMax + 1 : stats.lossStreakMax,
            user: {
              update: {
                lastLoss: new Date(),
              },
            },
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

  private async getUserWithDuelStats(userId: string) {
    // I'm not sure if we can do conditionals to check if no duelStats exist, so I went the verbose route...
    return this.client.user
      .upsert({
        where: {
          id: userId,
        },
        create: {
          id: userId,
          duelStats: {
            create: [{}],
          },
        },
        update: {},
        include: {
          duelStats: true,
        },
      })
      .then(async (user) => {
        if (user.duelStats.length === 0) {
          return this.client.user.update({
            where: {
              id: user.id,
            },
            data: {
              duelStats: {
                create: [{ userId: user.id }],
              },
            },
            include: {
              duelStats: true,
            },
          })
        } else {
          return user
        }
      })
  }
}
