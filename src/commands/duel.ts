import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  MessageActionRowComponentBuilder,
  inlineCode,
} from 'discord.js'
import { Discord, Slash, SlashGroup } from 'discordx'
import { injectable } from 'tsyringe'
import { ORM } from '../persistence/ORM.js'

import { Duels } from '../../prisma/generated/prisma-client-js/index.js'
import { ColorRoles } from './roleCommands/changecolor.js'
import { getCallerFromCommand, getGuildAndCallerFromCommand } from '../utils/CommandUtils.js'
import { getGlobalDuelCDRemaining, getTimeLeftInReadableFormat } from '../utils/CooldownUtils.js'
import { shuffleArray } from '../utils/Helpers.js'

@Discord()
@SlashGroup({ name: 'duel', description: 'Duel minigame' })
@SlashGroup('duel')
@injectable()
export class Duel {
  static cooldown = 10 * 60 * 1000 // Cooldown period after loss in milliseconds

  private inProgress = false

  private timeoutDuration = 5 * 60 * 1000 // Time before the duel is declared dead in milliseconds
  private timeout: ReturnType<typeof setTimeout> | null = null

  public constructor(private client: ORM) {}

  @Slash({ name: 'challenge', description: 'Challenge the chat to a duel' })
  private async duel(interaction: CommandInteraction) {
    // Get the challenger from the DB. Create them if they don't exist yet.
    const challengerMember = getCallerFromCommand(interaction)
    const challenger = await this.getUserWithDuelStats(interaction.user.id)
    if (!challenger) {
      await interaction.reply({
        content: 'An unexpected error occurred.',
        ephemeral: true,
        allowedMentions: { repliedUser: false },
      })
      return
    }

    // Check if a duel is currently already going on.
    if (this.inProgress) {
      await interaction.reply({
        content: 'A duel is already in progress.',
        ephemeral: true,
        allowedMentions: { repliedUser: false },
      })
      return
    }

    // check if the challenger has recently lost
    if (challenger.lastLoss.getTime() + Duel.cooldown > Date.now()) {
      await interaction.reply({
        content: `${challengerMember?.user}, you have recently lost a duel. Please wait ${getTimeLeftInReadableFormat(
          challenger.lastLoss,
          Duel.cooldown
        )} before trying again.`,
        ephemeral: true,
        allowedMentions: { repliedUser: false },
      })
      return
    }

    // Are we on global CD?
    // todo MultiGuild: This shouldn't be hardcoded (#Mixu's id)
    const guildId = interaction.guildId
    if (guildId && interaction.channelId !== '340275382093611011') {
      const guildOptions = await this.client.guildOptions.upsert({
        where: { guildId: guildId },
        update: {},
        create: { guildId: guildId },
      })
      const globalCD = getGlobalDuelCDRemaining(guildOptions)
      if (globalCD) {
        await interaction.reply({
          content: `Duels are on cooldown here. Please wait ${globalCD} before trying again.`,
          ephemeral: true,
          allowedMentions: { repliedUser: false },
        })
        return
      }
    }

    this.inProgress = true

    // Disable the duel after a timeout
    this.timeout = setTimeout(async () => {
      // Disable the button
      const button = this.createButton(true)
      const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button)
      await interaction.editReply({
        content: `${challengerMember?.user} failed to find someone to duel.`,
        components: [row],
      })
      this.inProgress = false
    }, this.timeoutDuration)

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(this.createButton(false))
    const message = await interaction.reply({
      content: `${challengerMember?.user} is looking for a duel, press the button to accept.`,
      fetchReply: true,
      components: [row],
    })

    if (!(message instanceof Message)) {
      throw Error('InvalidMessage instance')
    }

    const collector = message.createMessageComponentCollector()
    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()

      // Prevent accepting your own duels and ensure that the acceptor is valid.
      const acceptorMember = getCallerFromCommand(collectionInteraction)
      const acceptor = await this.getUserWithDuelStats(collectionInteraction.user.id)
      if (!acceptor || acceptor.id === challenger.id) {
        return
      }

