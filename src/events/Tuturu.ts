import { AttachmentBuilder, EmbedBuilder } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'
import * as path from 'path'

// Dead trivial message response.
// Looks for "tuturu", posts the image.

@Discord()
abstract class Tuturu {
  private imagePath = path.join(__dirname, '../../src/assets/Tuturu.png')
  private cooldown = 60 // 1 minute
  private lastToot = 0 // Initializes most recent time tuturu was tooted

  @On('messageCreate')
  private onMessage([message]: ArgsOf<'messageCreate'>) {
    if (
      Math.floor(Date.now()) - this.lastToot > this.cooldown * 1000 &&
      message.content.toLowerCase().includes('tuturu')
    ) {
      this.lastToot = Math.floor(Date.now())
      const imageAttachment = new AttachmentBuilder(this.imagePath)
      message.channel.send({ files: imageAttachment ? [imageAttachment] : [] })
    }
  }
}
