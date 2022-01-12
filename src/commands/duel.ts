import { ButtonInteraction, CommandInteraction, MessageButton, MessageActionRow, Message } from 'discord.js'
import { Discord, Slash } from 'discordx'
import { injectable } from 'tsyringe'
import { ORM } from '../persistence/ORM'


@Discord()
@injectable()
class Duel {
  constructor(private client: ORM) {}

  //private challenger: string|undefined
  // private challengerScore = 0
  private inProgress = false

  private timeout = 10 * 60 // 10 Minutes
  private lastDuel = 0 // Timestamp for last duel
  
  @Slash('duel')
  private async duel(interaction: CommandInteraction) {
    await interaction.deferReply()

    // Get the challenger's details
    const challengerName = interaction.user.username
    let challenger = await this.client.duels.findUnique({
      where: {
        userName: challengerName
      }
    })
    if (!challenger) {
      challenger = await this.client.duels.create({ data: { userName: challengerName }})
    }

    // TODO: check if the challenger has recently lost

    const row = new MessageActionRow().addComponents(this.getButton(false))

    const challengerScore = this.getRandomScore()

    this.inProgress = true

    const message = await interaction.followUp({
      content: `${challengerName} is looking for a duel, press the button to accept.`,
      fetchReply: true,
      components: [row],
    })


    if (!(message instanceof Message)) {
      throw Error("InvalidMessage instance")
    }
    const collector = message.createMessageComponentCollector()
    

    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()

      const accepterName = interaction.member?.user.username
      if(!accepterName) {
        // TODO handle error better
        return
      }
      let accepter = this.client.duels.findUnique({
        where: {
          userName: accepterName
        }
      })

      if(!accepter) {
        accepter = this.client.duels.create({data: { userName: accepterName }})
      }

      // TODO: check if the accepter has recently lost and can't duel right now

      if (this.inProgress && !this.inTimeout()) {
        // Disable duel
        this.inProgress = false
  
        // Disable the button
        const button = this.getButton(true)
        const row = new MessageActionRow().addComponents(button)
        await collectionInteraction.editReply({
            components: [row]
        })

        // Set the last duel time
        this.lastDuel = Math.floor(new Date().getTime() / 1000)

        // Get and announce the winner
        const accepterScore = this.getRandomScore()
        let winnerText = ''
        if (challengerScore > accepterScore) {
          winnerText = `${challenger} has won!`
        } else if (accepterScore > challengerScore) {
          winnerText = `${interaction.member} has won!`
        } else {
          winnerText = "It's a draw!"
        }

        await collectionInteraction.followUp({
          content: `${accepterName} has rolled a ${this.getRandomScore()} and ${challenger} has rolled a ${challengerScore}. ${winnerText}`
        })
      } else if (!this.inProgress || this.inTimeout()) {
        // Disable the button just to be sure
        const button = this.getButton(true)
        const row = new MessageActionRow().addComponents(button)
        await collectionInteraction.editReply({
            components: [row]
        })
        await collectionInteraction.followUp({
          content: 'There is no current duel.'
        })
      }
    })
  }

  private getRandomScore(): number {
    return Math.floor(Math.random() * 100)
  }

  private inTimeout(): boolean {
    return (Math.floor(new Date().getTime() / 1000) - this.lastDuel) < this.timeout
  }
  
  private getButton(disabled: boolean): MessageButton {
    let button = new MessageButton().setEmoji('⚔️').setStyle('PRIMARY').setCustomId('duel-btn')
    if(disabled) {
      button = button.setLabel("It's over").setDisabled(true)
    } else {
      button = button.setLabel('Accept duel')
    }
    return button
  }
}
