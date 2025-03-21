import { Client, Discord, Guard, SimpleCommand, SimpleCommandMessage } from 'discordx'
import { GuildMember } from 'discord.js'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence/index.js'
import { IsSuperUser } from '../../guards/RoleChecks.js'

@Discord()
@injectable()
@Guard(IsSuperUser)
class Pardon {
  public constructor(private client: ORM) {}

  @SimpleCommand({ name: 'pardon' })
  async simplePardon(command: SimpleCommandMessage) {
    let mentionedMember: GuildMember | undefined
    if ((command.message.mentions.members?.size ?? 0) > 0) {
      mentionedMember = command.message.mentions.members?.first()
    }

    if (!mentionedMember) {
      return
    }

    // Remove Guild Timeout if exists
    if (mentionedMember.isCommunicationDisabled()) {
      await mentionedMember.timeout(null)
    }

    await this.client.user.update({
      where: {
        id: mentionedMember.id,
      },
      data: {
        lastLoss: new Date(0),
        lastRandom: new Date(0),
      },
    })

    await this.client.rPGCharacter
      .update({
        where: {
          id: mentionedMember.id,
        },
        data: {
          lastLoss: new Date(0),
        },
      })
      .then(async () => {
        const channel = command.message.channel
        if (channel && channel.isSendable()) {
          channel.send(`${mentionedMember?.nickname ?? mentionedMember?.user.username}, consider your sentence served.`)
        }
      })
  }
}
