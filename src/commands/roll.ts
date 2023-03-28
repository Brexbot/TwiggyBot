import { DiceRoll } from '@dice-roller/rpg-dice-roller'
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js'
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx'
import { getRandomElement } from './RPG/util'

@SlashGroup({ name: 'roll', description: 'Ask the dice for advice' })
@SlashGroup('roll')
@Discord()
class Roll {
  private MAX_REPLY_LENGTH = 200
  private MAX_MESSAGE_LENGTH = 150

  @Slash({ name: 'dice', description: 'Roll some dice' })
  async roll(
    @SlashOption({
      name: 'dice',
      description: 'Type of dice to roll',
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    @SlashOption({
      name: 'message',
      description: 'A message to attach to your roll',
      type: ApplicationCommandOptionType.String,
      required: false,
    })
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

  @Slash({ name: 'cursed', description: 'more 2s = more cursed.' })
  async cursed(interaction: CommandInteraction) {
    await this.roll('999d444', '', interaction)
  }

  @Slash({ name: 'choose', description: 'Let the bot control your life from comma separated choices' })
  async choose(
    @SlashOption({
      name: 'choices',
      description: 'List of comma separated choices',
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    @SlashOption({
      name: 'message',
      description: 'A message to attach to your choices',
      type: ApplicationCommandOptionType.String,
      required: false,
    })
    choices: string,
    message: string,
    interaction: CommandInteraction
  ) {
    if (choices.length == 0) {
      await interaction.reply({ content: "I can't choose from nothing dumbo.", ephemeral: true })
    } else if (choices.length > this.MAX_MESSAGE_LENGTH) {
      await interaction.reply({
        content: `\`choices\` must be < ${this.MAX_MESSAGE_LENGTH} characters.`,
        ephemeral: true,
      })
    } else if (message && message.length > this.MAX_MESSAGE_LENGTH) {
      // Technically this means choices with a message can be 2x MAX_MESSAGE_LENGTH
      await interaction.reply({
        content: `\`message\` must be < ${this.MAX_MESSAGE_LENGTH} characters.`,
        ephemeral: true,
      })
    } else {
      const parts = choices.split(',').map((c) => c.trim())
      if (parts.length == 1) {
        await interaction.reply({
          content: "There's only one choice. Did you remember to separate the choices with commas?",
          ephemeral: true,
        })
        return
      }

      const choice = getRandomElement(parts)

      let listEcho: string
      if (message) {
        listEcho = `${message}: ${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}?`
      } else {
        listEcho = `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}?`
      }

      interaction.reply(listEcho + '\n' + choice.trim())
    }
  }
}
