import { AttachmentBuilder } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'
import * as path from 'path'

// Class for simple call/response type things

type CallResponse = {
  call: string
  response?: string
  responseAttachment?: string
  cooldown: number // seconds
  lastUse: number
  caseSensitive: boolean
}

@Discord()
abstract class CallAndResponder {
  // Array of call/response conditions.
  // Note that the order in the array reflects priority.
  // Bot will only respond to one trigger, and that will be the first in the array.
  // Not the first in the message.
  private calls: CallResponse[] = [
    {
      call: 'tuturu',
      responseAttachment: path.join(__dirname, '../../src/assets/Tuturu.png'),
      cooldown: 60,
      lastUse: 0,
      caseSensitive: false,
    },
    {
      call: 'zuzuru',
      responseAttachment: path.join(__dirname, '../../src/assets/Zuzuru.png'),
      cooldown: 60,
      lastUse: 0,
      caseSensitive: false,
    },
  ]

  @On('messageCreate')
  private onMessage([message]: ArgsOf<'messageCreate'>) {
    const prompt = message.content
    const lcPrompt = prompt.toLowerCase()
    for (const call of this.calls) {
      if (
        // Check timeout first
        Math.floor(Date.now()) - call.lastUse > call.cooldown * 1000 &&
        // If caseSensitive look for call exactly
        ((call.caseSensitive && prompt.includes(call.call)) ||
          // Otherwise convert to lowercase and search
          (!call.caseSensitive && lcPrompt.includes(call.call.toLowerCase())))
      ) {
        call.lastUse = Math.floor(Date.now())

        let imageAttachment: AttachmentBuilder[]
        if (call.responseAttachment) {
          imageAttachment = [new AttachmentBuilder(call.responseAttachment)]
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
