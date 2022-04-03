import { User } from 'discord.js'
import { Discord, Permission, SimpleCommand, SimpleCommandMessage, SimpleCommandOption } from 'discordx'
import { SuperUsers } from '../../guards/RoleChecks'

@Discord()
@Permission(false)
@Permission(SuperUsers)
class ReleaseTheEggplant {
  @SimpleCommand('releasetheeggplant', {
    description: 'Release the eggplant on a user of your choosing',
    argSplitter: '\n',
  })
  simple(@SimpleCommandOption('name') name: User, command: SimpleCommandMessage) {
    if (!name) return command.message.reply('usage: ``>releasetheeggplant <user>``')
    const botId = command.message.client.user?.id
    const thisBot = command.message.guild?.members.cache.find((u) => u.id === botId)
    thisBot?.setNickname('🍆🔪')
    command.message.channel
      .send(`I'm coming for you, ${name}!`)
      .then((_) => {
        setTimeout(() => thisBot?.setNickname(null), 5000)
      })
      .catch(console.error)
  }

  // TODO: Lock behind mod permissions
  // @Slash('releasetheeggplant', { description: 'Release the eggplant on a user of your choosing' })
  // async slash(
  //   @SlashOption('name')
  //   name: User,
  //   interaction: CommandInteraction
  // ) {
  //   let botId = interaction.channel?.client.user?.id
  //   let thisBot = interaction.guild?.members.cache.find((u) => u.id === botId)
  //   thisBot?.setNickname('🍆🔪')
  //   interaction
  //     .reply(`I'm coming for you, ${name}!`)
  //     .then((_) => {
  //       setTimeout(() => thisBot?.setNickname(null), 5000)
  //     })
  //     .catch(console.error)
  // }
}
