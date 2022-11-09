import { AttachmentBuilder, EmbedBuilder } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'
import * as path from 'path'

// Dead trivial message response.
// Looks for "tuturu", posts the image.

@Discord()
abstract class Tuturu {
  private imagePath = path.join(__dirname, '../assets/Tuturu.png')

  @On('messageCreate')
  private onMessage([message]: ArgsOf<'messageCreate'>) {
    if (message.content.toLowerCase().includes('tuturu')) {
      console.log(this.imagePath)
      const imageAttachment = new AttachmentBuilder(this.imagePath)
      message.channel.send({ files: imageAttachment ? [imageAttachment] : [] })
    }
  }
}