      // Check if the acceptor has recently lost and can't duel right now. Print their timeout.
      if (acceptor.lastLoss.getTime() + Duel.cooldown > Date.now()) {
        await collectionInteraction.followUp({
          content: `${acceptorMember?.user}, you have recently lost a duel. Please wait ${getTimeLeftInReadableFormat(
            acceptor.lastLoss,
            Duel.cooldown
          )} before trying again.`,
          ephemeral: true,
          allowedMentions: { repliedUser: false },
        })
      } else if (!this.inProgress) {
        // This case is not really supposed to happen because you should not be able to accept a duel after it has expired
        // We are handling this anyways

        // Check if there is no current duel
        await collectionInteraction.followUp({
          content: `Someone beat you to the challenge! (or the duel expired... who knows!). You may issue a new challenge with ${inlineCode(
            '/duel'
          )}.`,
          ephemeral: true,
        })
        // Disable the button
        const button = this.createButton(true)
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button)
        await collectionInteraction.editReply({
          components: [row],
        })
        return
      } else {
        // Set the Duel global CD
        // todo MultiGuild: This shouldn't be hardcoded
        if (guildId && interaction.channelId !== '340275382093611011') {
          await this.client.guildOptions.update({
            where: { guildId: guildId },
            data: { lastDuel: new Date() },
          })
        }

        // Disable duel
        this.inProgress = false
        // Disable the timeout that will change the message
        if (this.timeout) {
          clearTimeout(this.timeout)
        }

        // Disable the button
        const button = this.createButton(true)
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button)
        await collectionInteraction.editReply({
          components: [row],
        })

        // Get and announce the winner
        const accepterScore = this.getRandomScore()
        const challengerScore = this.getRandomScore()
        let winnerText = ''
        if (challengerScore > accepterScore) {
          await this.updateUserScore(challenger.duelStats[0], 'win')
          await this.updateUserScore(acceptor.duelStats[0], 'loss')

          const [guild, member] = getGuildAndCallerFromCommand(collectionInteraction)
          await ColorRoles.setColor('#FFFFFF', member, guild)

          winnerText = `${challengerMember?.user} has won!`
        } else if (accepterScore > challengerScore) {
          await this.updateUserScore(challenger.duelStats[0] as Duels, 'loss')
          await this.updateUserScore(acceptor.duelStats[0], 'win')

          const [guild, member] = getGuildAndCallerFromCommand(interaction)
          await ColorRoles.setColor('#FFFFFF', member, guild)

          winnerText = `${acceptorMember?.user} has won!`
        } else {
          await this.updateUserScore(challenger.duelStats[0] as Duels, 'draw')
          await this.updateUserScore(acceptor.duelStats[0], 'draw')

          const tenMinutesInMillis = 10 * 60 * 1000
          challengerMember?.timeout(tenMinutesInMillis, 'Tied a duel!')
          acceptorMember?.timeout(tenMinutesInMillis, 'Tied a duel!')

          winnerText = "It's a draw! Now go sit in a corner for 10 minutes and think about your actions..."
        }

        await collectionInteraction.editReply({
          content: `${acceptorMember?.user} has rolled a ${accepterScore} and ${challengerMember?.user} has rolled a ${challengerScore}. ${winnerText}`,
        })
      }
    })
  }

  @Slash({ name: 'stats', description: 'Display your duel statistics' })
  private async duelStats(interaction: CommandInteraction) {
    await interaction.deferReply()

    // TODO: Once/If we implement seasons this will need to change from findFirst
    const user = interaction.user
    const stats = await this.client.duels.findFirst({
      where: {
        userId: user.id,
      },
    })

    const member = interaction.member
    if (stats && member instanceof GuildMember) {
      const { wins, winStreak, winStreakMax, losses, lossStreak, lossStreakMax, draws } = stats

      let currentStreak = 'Current streak: '
      if (winStreak > 0) {
        // User is currently on a win streak
        currentStreak += `**${winStreak} ${this.plural(winStreak, 'win')}**`
      } else if (lossStreak > 0) {
        // User is currently on a loss streak
        currentStreak += `**${lossStreak} ${this.plural(lossStreak, 'loss')}**`
      } else if (draws > 0) {
        // User's last duel was a draw which reset both streaks
        currentStreak = 'Your last duel was a draw'
      } else {
        // User has never dueled
        currentStreak = 'You have never dueled before'
      }
      const bestStreak = `Best streak: **${winStreakMax} ${this.plural(winStreakMax, 'win')}**`
      const worstStreak = `Worst streak: **${lossStreakMax} ${this.plural(lossStreakMax, 'loss')}**`

      const statsEmbed = new EmbedBuilder()
        // Color is either the user or Firynth's
        .setColor(member?.displayHexColor ?? '#77618F')
        .setAuthor({
          iconURL: member.user.avatarURL() ?? '',
          name: `${member.nickname ?? member.user.username}'s scoresheet: ${wins}-${losses}-${draws}`,
        })
        .setDescription([currentStreak, bestStreak, worstStreak].join('\n'))

      await interaction.followUp({ embeds: [statsEmbed] })
    } else {
      await interaction.followUp(`${user}, you have never duelled before.`)
    }
  }

  @Slash({ name: 'streaks', description: 'Show the overall duel statistics' })
  private async streaks(interaction: CommandInteraction) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const streakStats = ['winStreakMax', 'lossStreakMax', 'draws', 'losses', 'wins'] as const
    const statFormatter = async (statName: (typeof streakStats)[number], emptyText: string): Promise<string> => {
      let stats = await this.client.$queryRawUnsafe<Duels[]>(
        `SELECT * FROM Duels WHERE ${statName}=(SELECT MAX(${statName}) FROM Duels) AND ${statName} > 0`
      )
      if (stats.length == 0) {
        return emptyText
      }
      let extraMessage = ''
      if (stats.length > 2) {
        // If more than 2 users share the same stat, shuffle the array and only print the first two.
        // The rest will be listed as n other users
        extraMessage = `, and ${stats.length - 2} other user${stats.length - 2 > 1 ? 's' : ''}`
        stats = shuffleArray(stats).slice(0, 2)
      }
      const statHavers = await Promise.all(
        stats.map(async (duel) => {
          const member = await interaction.guild?.members.fetch(duel.userId)
          return member?.nickname ?? member?.user?.username ?? ''
        })
      )

      return `${stats[0][statName]} by ${statHavers.join(', ')}${extraMessage}`
    }

    const statsEmbed = new EmbedBuilder()
      .setColor('#9932CC')
      .setTitle('Duel streaks and stats')
      .addFields(
        {
          name: 'Highest win streak',
          value: await statFormatter('winStreakMax', 'Somehow, nobody has won a duel yet.'),
        },
        {
          name: 'Highest loss streak',
          value: await statFormatter('lossStreakMax', 'Somehow, nobody has lost a duel yet.'),
        },
        {
          name: 'Highest # of draws',
          value: await statFormatter('draws', 'Nobody has had a draw yet, good for them.'),
        },
        { name: 'Highest # of wins', value: await statFormatter('wins', 'Somehow, nobody has won a duel yet.') },
        { name: 'Highest # of losses', value: await statFormatter('losses', 'Somehow, nobody has lost a duel yet.') }
      )

    await interaction.reply({ embeds: [statsEmbed] })
  }

  plural(streak: number, outcome: 'win' | 'loss'): string {
    if (outcome === 'win') {
      return streak === 1 ? 'win' : 'wins'
    } else {
      return streak === 1 ? 'loss' : 'losses'
    }
  }

  private async updateUserScore(stats: Duels, outcome: 'win' | 'loss' | 'draw') {
    switch (outcome) {
      case 'draw': {
        await this.client.duels.update({
          where: {
            id: stats.id,
          },
          data: {
            draws: { increment: 1 },
            lossStreak: 0,
            winStreak: 0,
          },
        })
        break
      }
      case 'win': {
        await this.client.duels.update({
          where: {
            id: stats.id,
          },
          data: {
            wins: { increment: 1 },
            lossStreak: 0,
            winStreak: { increment: 1 },
            // Increment win streak if it's bigger than the current one
            winStreakMax: stats.winStreak + 1 > stats.winStreakMax ? stats.winStreakMax + 1 : stats.winStreakMax,
          },
        })
        break
      }
      default: {
        // loss
        await this.client.duels.update({
          where: {
            id: stats.id,
          },
          data: {
            losses: { increment: 1 },
            winStreak: 0,
            lossStreak: { increment: 1 },
            // Increment losss streak if it's bigger than the current one
            lossStreakMax: stats.lossStreak + 1 > stats.lossStreakMax ? stats.lossStreakMax + 1 : stats.lossStreakMax,
            user: {
              update: {
                lastLoss: new Date(),
              },
            },
          },
        })
      }
    }
  }

  private getRandomScore(): number {
    return Math.floor(Math.random() * 101)
  }

  private createButton(disabled: boolean): ButtonBuilder {
    let button = new ButtonBuilder().setEmoji('🎲').setStyle(ButtonStyle.Primary).setCustomId('duel-btn')
    if (disabled) {
      button = button.setLabel("It's over").setDisabled(true)
    } else {
      button = button.setLabel('Accept duel')
    }
    return button
  }

  private async getUserWithDuelStats(userId: string) {
    // I'm not sure if we can do conditionals to check if no duelStats exist, so I went the verbose route...
    return this.client.user
      .upsert({
        where: {
          id: userId,
        },
        create: {
          id: userId,
          duelStats: {
            create: [{}],
          },
        },
        update: {},
        include: {
          duelStats: true,
        },
      })
      .then(async (user) => {
        if (user.duelStats.length === 0) {
          return this.client.user.update({
            where: {
              id: user.id,
            },
            data: {
              duelStats: {
                create: [{}],
              },
            },
            include: {
              duelStats: true,
            },
          })
        } else {
          return user
        }
      })
  }
}
