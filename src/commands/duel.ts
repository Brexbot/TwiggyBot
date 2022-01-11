import { ButtonInteraction, CommandInteraction, MessageButton, MessageActionRow, Message } from 'discord.js'
import { ButtonComponent, Discord, Slash } from 'discordx'

@Discord()
class Duel {
  //private challenger: string|undefined
  // private challengerScore = 0
  private active = false

  private timeout = 10 * 60 // 10 Minutes
  private lastDuel = 0 // Timestamp for last duel

  @Slash('duel')
  private async duel(interaction: CommandInteraction) {
    await interaction.deferReply()

    const row = new MessageActionRow().addComponents(this.getButton(false))

    const challenger = interaction.member?.user.username
    const challengerScore = this.getRandomScore()

    this.active = true

    const message = await interaction.followUp({
      content: `${challenger} is looking for a duel, press the button to accept.`,
      fetchReply: true,
      components: [row],
    })


    if (!(message instanceof Message)) {
      throw Error("InvalidMessage instance")
    }
    const collector = message.createMessageComponentCollector()
    

    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()

      if (this.active && !this.inTimeout()) {
        // Disable duel
        this.active = false
  
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
          content: `${interaction.member?.user.username} has rolled a ${this.getRandomScore()} and ${challenger} has rolled a ${challengerScore}. ${winnerText}`
        })
      } else if (!this.active || this.inTimeout()) {
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
