import {
  ButtonInteraction,
  CommandInteraction,
  EmojiIdentifierResolvable,
  GuildMember,
  Message,
  MessageActionRow,
  MessageButton,
} from 'discord.js'
import { Discord, Slash } from 'discordx'
import { getCallerFromCommand } from '../utils/CommandUtils'

type RPSChoice = 'rock' | 'paper' | 'scissors'

@Discord()
class RPS {
  private generalChannel = '103678524375699456'
  private inProgress = false
  private timeout: ReturnType<typeof setTimeout> | null = null
  private timeoutDuration = 5 * 60 * 1000
  private failMessage = ''

  private challenger: GuildMember | null = null
  private acceptor: GuildMember | null = null
  private interaction: string | null = null

  private plays: { [user_id: string]: RPSChoice } = {}
  private wins_table: Record<RPSChoice, RPSChoice> = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper',
  }

  private clear_game() {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
    this.challenger = null
    this.acceptor = null
    this.interaction = null
    this.plays = {}
    this.timeout = null
    this.inProgress = false
    this.failMessage = ''
  }

  @Slash('rps', { description: 'Play a game of rock paper scissors' })
  async rpsSlash(interaction: CommandInteraction) {
    if (interaction.channelId !== this.generalChannel) {
      await interaction.reply({ content: 'You cannot use that command here', ephemeral: true })
      return
    }

    const challenger = getCallerFromCommand(interaction)
    if (!challenger) {
      await interaction.reply({ content: 'An unexpected error occurred', ephemeral: true })
      return
    }

    if (this.inProgress) {
      await interaction.reply({
        content: 'A duel is already in progress',
        ephemeral: true,
      })
      return
    }

    this.challenger = challenger
    this.interaction = interaction.id
    const button = this.acceptButton('Accept', '💪')
    const row = new MessageActionRow().addComponents(button)
    const message = await interaction.reply({
      content: `${challenger} is looking for a rock paper scissors game, press the button to accept.`,
      fetchReply: true,
      components: [row],
    })

    if (!(message instanceof Message)) {
      console.error('Invalid Message instance')
      this.clear_game()
      return
    }

    this.inProgress = true
    this.failMessage = `${challenger} failed to find someone to duel.`
    this.timeout = setTimeout(async () => {
      await interaction.editReply({
        content: this.failMessage,
        components: [],
      })
      this.clear_game()
    }, this.timeoutDuration)

    // Listen the the accept button being clicked
    const collector = message.createMessageComponentCollector()
    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()

      const acceptor = getCallerFromCommand(collectionInteraction)
      if (!acceptor || acceptor.id === challenger.id) {
        return
      }

      // Game ended just before the button being clicked
      if (!this.inProgress) {
        await collectionInteraction.followUp({
          content: `Someone beat you to the challenge!`,
          ephemeral: true,
        })
        return
      }

      // User accepted the game,
      // send both players a message with the choice buttons
      this.acceptor = acceptor
      // If the timeout ends after here it's because someone hasn't picked an option
      this.failMessage = "One or more of the players hasn't chosen an option fast enough."

      const button = this.acceptButton('In progress...', '⏳', true)
      const row = new MessageActionRow().addComponents(button)
      await collectionInteraction.editReply({
        content: `The rock paper scissors game between ${challenger} and ${acceptor} has started.\nChoose your weapon!`,
        components: [row],
      })

      const optionsRow = new MessageActionRow().addComponents([
        this.choiceButton('Rock', '👊'),
        this.choiceButton('Paper', '✋'),
        this.choiceButton('Scissors', '✌'),
      ])
      const msg = {
        content: 'Choose your weapon',
        components: [optionsRow],
        ephemeral: true,
      }

      const challengerMessage = await interaction.followUp(msg)
      const acceptorMessage = await collectionInteraction.followUp(msg)
      if (!(challengerMessage instanceof Message) || !(acceptorMessage instanceof Message)) {
        console.error('Challenger or Acceptor message is invalid instance')
        this.clear_game()
        return
      }

      const challengerCollector = challengerMessage.createMessageComponentCollector()
      const acceptorCollector = acceptorMessage.createMessageComponentCollector()

      challengerCollector.on('collect', (i: ButtonInteraction) => this.detectChoice(i, interaction))
      acceptorCollector.on('collect', (i: ButtonInteraction) => this.detectChoice(i, interaction))
    })
  }

  acceptButton(label: string, emoji: EmojiIdentifierResolvable, disabled = false): MessageButton {
    return new MessageButton()
      .setCustomId('accept-btn')
      .setLabel(label)
      .setEmoji(emoji)
      .setStyle('PRIMARY')
      .setDisabled(disabled)
  }

  choiceButton(label: string, emoji: EmojiIdentifierResolvable): MessageButton {
    return new MessageButton()
      .setCustomId(label.toLowerCase())
      .setLabel(label)
      .setEmoji(emoji)
      .setStyle('PRIMARY')
      .setDisabled(false)
  }

  async detectChoice(choiceInteraction: ButtonInteraction, interaction: CommandInteraction) {
    // Don't allow choice from something that's not a button or a game that timed out.
    // Trying to reply to the latter crashes the bot
    if (!choiceInteraction.isButton || this.interaction !== interaction.id) {
      return
    }

    await choiceInteraction.deferUpdate()
    this.plays[choiceInteraction.user.id] = choiceInteraction.customId as RPSChoice

    if (!this.challenger || !this.acceptor || !this.plays[this.challenger.id] || !this.plays[this.acceptor.id]) {
      await choiceInteraction.editReply({
        content: `You picked ${choiceInteraction.customId}, waiting for your opponent to reply...`,
        components: [],
      })
      return
    }

    const challengersChoice = this.plays[this.challenger.id]
    const acceptorsChoice = this.plays[this.acceptor.id]

    // Both players have played - decide winner
    let winner: GuildMember | null = null
    if (this.wins_table[challengersChoice] === acceptorsChoice) {
      winner = this.challenger
    }
    if (this.wins_table[acceptorsChoice] === challengersChoice) {
      winner = this.acceptor
    }

    const message = winner
      ? `${this.challenger} shows ${challengersChoice}. ${this.acceptor} shows ${acceptorsChoice}.\n${winner} wins!`
      : `${this.challenger} and ${this.acceptor} both show ${challengersChoice}.\nIt's a tie!`

    await choiceInteraction.editReply({
      content: `You picked ${choiceInteraction.customId}, the match has ended!`,
      components: [],
    })
    await interaction.editReply({ content: message, components: [] })

    // The timeout only gets cleared at the end otherwise if a player
    // dismisses the choose rps message the game will never end
    this.clear_game()
  }
}
