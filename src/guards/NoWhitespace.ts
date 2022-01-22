import { ArgsOf, GuardFunction, SimpleCommandMessage } from 'discordx'
import { Message } from 'discord.js'

const hasWhitespace = /^>\s+/i

export const NoWhitespace: GuardFunction<ArgsOf<'messageCreate'> | SimpleCommandMessage> = async (arg, _, next) => {
  const argObj = arg instanceof Array ? arg[0] : arg

  // We found that this could sometimes be null... not 100% sure why/how that happens
  if (!argObj) {
    return
  }

  let message: string
  if (argObj instanceof SimpleCommandMessage) {
    message = argObj.message.content
  } else if (argObj instanceof Message) {
    message = argObj.content
  } else {
    return
  }

  if (!hasWhitespace.test(message)) {
    await next()
  }
}
