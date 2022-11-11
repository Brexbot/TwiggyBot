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
  private calls: CallResponse[] = [
    {
      call: 'tuturu',
      responseAttachment: path.join(__dirname, '../../assets/Tuturu.png'),
      cooldown: 60,
      lastUse: 0,
      caseSensitive: false,
    },
    {
      call: 'zuzuru',
      responseAttachment: path.join(__dirname, '../../assets/Zuzuru.png'),
      cooldown: 60,
      lastUse: 0,
      caseSensitive: false,
    },
  ]

  @On('messageCreate')
  private onMessage([message]: ArgsOf<'messageCreate'>) {
    const prompt = message.content
    const lcPrompt = prompt.toLowerCase()
    this.calls.forEach((call) => {
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
      }
    })
  }
}
