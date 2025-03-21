import { ApplicationCommandOptionType, ColorResolvable, CommandInteraction, EmbedBuilder } from 'discord.js'
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
} from 'discordx'
import { localiseInput } from 'localisetimemodule'

const embedColors: Array<ColorResolvable> = ['#30cb9c', '#cf3463']
const makeSafeRegEx = /(:\/\/)/g
function makeSafe(text: string): string {
  return text.replace(makeSafeRegEx, '\\$1')
}

@Discord()
class MyTime {
  @SimpleCommand({ name: 'mytime', description: 'Localised times within the provided text', argSplitter: '\t' })
  async simple(
    @SimpleCommandOption({ name: 'text', type: SimpleCommandOptionType.String, description: 'Text containing times' })
    text: string,
    command: SimpleCommandMessage
  ) {
    const localisedInfo = localiseInput(text)

    const channel = command.message.channel
    if (channel && channel.isSendable()) {
      if (localisedInfo[1]) {
        channel.send({ content: makeSafe(localisedInfo[0]) })
      } else {
        channel.send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: 'MyTime',
              })
              .setColor(embedColors[1])
              .setDescription(this.formatError(localisedInfo[0])),
          ],
        })
      }
    }
  }

  @Slash({ name: 'mytime', description: 'Localised times within the provided text' })
  private async slash(
    @SlashOption({
      name: 'text',
      type: ApplicationCommandOptionType.String,
      description: 'Text containing times',
      required: true,
    })
    text: string,
    @SlashOption({
      name: 'mode',
      type: ApplicationCommandOptionType.String,
      description: 'The output mode. One of: tTdDfFR, Default: t',
      required: false,
    })
    mode: string,
    @SlashOption({
      name: 'raw',
      type: ApplicationCommandOptionType.Boolean,
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
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: 'MyTime',
            })
            .setColor(embedColors[1])
            .setDescription(this.formatError(localisedInfo[0])),
        ],
        ephemeral: true,
      })
    }
  }

  private formatError(errorText: string): string {
    switch (errorText) {
      case 'noInput':
        return '🤔 The input seems empty.'
      case 'noTimesDetected':
        return '🤷‍♀️ No times detected in the input.'
      default:
        return '🤯 What did you do?!'
    }
  }
}
