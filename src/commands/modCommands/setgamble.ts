import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption } from 'discordx'
import { GuildOptions, Prisma } from '../../../prisma/generated/prisma-client-js'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'

@Discord()
@injectable()
class SetGamble {
  private static modRoles = [
    '103679575694774272', // BRex Mods
    '104750975268483072', // BRex Ultimate Scum
  ]

  private static guildOptions: GuildOptions

  public constructor(private client: ORM) {}

  @SimpleCommand('gamblechance')
  async simpleGambleChance(
    @SimpleCommandOption('gamblechance')
    gambleChance: number,
    command: SimpleCommandMessage
  ) {
    if (!command.message.member?.roles.cache.some((_, id) => SetGamble.modRoles.includes(id)) ?? true) {
      return Promise.reject('Caller was not a mod')
    }

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
