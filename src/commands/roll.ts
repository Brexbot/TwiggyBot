import { DiceRoll, Exceptions } from '@dice-roller/rpg-dice-roller'
import { CommandInteraction } from 'discord.js'
import { Discord, SlashOption, Slash } from 'discordx'
import { getRandomElement } from './RPG/util'

@Discord()
class Roll {
  private MAX_REPLY_LENGTH = 200
  private MAX_MESSAGE_LENGTH = 150

  @Slash('roll', { description: 'Roll some dice' })
  async slash(
    @SlashOption('dice', { type: 'STRING' })
    @SlashOption('message', { type: 'STRING', required: false })
    dice: string,
    message: string,
    interaction: CommandInteraction
  ) {
    let roll: DiceRoll
    try {
      roll = new DiceRoll(dice)
    } catch (e) {
      console.log(e)
      await interaction.reply({
        content: `I don't understand those dice.\nTake a look here for help: https://dice-roller.github.io/documentation/guide/notation/`,
        ephemeral: true,
      })
      return
    }
    let preamble: string
    if (!message) {
      preamble = ''
    } else {
      if (message.length > this.MAX_MESSAGE_LENGTH) {
        await interaction.reply({
          content: `Your message must be < ${this.MAX_MESSAGE_LENGTH} characters.`,
          ephemeral: true,
        })
      }
      preamble = '(' + message + ') '
    }

    // The output of roll.rolls is somewhat complicated with the more exotic rolling
    // options. So, just check the message length for simplicity.
    let diceOut = roll.toString()
    if (diceOut.length <= this.MAX_REPLY_LENGTH - preamble.length) {
      diceOut = roll.toString()
    } else {
      diceOut = `${roll.notation}: [Too many to list] = ${roll.total}`
    }
    const final = preamble + diceOut

    if (final.length <= this.MAX_REPLY_LENGTH) {
      await interaction.reply(final)
    } else {
      await interaction.reply({ content: 'The output was too large to send...', ephemeral: true })
    }
  }

  @Slash('choose', { description: 'Let the bot control your life from comma separated choices' })
  async choose(
    @SlashOption('choices', { type: 'STRING' })
    choices: string,
    interaction: CommandInteraction
  ) {
    if (choices.length == 0) {
      await interaction.reply({ content: "I can't choose from nothing dumbo.", ephemeral: true })
    } else if (choices.length > this.MAX_MESSAGE_LENGTH) {
      await interaction.reply({
        content: `\`choices\` must be < ${this.MAX_MESSAGE_LENGTH} characters.`,
        ephemeral: true,
      })
    } else {
      const parts = choices.split(',')
      if (parts.length == 1) {
        await interaction.reply({
          content: "There's only one choice. Did you remember to separate the choices with commas?",
          ephemeral: true,
        })
        return
      }

      const choice = getRandomElement(parts)
      let ostr = ''
      for (const i in parts) {
        if (parseInt(i) != parts.length - 1) {
          ostr += parts[i].trim() + ', '
        } else {
          ostr += 'or ' + parts[i].trim() + '?'
        }
      }
      interaction.reply(ostr + '\n' + choice.trim())
    }
  }
}
