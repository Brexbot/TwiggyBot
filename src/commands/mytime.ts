import { CommandInteraction, MessageEmbed, ColorResolvable } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, SimpleCommandOptionType, Slash, SlashOption } from 'discordx'
import { localiseInput } from 'localisetimemodule'

const embedColors: Array<ColorResolvable> = ["#30cb9c", "#cf3463"]
const makeSafeRegEx = /(:\/\/)/g
function makeSafe(text: string): string {
    return text.replace(makeSafeRegEx, '\\$1')
}

@Discord()
class MyTime {

  @SimpleCommand('mytime', { description: 'Localised times within the provided text', argSplitter: "\t" })
  async simple(
    @SimpleCommandOption('text', {
      type: SimpleCommandOptionType.String,
      description: 'Text containing times',
    })
    text: string,
    command: SimpleCommandMessage
  ) {
    const localisedInfo = localiseInput(text)

    if (localisedInfo[1]) {
      command.message.channel.send({ content: makeSafe(localisedInfo[0]) })
    } else {
      command.message.channel.send({ embeds: [
        new MessageEmbed()
        .setAuthor({
          name: 'MyTime'
        })
        .setColor(embedColors[1])
        .setDescription(this.formatError(localisedInfo[0]))
      ] })
    }
  }

  @Slash('mytime', { description: 'Localised times within the provided text' })
  private async slash(
    @SlashOption('text', {
      type: 'STRING',
      description: 'Text containing times',
    })
    text: string,
    @SlashOption('mode', {
      type: 'STRING',
      description: 'The output mode. One of: tTdDfFR, Default: t',
      required: false,
    })
    mode: string,
    @SlashOption('raw', {
      type: 'BOOLEAN',
      description: 'Outputs the time in a copy/paste friendly format for discord ',
      required: false,
    })
    raw: boolean,
    interaction: CommandInteraction
  ) {
    const localisedInfo = localiseInput(text, mode, raw)

    if (localisedInfo[1]) {
      interaction.reply({ content: makeSafe(localisedInfo[0]) })
    } else {
      interaction.reply({ embeds: [
        new MessageEmbed()
        .setAuthor({
          name: 'MyTime'
        })
        .setColor(embedColors[1])
        .setDescription(this.formatError(localisedInfo[0]))
      ], ephemeral: true })
    }
  }

  private formatError(errorText: string): string {
    switch (errorText) {
      case "noInput":
        return "🤔 The input seems empty."
      case "noTimesDetected":
        return "🤷‍♀️ No times detected in the input."
      default:
        return "🤯 What did you do?!"
    }
  }
}
