import { AttachmentBuilder } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'
import * as path from 'path'

// Class for simple call/response type things
type CallResponse = {
  expression: RegExp
  response?: string
  responseAttachment?: string
  cooldown: number // seconds
  lastUse: number
}

@Discord()
abstract class CallAndResponder {
  private BasePath = '../../assets'

  // todo: Move these into a json obj and serialize and cache the obj at runtime
  //  Would allow us to add triggers via a mod command should we choose to

  // Array of call/response conditions.
  // Note that the order in the array reflects priority.
  // Bot will only respond to one trigger, and that will be the first in the array.
  // Not the first in the message.
  private calls: CallResponse[] = [
    {
      expression: /\btuturu\b/i,
      responseAttachment: 'Tuturu.png',
      cooldown: 60,
      lastUse: 0,
    },
    {
      expression: /zuzuru/i,
      responseAttachment: 'Zuzuru.png',
      cooldown: 60,
      lastUse: 0,
    },
  ]

  @On({ event: 'messageCreate' })
  private onMessage([message]: ArgsOf<'messageCreate'>) {
    const prompt = message.content
    for (const call of this.calls) {
      if (
        // Message triggers a response?
        call.expression.test(prompt) &&
        // And this response isn't on cooldown
        Math.floor(Date.now()) - call.lastUse > call.cooldown * 1000
      ) {
        call.lastUse = Math.floor(Date.now())

        let imageAttachment: AttachmentBuilder[]
        if (call.responseAttachment) {
          imageAttachment = [new AttachmentBuilder(path.join(__dirname, `${this.BasePath}/${call.responseAttachment}`))]
        } else {
          imageAttachment = []
        }

        message.channel.send({ files: imageAttachment, content: call.response })
        // Don't trigger more replies if multiple triggers are present.
        return
      }
    }
  }
}
