import { DiceRoll, Exceptions } from '@dice-roller/rpg-dice-roller'
import { CommandInteraction } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SlashOption, Slash, SimpleCommandOption } from 'discordx'

@Discord()
class Roll {
  @Slash('roll', { description: 'Roll some dice' })
  async slash(
    @SlashOption('dice', { type: 'STRING' })
    @SlashOption('message', { type: 'STRING', required: false })
    dice: string,
    message: string,
    interaction: CommandInteraction
  ) {
    try {
      const roll = new DiceRoll(dice)
      let preamble: string
      if (!message) {
        preamble = ''
      } else {
        preamble = '(' + message + ') '
      }
      await interaction.reply(preamble + roll.toString())
    } catch (e) {
      await interaction.reply({
        content: `I don't understand those dice.\nTake a look here for help: https://dice-roller.github.io/documentation/guide/notation/`,
        ephemeral: true,
      })

      return
    }
  }
}
