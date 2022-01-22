import { ArgsOf, GuardFunction, SimpleCommandMessage } from 'discordx'

const hasWhitespace = /^>\s+/i

export const NoWhitespace: GuardFunction<ArgsOf<'messageCreate'> | SimpleCommandMessage> = async (arg, _, next) => {
  const argObj = arg instanceof Array ? arg[0] : arg

  let message: string
  if (argObj instanceof SimpleCommandMessage) {
    message = argObj.message.content
  } else {
    message = argObj.content
  }

  if (!hasWhitespace.test(message)) {
    await next()
  }
}
