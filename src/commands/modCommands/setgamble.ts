import { Discord, Guard, SimpleCommand, SimpleCommandMessage, SimpleCommandOption } from 'discordx'
import { GuildOptions, Prisma } from '../../../prisma/generated/prisma-client-js'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'
import { IsSuperUser } from '../../guards/RoleChecks'

@Discord()
@injectable()
class SetGamble {
  private static guildOptions: GuildOptions

  public constructor(private client: ORM) {}

  @SimpleCommand('gamblechance')
  @Guard(IsSuperUser)
  async simpleGambleChance(
    @SimpleCommandOption('gamblechance')
    gambleChance: number,
    command: SimpleCommandMessage
  ) {
    const guildId = command.message.guildId ?? '-1'
    if (!SetGamble.guildOptions) {
      SetGamble.guildOptions = await this.client.guildOptions.upsert({
        where: { guildId: guildId },
        create: { guildId: guildId },
        update: {},
      })
    }

    if (!isNaN(gambleChance) && gambleChance >= 0) {
      const newChance = new Prisma.Decimal(gambleChance).toDecimalPlaces(2)
      await this.client.guildOptions
        .update({
          where: { guildId: guildId },
          data: { gambleChance: newChance },
        })
        .then((_) => command.message.channel.send(`Gamble chance is now ${newChance}`))
    } else {
      command.message.channel.send(
        `Current gamble chance is: ${SetGamble.guildOptions.gambleChance.toDecimalPlaces(2)}`
      )
    }
  }
}
