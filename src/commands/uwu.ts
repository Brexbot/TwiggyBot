import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption } from 'discordx'

export const uwuify = (text: string): string => {
  /* Each pattern is a tuple containing a search pattern and its associated replacement string */
  var patterns: [RegExp,string][] = [
    [ RegExp("r|l", "g"),              "w"     ],
    [ RegExp("R|L", "g"),              "W"     ],
    [ RegExp("n([aeiouAEIOU])", "g"),  "ny$1"  ],
    [ RegExp("N([aeiou])/", "g"),      "Ny$1"  ],
    [ RegExp("N([AEIOU])/", "g"),      "NY$1"  ]
  ]

  /* Iterate over each pattern and replace it in the user input string */
  patterns.forEach(([re, replacement]) => {
    text = text.replaceAll(re, replacement)
  })

  return text
}

@Discord()
class UwU {
  @SimpleCommand('uwu', { description: 'UwUify text', argSplitter: '\n' })
  simple(@SimpleCommandOption('text', { type: 'STRING' }) text: string | undefined, command: SimpleCommandMessage) {
    
    if (!text) {
      return command.sendUsageSyntax()
    }

    command.message.channel.send(uwuify(text))
  }
}
