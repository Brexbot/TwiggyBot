import {
  Discord,
  Guard,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
} from 'discordx'
import { Prisma } from '../../../prisma/generated/prisma-client-js/index.js'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'
import { IsSuperUser } from '../../guards/RoleChecks.js'

@Discord()
@injectable()
@Guard(IsSuperUser)
class SetGamble {
  public constructor(private client: ORM) {}

  @SimpleCommand({ name: 'gamblechance' })
  async simpleGambleChance(
    @SimpleCommandOption({ name: 'gamblechance', description: 'Gample chance', type: SimpleCommandOptionType.String })
    gambleChance: number,
    command: SimpleCommandMessage
  ) {
    const guildId = command.message.guildId ?? '-1'
    if (!isNaN(gambleChance) && gambleChance >= 0) {
      const newChance = new Prisma.Decimal(gambleChance).toDecimalPlaces(2)

      await this.client.guildOptions
        .update({
          where: { guildId: guildId },
          data: { gambleChance: newChance },
        })
        .then(async () => {
          const channel = command.message.channel
          if (channel && channel.isSendable()) {
            channel.send(`Gamble chance is now ${newChance}`)
          }
        })
    } else {
      const guildOptions = await this.client.guildOptions.upsert({
        where: { guildId: guildId },
        create: { guildId: guildId },
        update: {},
      })
      const channel = command.message.channel
      if (channel && channel.isSendable()) {
        channel.send(`Current gamble chance is: ${guildOptions.gambleChance.toDecimalPlaces(2)}`)
      }
    }
  }
}
