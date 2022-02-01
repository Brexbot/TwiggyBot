import { CommandInteraction } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, Slash, SlashOption } from 'discordx'
import { localiseInput } from 'localisetimemodule'

@Discord()
class MyTime {

  @SimpleCommand('mytime', { description: 'Localised times within the provided text' })
  async simple(
    @SimpleCommandOption('text', {
      type: 'STRING',
      description: 'Text containing times',
    })
    text: string,
    @SimpleCommandOption('mode', {
      type: 'STRING',
      description: 'The output mode. One of: tTdDfFR, Default: t',
    })
    mode: string,
    @SimpleCommandOption('raw', {
      type: 'BOOLEAN',
      description: 'Outputs the time in a copy/paste friendly format for discord ',
    })
    raw: boolean,
    command: SimpleCommandMessage
  ) {
    await command.message.reply({content: localiseInput(text, mode, raw), allowedMentions: { repliedUser: false } } )
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
    const localisedTimes = localiseInput(text, mode, raw)
    interaction.reply({ content: localisedTimes, ephemeral: localisedTimes === "🤷" })
  }
}
