import { ButtonInteraction, CommandInteraction, MessageButton, MessageActionRow, Message } from 'discord.js'
import { Discord, Slash } from 'discordx'
import { injectable } from 'tsyringe'
import { ORM } from '../persistence/ORM'

@Discord()
@injectable()
class Duel {
  private inProgress = false
  private cooldown = 5 * 60 * 1000 // Cooldown period after loss in milliseconds

  public constructor(private client: ORM) {}

  @Slash('duel')
  private async duel(interaction: CommandInteraction) {
    await interaction.deferReply()

    // Get the challenger from the DB. Create them if they don't exist yet.
    const challengerName = interaction.user.username
    let challenger = await this.client.duels.findUnique({
      where: {
        userName: challengerName,
      },
    })
    if (!challenger) {
      challenger = await this.client.duels.create({ data: { userName: challengerName } })
    }

    // Check if a duel is currently already going on.
    if (this.inProgress) {
      await interaction.followUp('A duel is already in progress.')
      return
    }

    // check if the challenger has recently lost
    console.log(`${challenger.lastLoss.getTime() + this.cooldown} > ${Date.now()}`)
    if (challenger.lastLoss.getTime() + this.cooldown > Date.now()) {
      const remaining = Math.ceil(Math.abs(Date.now() - (challenger.lastLoss.getTime() + this.cooldown)) / 1000)
      await interaction.followUp({
        content: `${challengerName}, you have recently lost. Please wait ${remaining} seconds before trying again.`,
      })
      return
    }

    this.inProgress = true

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

      const accepterName = collectionInteraction.member?.user.username
      // Prevent accepting your own duels and ensure that the accepter is valid.
      if (!accepterName || accepterName === challengerName) {
        return
      }

      // Get the accepter from the DB. Create them if they don't exist yet.
      let accepter = await this.client.duels.findUnique({
        where: {
          userName: accepterName,
        },
      })
      if (!accepter) {
        accepter = await this.client.duels.create({ data: { userName: accepterName } })
      }

      // Check if the accepter has recently lost and can't duel right now. Print their timeout.
      if (accepter.lastLoss.getTime() + this.cooldown > Date.now()) {
        const remaining = Math.ceil(Math.abs(Date.now() - (accepter.lastLoss.getTime() + this.cooldown)) / 1000)
        await collectionInteraction.followUp({
          content: `You have just duelled and lost. Please wait ${remaining} seconds before trying again.`,
        })
      } else if (!this.inProgress) {
        // Check if there is no current duel
        await collectionInteraction.followUp({
          content: `There is no duel right now. Use /duel to create one.`,
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
          await this.updateUserScore(challengerName, 'win')
          await this.updateUserScore(accepterName, 'loss')

          winnerText = `${challengerName} has won!`
        } else if (accepterScore > challengerScore) {
          await this.updateUserScore(challengerName, 'loss')
          await this.updateUserScore(accepterName, 'win')

          winnerText = `${accepterName} has won!`
        } else {
          await this.updateUserScore(challengerName, 'draw')
          await this.updateUserScore(accepterName, 'draw')

          winnerText = "It's a draw!"
        }

        await collectionInteraction.followUp({
          content: `${accepterName} has rolled a ${accepterScore} and ${challengerName} has rolled a ${challengerScore}. ${winnerText}`,
        })
      }
    })
  }

  @Slash('duelstats')
  private async duelStats(interaction: CommandInteraction) {
    await interaction.deferReply()

    const userName = interaction.user.username
    const stats = await this.client.duels.findUnique({
      where: {
        userName: userName,
      },
    })
    if (stats) {
      let statsMessage = []
      if (stats.winStreak > 0) {
        // User is currently on a win streak
        statsMessage = [
          `${userName}: ${stats.wins}-${stats.losses}-${stats.draws}`,
          `Win streak: ${stats.winStreak}`,
          `Best win streak: ${stats.winStreakMax}`,
          `Worst loss streak: ${stats.lossStreakMax}`,
        ]
      } else if (stats.lossStreak > 0) {
        // User is currently on a loss streak
        statsMessage = [
          `${userName}: ${stats.wins}-${stats.losses}-${stats.draws}`,
          `Loss streak: ${stats.lossStreak}`,
          `Best win streak: ${stats.winStreakMax}`,
          `Worst loss streak: ${stats.lossStreakMax}`,
        ]
      } else {
        // User's last duel was a draw which reset both streaks
        statsMessage = [
          `${userName}: ${stats.wins}-${stats.losses}-${stats.draws}`,
          `Your last duel was a draw.`,
          `Best win streak: ${stats.winStreakMax}`,
          `Worst loss streak: ${stats.lossStreakMax}`,
        ]
      }
      await interaction.followUp(statsMessage.join('\n'))
    } else {
      await interaction.followUp(`${userName}, you have never duelled before.`)
    }
  }

  private async updateUserScore(userName: string, outcome: 'win' | 'loss' | 'draw') {
    const user = await this.client.duels.findUnique({
      where: { userName: userName },
    })
    switch (outcome) {
      case 'draw': {
        await this.client.duels.upsert({
          where: {
            userName: userName,
          },
          update: {
            draws: { increment: 1 },
            lossStreak: 0,
            winStreak: 0,
          },
          create: {
            userName: userName,
            draws: 1,
          },
        })
        break
      }
      case 'win': {
        if (user === null) {
          await this.client.duels.create({
            data: {
              userName: userName,
              wins: 1,
              winStreak: 1,
              winStreakMax: 1,
            },
          })
        } else {
          await this.client.duels.update({
            where: {
              userName: userName,
            },
            data: {
              wins: { increment: 1 },
              lossStreak: 0,
              winStreak: { increment: 1 },
              // Increment win streak if it's bigger than the current one
              winStreakMax: user.winStreak + 1 > user.winStreakMax ? user.winStreakMax + 1 : user.winStreakMax,
            },
          })
        }
        break
      }
      default: {
        // loss
        if (user === null) {
          await this.client.duels.create({
            data: {
              userName: userName,
              losses: 1,
              lossStreak: 1,
              lossStreakMax: 1,
              lastLoss: new Date(),
            },
          })
        } else {
          await this.client.duels.update({
            where: {
              userName: userName,
            },
            data: {
              losses: { increment: 1 },
              winStreak: 0,
              lossStreak: { increment: 1 },
              // Increment losss streak if it's bigger than the current one
              lossStreakMax: user.lossStreak + 1 > user.lossStreakMax ? user.lossStreakMax + 1 : user.lossStreakMax,
              lastLoss: new Date(),
            },
          })
        }
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
