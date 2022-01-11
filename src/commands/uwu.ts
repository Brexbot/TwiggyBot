import { FormattingPatterns } from 'discord-api-types'
import { CommandInteraction, TextBasedChannel, TextChannel } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SlashOption, Slash, SimpleCommandOption } from 'discordx'


@Discord()
class UwU {

  private uwuify(text: string): string {
    
    var pattern_index:number

    /* Each pattern is a tuple containing a search pattern and its associated replacement string */
    var patterns:[RegExp,string][] = [
      [ RegExp("r|l", "g"),              "w"     ],
      [ RegExp("R|L", "g"),              "W"     ],
      [ RegExp("n([aeiouAEIOU])", "g"),  "ny$1"  ],
      [ RegExp("N([aeiou])/", "g"),      "Ny$1"  ],
      [ RegExp("N([AEIOU])/", "g"),      "NY$1"  ]
    ]

    /* Iterate over each pattern and replace it in the user input string */
    for (pattern_index = 0; pattern_index < patterns.length; pattern_index++)
    {
      text = text.replaceAll(patterns[pattern_index][0], patterns[pattern_index][1])
    }

    return text
  }

  @SimpleCommand('uwu', { description: 'UwUify text', argSplitter: '\n' })
  simple(@SimpleCommandOption('text', { type: 'STRING' }) text: string | undefined, command: SimpleCommandMessage) {
    
    if (!text) {
      return command.sendUsageSyntax()
    }

    command.message.channel.send(this.uwuify(text))
  }
}
