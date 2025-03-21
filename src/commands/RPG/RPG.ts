import { Character } from './Character.js'
import { getEloRankChange, getRandomElement as getRandomElement, roll_dy_x_TimesPick_z } from './util.js'
import { attackTexts, defenceFailureTexts, defenceSuccessTexts, ladderTexts, victoryTexts } from './Dialogue.js'
import { ELO_K } from './Data.js'

import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  MessageActionRowComponentBuilder,
  userMention,
} from 'discord.js'
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx'
import { getCallerFromCommand } from '../../utils/CommandUtils'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence'
import { RPGCharacter } from '../../../prisma/generated/prisma-client-js'
import { getGlobalRPGCDRemaining, getTimeLeftInReadableFormat } from '../../utils/CooldownUtils'

type AttackResult = {
  text: string
  damage: number
}

type FightResult = {
  intro: string
  log: string
  winner?: Character
  loser?: Character
  summary: string
  challenger: Character
  accepter: Character
  messageId: string
  creationTime: number
}

type EloBand = {
  upperBound: number
  icon: string
  name: string
}

type LadderState = {
  top?: RPGCharacter[]
  bottom?: RPGCharacter[]
  wins: RPGCharacter[]
  losses: RPGCharacter[]
}

@Discord()
@SlashGroup({ name: 'rpg', description: 'Channel your inner hero and do battle with others.' })
@SlashGroup('rpg')
@injectable()
export class RPG {
  // CONSTANTS
  static MAX_ROUNDS = 10
  static OUT_WIDTH = 35

  // Array of bands, ordered by upper bound
  static ELO_BANDS: EloBand[] = [
    { upperBound: 700, icon: '🪵', name: 'Wood' },
    { upperBound: 800, icon: '🥉', name: 'Bronze' },
    { upperBound: 900, icon: '🥈', name: 'Silver' },
    { upperBound: 1100, icon: '🥇', name: 'Gold' },
    { upperBound: 1200, icon: '💎', name: 'Diamond' },
    { upperBound: 1300, icon: '🎀', name: 'Master' },
    { upperBound: 999999, icon: '🏆', name: 'Grand Master' },
  ]

  static SUMMARY_BUTTON_ID = 'get-log-button'

  private lastFightResult: FightResult[] = []
  private RESULT_CACHE_TIME = 10 * 60 * 1000

  static cooldown = 10 * 60 * 1000
  private challengeInProgress = false

  private timeoutDuration = 5 * 60 * 1000 // Time before the duel is declared dead in milliseconds
  private timeout: ReturnType<typeof setTimeout> | null = null

  // Combat works with a weak rock-paper-scissors advantage
  // This list defines that,
  // i.e. STR has advantage over DEX and CON.
  advantages: Record<string, string[]> = {
    STR: ['DEX', 'CON'],
    DEX: ['CON', 'INT'],
    CON: ['INT', 'WIS'],
    INT: ['WIS', 'CHR'],
    WIS: ['CHR', 'STR'],
    CHR: ['STR', 'DEX'],
  }

  public constructor(private client: ORM) {}

  // The stat generating code counts these letters and
  // improves the corresponding stat.
  private get_move(attacker: Character, defender: Character): AttackResult {
    // Select the attack and defence stats
    const attackStat: string = getRandomElement(attacker.moveChoices)
    const defenceStat: string = getRandomElement(defender.moveChoices)

    // Advantage grants a re-roll for the roll, so check the
    // rock-paper-scissors advantage list to see if it applies to either
    // Uses unary + to convert false = 0 and true = 1
    const attackRR = +this.advantages[attackStat].includes(defenceStat)
    const defenceRR = +this.advantages[defenceStat].includes(attackStat)

    // Calculate stat modifier as Floor(STAT/2) - 5, as in DnD.
    const attackRoll = roll_dy_x_TimesPick_z(20, 1 + attackRR, 1) + attacker.get_modifier(attackStat)
    const defenceRoll = roll_dy_x_TimesPick_z(20, 1 + defenceRR, 1) + defender.get_modifier(defenceStat)

    // Attacker text is always got by taking a random element from the relevant dict entry
    let text = getRandomElement(attackTexts[attackStat])

    // Attack is resolved simply as whoever rolls highest. Meets-it beats-it, so attacker wins ties
    let damage = 0
    if (attackRoll >= defenceRoll) {
      text += ' ' + getRandomElement(defenceFailureTexts[defenceStat])

      // If the attack is physical type, add strength modifier to damage, otherwise add INT
      // Clamp it to zero to prevent bad stat being too fatal
      let damageMod: number
      if (attackStat in ['STR', 'DEX', 'CON']) {
        damageMod = Math.max(0, attacker.get_modifier('STR'))
      } else {
        damageMod = Math.max(0, attacker.get_modifier('INT'))
      }
      damage = roll_dy_x_TimesPick_z(10, 1, 1) + damageMod
    } else {
      text += ' ' + getRandomElement(defenceSuccessTexts[defenceStat])
      damage = 0
    }

    return { damage: damage, text: text }
  }

  private runRPGFight(challenger: Character, accepter: Character, messageId: string): FightResult {
    // Full driver function that runs the battle.
    // Supply with two Characters, returns the result and log text.

    // Prepare the headers for the printout
    const header_1 = challenger.toString().split('\n')
    const header_2 = accepter.toString().split('\n')

    // Format it for vertical output.
    let intro = '```'

    for (let i = 1; i < header_1.length - 1; i++) {
      intro += header_1[i].padEnd(RPG.OUT_WIDTH, ' ') + '\n'
    }

    intro +=
      '\n' + '+-------+'.padStart(Math.floor(RPG.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(RPG.OUT_WIDTH / 2), ' ') + '\n'
    intro += '|  vs.  |'.padStart(Math.floor(RPG.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(RPG.OUT_WIDTH / 2), ' ') + '\n'
    intro += '+-------+'.padStart(Math.floor(RPG.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(RPG.OUT_WIDTH / 2), ' ') + '\n\n'

    for (let i = 1; i < header_2.length - 1; i++) {
      intro += header_2[i].padEnd(RPG.OUT_WIDTH, ' ') + '\n'
    }
    intro += '```\n'

    // Loop through until one stat block is out of HP, or 10 rounds are done.
    let log = ''
    let rounds = 0
    while (challenger.hp > 0 && accepter.hp > 0 && rounds < RPG.MAX_ROUNDS) {
      const initative_1 =
        roll_dy_x_TimesPick_z(20, 1, 1) + challenger.get_modifier('DEX') - accepter.get_modifier('CHR')
      const initative_2 =
        roll_dy_x_TimesPick_z(20, 1, 1) + accepter.get_modifier('DEX') - challenger.get_modifier('CHR')

      // name 2 has a slight advantageby winning draws, eh, who cares?
      const order = initative_1 > initative_2 ? [challenger, accepter] : [accepter, challenger]

      // get the move and perform them in order of initiative
      for (let i = 0; i < 2; i++) {
        const attacker = order[i]
        const defender = order[(i + 1) % 2]
        const res = this.get_move(attacker, defender)

        // negative hitpoints look strange, so clamp to zero for aesthetics
        defender.hp = Math.max(0, defender.hp - res.damage)

        res.text =
          '▪ ' +
          res.text
            .replace(/DEF/g, `**${defender.nickname ?? defender.user.username}**[${defender.hp}]`)
            .replace(/ATK/g, `**${attacker.nickname ?? attacker.user.username}**[${attacker.hp}]`)
            .replace(/DMG/g, res.damage.toString())

        log += res.text + '\n'

        // Stop immediately if someone is reduced to 0 HP, even if there are attacks still to resolve in this round.
        if (defender.hp <= 0) {
          break
        }
      }
      rounds += 1
    }

    let victor, loser: Character
    // Append the summary text to the log
    if (challenger.hp <= 0) {
      victor = accepter
      loser = challenger
    } else if (accepter.hp <= 0) {
      victor = challenger
      loser = accepter
    } else {
      // Must be a draw. Leave victor and loser undefined.
      const summary = `After ${RPG.MAX_ROUNDS} rounds they decide to call it a draw.`
      return {
        intro: intro,
        log: log,
        summary: summary,
        challenger: challenger,
        accepter: accepter,
        messageId: messageId,
        creationTime: Date.now(),
      }
    }

    log += '\n\n'
    let textList: string[]
    if (victor.hp == victor.maxHp) {
      textList = victoryTexts['PERFECT']
    } else if (victor.hp < 5) {
      textList = victoryTexts['CLOSE']
    } else {
      textList = victoryTexts['STANDARD']
    }
    const summary: string = getRandomElement(textList)
      .replace(/VICTOR/g, `**${victor.nickname ?? victor.user.username}**`)
      .replace(/LOSER/g, `**${loser.nickname ?? loser.user.username}**`)
    log += summary

    const result = {
      intro: intro,
      log: log,
      winner: victor,
      loser: loser,
      summary: summary,
      challenger: challenger,
      accepter: accepter,
      messageId: messageId,
      creationTime: Date.now(),
    }

    return result
  }

  @Slash({ name: 'character', description: 'Show off your character sheet' })
  async character(
    @SlashOption({
      name: 'name',
      description: 'Name of the character',
      type: ApplicationCommandOptionType.String,
      required: false,
    })
    name: string,
    @SlashOption({
      name: 'silent',
      description: 'Whether to show the message only for you',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    })
    silent = true,
    interaction: CommandInteraction
  ) {
    const callerMember = getCallerFromCommand(interaction)
    const callingUser = callerMember?.user
    if (callingUser) {
      if (name) {
        if (name.length >= 256) {
          interaction.reply({ content: 'Name must be fewer than 256 characters', ephemeral: true })
          return
        }
        const character = new Character(callingUser, name, name)
        interaction.reply({ embeds: [character.toEmbed('')], ephemeral: silent })
      } else {
        const userDBRecord = await this.getUserFromDB(callerMember.user.id)
        const eloBandIcon = this.getBandForEloRank(userDBRecord.eloRank)
        const character = new Character(
          callingUser,
          callerMember.nickname ?? callerMember.user.username,
          callerMember.nickname ?? undefined
        )
        interaction.reply({ embeds: [character.toEmbed(eloBandIcon.icon)], ephemeral: silent })
      }
    } else {
      interaction.reply({ content: 'Username undefined', ephemeral: true })
    }
  }

  @Slash({ name: 'stats', description: 'Display your fight statistics' })
  async stats(
    @SlashOption({
      name: 'silent',
      description: 'Whether to show the message only for you',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    })
    silent = true,
    interaction: CommandInteraction
  ) {
    // await interaction.deferReply()

    const callerMember = interaction.member
    if (callerMember && callerMember instanceof GuildMember) {
      const callerDBRecord = await this.getUserFromDB(callerMember.user.id)
      const eloBand = this.getBandForEloRank(callerDBRecord.eloRank)
      const statsEmbed = new EmbedBuilder()
        .setColor('#009933') // Could dig out the user's colour?
        .setAuthor({
          iconURL: callerMember.user.avatarURL() ?? '',
          name: `${callerMember.nickname ?? callerMember.user.username}'s prowess in the arena: ${
            callerDBRecord.wins
          }W ${callerDBRecord.losses}L ${callerDBRecord.draws}D`,
        })
        .setDescription(
          `**Current Points:** ${callerDBRecord.eloRank} - ${eloBand.icon} *${eloBand.name} League*\n
          **Peak Rank:** ${callerDBRecord.peakElo}${this.getBandForEloRank(callerDBRecord.peakElo).icon}\n
          **Lowest Rank:** ${callerDBRecord.floorElo}${this.getBandForEloRank(callerDBRecord.floorElo).icon}`
        )
      await interaction.reply({ embeds: [statsEmbed], ephemeral: silent })
    } else {
      await interaction.reply({
        content: `Hmm, ${interaction.user}... It seems you are yet to test your steel.`,
        ephemeral: true,
      })
    }
  }

  @Slash({ name: 'ladder', description: 'Who is the strongest chatter around?' })
  async ladder(
    @SlashOption({
      name: 'silent',
      description: 'Whether to show the message only for you',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    })
    silent = true,
    interaction: CommandInteraction
  ) {
    const getLadderStats = async (): Promise<LadderState> => {
      const top = await this.client.$queryRawUnsafe<RPGCharacter[]>(
        `SELECT * FROM RPGCharacter WHERE eloRank=(SELECT MAX(eloRank) FROM RPGCharacter)`
      )
      const bottom = await this.client.$queryRawUnsafe<RPGCharacter[]>(
        `SELECT * FROM RPGCharacter WHERE eloRank=(SELECT MIN(eloRank) FROM RPGCharacter)`
      )
      const wins = await this.client.$queryRawUnsafe<RPGCharacter[]>(
        `SELECT * FROM RPGCharacter WHERE wins=(SELECT MAX(wins) FROM RPGCharacter)`
      )
      const losses = await this.client.$queryRawUnsafe<RPGCharacter[]>(
        `SELECT * FROM RPGCharacter WHERE losses=(SELECT MAX(losses) FROM RPGCharacter)`
      )
      if (top.length == 0 || bottom.length == 0) {
        return { wins: wins, losses: losses }
      } else {
        return { top: top, bottom: bottom, wins: wins, losses: losses }
      }
    }

    const processPotentiallyPluralResults = (
      characters: RPGCharacter[],
      position: 'TOP' | 'BOTTOM' | 'WINS' | 'LOSS'
    ): string => {
      let leader: RPGCharacter
      if (characters.length > 1) {
        leader = getRandomElement(characters)
      } else {
        leader = characters[0]
      }

      const score = { TOP: leader.eloRank, BOTTOM: leader.eloRank, WINS: leader.wins, LOSS: leader.losses }[position]
      const suffix = { TOP: 'LP', BOTTOM: 'LP', WINS: 'wins', LOSS: 'losses' }[position]

      if (characters.length > 1) {
        return `${userMention(leader.id)} and ${characters.length - 1} others ${getRandomElement(
          ladderTexts[position + '_PLURAL']
        )} with ${score} ${suffix}.`
      } else {
        return `${userMention(leader.id)} ${getRandomElement(ladderTexts[position])} with ${score} ${suffix}.`
      }
    }

    const results = await getLadderStats()
    const ladderEmbed = new EmbedBuilder().setColor('#009933').setTitle('The State of the Ladder')

    if (results.top) {
      ladderEmbed.addFields({ name: 'Top', value: processPotentiallyPluralResults(results.top, 'TOP') })
    } else {
      interaction.reply({ content: 'The arena is clean. No violence has happened yet.', ephemeral: true })
      return
    }
    if (results.bottom) {
      ladderEmbed.addFields({ name: 'Tail', value: processPotentiallyPluralResults(results.bottom, 'BOTTOM') })
    }
    ladderEmbed.addFields(
      { name: 'Wins', value: processPotentiallyPluralResults(results.wins, 'WINS') },
      { name: 'Losses', value: processPotentiallyPluralResults(results.losses, 'LOSS') }
    )
    interaction.reply({ embeds: [ladderEmbed], ephemeral: silent })
  }

  @Slash({ name: 'duel', description: 'Challenge other chatters and prove your strength.' })
  async challenge(interaction: CommandInteraction) {
    // await interaction.deferReply()

    // Check if a duel is currently already going on.
    if (this.challengeInProgress) {
      await interaction.reply({
        content: 'An RPG duel is already in progress.',
        ephemeral: true,
      })
      return
    }

    // Create Character for challenger. Later store character in DB, for now re-generate each time.
    const challengerUser = getCallerFromCommand(interaction)
    let challenger: Character
    let challengerDBRecord: RPGCharacter
    if (!challengerUser) {
      // If this hasn't worked. Bail out now.
      await interaction.reply({
        content: 'Challenger user undefined',
        ephemeral: true,
      })
      return
    } else {
      challengerDBRecord = await this.getUserFromDB(challengerUser.user.id)
      challenger = new Character(
        challengerUser.user,
        challengerUser.nickname ?? challengerUser.user.username,
        challengerUser.nickname ?? undefined
      )
    }

    // Check to see if the challenger has recently lost.
    if (challengerDBRecord.lastLoss.getTime() + RPG.cooldown > Date.now()) {
      await interaction.reply({
        content: `**${
          challenger.nickname ?? challengerUser.user.username
        }**, you are still recovering from the last fight. Please wait ${getTimeLeftInReadableFormat(
          challengerDBRecord.lastLoss,
          RPG.cooldown
        )} before trying again.`,
        ephemeral: true,
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
      const globalCD = getGlobalRPGCDRemaining(guildOptions)
      if (globalCD) {
        await interaction.reply({
          content: `RPG Duels are on cooldown here. Please wait ${globalCD} before trying again.`,
          ephemeral: true,
          allowedMentions: { repliedUser: false },
        })
        return
      }
    }

    // Checks passed, flag that we have a fight on our hands!
    this.challengeInProgress = true

    // Get information about the challenger's Elo band for printing
    const challengerEloBand = this.getBandForEloRank(challengerDBRecord.eloRank)

    // Disable the duel after a timeout
    this.timeout = setTimeout(async () => {
      // Disable the button
      const button = new ButtonBuilder()
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('rpg-btn')
        .setLabel('Accept challenge')
        .setDisabled(true)
      const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button)
      await interaction.editReply({
        content: `No one was brave enough to do battle with **${
          challengerUser.nickname ?? challengerUser.user.username
        }**${challengerEloBand.icon}.`,
        components: [row],
      })

      this.challengeInProgress = false
    }, this.timeoutDuration)

    // Send the challenge message
    const button = new ButtonBuilder()
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Primary)
      .setCustomId('rpg-btn')
      .setLabel('Accept challenge')
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button)
    const message = await interaction.reply({
      content: `**${challengerUser.nickname ?? challengerUser.user.username}**${
        challengerEloBand.icon
      } is throwing down the gauntlet in challenge.`,
      fetchReply: true,
      components: [row],
    })

    if (!(message instanceof Message)) {
      // Something has gone very wrong.
      await interaction.followUp({
        content: "`message` isn't a `Message`. Foul play is afoot...",
      })
      return
    }

    // Handle the button press
    const collector = message.createMessageComponentCollector()
    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()
      const messageId = collectionInteraction.message.id

      // Two possible cases exist:
      //   Someone is accepting a challenge
      //   or Someone want's to see the fight log

      // Intercept if this is someone requesting a log of the fight
      if (collectionInteraction.customId === RPG.SUMMARY_BUTTON_ID) {
        // Try to get the fight corresponding to this button message.
        const fightFromId = this.getFightResultForId(messageId)

        // Completing a fight populates the lastFightResult property
        if (fightFromId) {
          // We must check the output isn't longer than discord allows,
          // otherwise send as two messages, or embed as a file as a last resort.
          const full = `${fightFromId.intro}\n${fightFromId.log}`
          if (full.length <= 2000) {
            await collectionInteraction.followUp({
              content: full,
              ephemeral: true,
            })
          } else if (fightFromId.intro.length <= 2000 && fightFromId.log.length <= 2000) {
            await collectionInteraction.followUp({
              content: fightFromId.intro,
              ephemeral: true,
            })
            await collectionInteraction.followUp({
              content: fightFromId.log,
              ephemeral: true,
            })
          } else {
            // Prepare the file output by replacing the user strings with screen names
            let output = fightFromId.intro.replaceAll('```', '')
            output += fightFromId.log

            output = output.replaceAll('**', '')

            await collectionInteraction.followUp({
              content: 'Phew! That was a long fight! The bards had to write it to a file.',
              ephemeral: true,
              files: [new AttachmentBuilder(Buffer.from(output)).setName('results.txt')],
            })
          }
        } else {
          // ther wasn't a previous fight. Error out gracefully.
          await collectionInteraction.followUp({
            content: 'Looks like the record of the fight is lost to time. Or maybe it never happened...',
            ephemeral: true,
          })
        }
        return
      }

      // Prevent the challenger accepting their own duels and ensure that the acceptor is valid.
      // Create Character for challenger. Later use DB, for now re-generate each time.
      const accepterUser = getCallerFromCommand(collectionInteraction)
      let accepter: Character
      let accepterDBRecord: RPGCharacter
      if (!accepterUser) {
        await collectionInteraction.followUp({
          content: 'Accepter username undefined',
          ephemeral: true,
        })
        return
      } else {
        accepter = new Character(
          accepterUser.user,
          accepterUser.nickname ?? accepterUser.user.username,
          accepterUser.nickname ?? undefined
        )
        accepterDBRecord = await this.getUserFromDB(accepterUser.user.id)
      }

      // Prevent challenger from accepting their own duels, and ensure both are valid.
      if (!accepter || !challenger || accepter.user == challenger.user || !accepterDBRecord || !challengerDBRecord) {
        return
      }

      // Check to see if the accepter has recently lost.
      if (accepterDBRecord.lastLoss.getTime() + RPG.cooldown > Date.now()) {
        await collectionInteraction.followUp({
          content: `**${
            accepterUser.nickname ?? accepterUser.user.username
          }**, you have recently lost a fight. Please wait ${getTimeLeftInReadableFormat(
            accepterDBRecord.lastLoss,
            RPG.cooldown
          )} before trying again.`,
          ephemeral: true,
        })
        return
      } else if (!this.challengeInProgress) {
        // If we got here, that means the duel has already started and we were too late to press the button
        await collectionInteraction.followUp({
          content: 'Someone grabbed the gauntlet before you could! (or the challenger wandered off)',
          ephemeral: true,
        })
        return
      } else {
        // Set the RPG global CD
        // todo MultiGuild: This shouldn't be hardcoded
        if (guildId && interaction.channelId !== '340275382093611011') {
          await this.client.guildOptions.update({
            where: { guildId: guildId },
            data: { lastRPG: new Date() },
          })
        }

        // Disable duel
        this.challengeInProgress = false
        if (this.timeout) {
          clearTimeout(this.timeout)
        }

        // Disable the button
        const button = new ButtonBuilder()
          .setEmoji('⚔️')
          .setStyle(ButtonStyle.Primary)
          .setCustomId('rpg-btn')
          .setLabel('Accept challenge')
          .setDisabled(true)
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button)
        await collectionInteraction.editReply({
          components: [row],
        })

        // Now do the actual duel.
        const fightResult = this.runRPGFight(challenger, accepter, messageId)
        this.lastFightResult.push(fightResult)

        const challengerOldEloRank = challengerDBRecord.eloRank
        const accepterOldEloRank = accepterDBRecord.eloRank

        let challengerNewEloRank: number
        let accepterNewEloRank: number

        if (fightResult.winner && fightResult.loser) {
          // Wasn't a draw, find the winner and update
          challengerNewEloRank = await this.updateUserRPGScore(
            challengerDBRecord,
            accepterOldEloRank,
            fightResult.winner === challenger ? 'win' : 'loss'
          )
          accepterNewEloRank = await this.updateUserRPGScore(
            accepterDBRecord,
            challengerOldEloRank,
            fightResult.winner === challenger ? 'loss' : 'win'
          )
        } else {
          // Must be a draw
          challengerNewEloRank = await this.updateUserRPGScore(challengerDBRecord, accepterOldEloRank, 'draw')
          accepterNewEloRank = await this.updateUserRPGScore(accepterDBRecord, challengerOldEloRank, 'draw')
        }

        const challengerEloChange = challengerNewEloRank - challengerOldEloRank
        const accepterEloChange = accepterNewEloRank - accepterOldEloRank

        const challengerEloVerb = challengerEloChange < 0 ? `lost` : `gained`
        const accepterEloVerb = accepterEloChange < 0 ? `lost` : `gained`

        const challengerEloBand = this.getBandForEloRank(challengerNewEloRank)
        const accepterEloBand = this.getBandForEloRank(accepterNewEloRank)

        // Prepare the buttons.
        const logButton = new ButtonBuilder()
          .setEmoji('📜')
          .setLabel('See fight!')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(RPG.SUMMARY_BUTTON_ID)
        await collectionInteraction.editReply({
          components: [new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(logButton)],
        })

        // Finally, send the reply
        await collectionInteraction.editReply({
          content:
            `${fightResult.summary}` +
            `\n**${challenger.nickname ?? challenger.user.username}**${
              challengerEloBand.icon
            } ${challengerEloVerb} ${Math.abs(challengerEloChange)}LP [${challengerNewEloRank}]. ` +
            `**${accepter.nickname ?? accepter.user.username}**${accepterEloBand.icon} ${accepterEloVerb} ${Math.abs(
              accepterEloChange
            )}LP [${accepterNewEloRank}]`,
        })
      }
    })
  }

  private async getUserFromDB(userId: string) {
    return await this.client.rPGCharacter.upsert({
      where: {
        id: userId,
      },
      create: {
        id: userId,
      },
      update: {},
    })
  }

  private async updateUserRPGScore(stats: RPGCharacter, opositionEloRank: number, outcome: 'win' | 'loss' | 'draw') {
    const newEloRank = getEloRankChange(stats.eloRank, opositionEloRank, ELO_K, outcome)
    switch (outcome) {
      case 'draw': {
        await this.client.rPGCharacter.update({
          where: {
            id: stats.id,
          },
          data: {
            draws: { increment: 1 },
            eloRank: newEloRank,
            peakElo: Math.max(stats.peakElo, newEloRank),
            floorElo: Math.min(stats.floorElo, newEloRank),
          },
        })
        break
      }
      case 'win': {
        await this.client.rPGCharacter.update({
          where: {
            id: stats.id,
          },
          data: {
            wins: { increment: 1 },
            eloRank: newEloRank,
            peakElo: Math.max(stats.peakElo, newEloRank),
            floorElo: Math.min(stats.floorElo, newEloRank),
          },
        })
        break
      }
      case 'loss': {
        await this.client.rPGCharacter.update({
          where: {
            id: stats.id,
          },
          data: {
            losses: { increment: 1 },
            eloRank: newEloRank,
            peakElo: Math.max(stats.peakElo, newEloRank),
            floorElo: Math.min(stats.floorElo, newEloRank),
            lastLoss: new Date(),
          },
        })
        break
      }
    }
    return newEloRank
  }

  private getBandForEloRank(rank: number): EloBand {
    for (let i = 0; i < RPG.ELO_BANDS.length; i++) {
      if (RPG.ELO_BANDS[i].upperBound > rank) {
        return RPG.ELO_BANDS[i]
      }
    }
    // We shouldn't get this far, but if someone does top out the ranking system
    // beyond the 999999 limit, they're almost certainly up to some tomfoolery.
    return { upperBound: -1, icon: '😎', name: 'Very Cool Hacker' }
  }

  private getFightResultForId(messageId: string): FightResult | null {
    const time = Date.now()

    // First remove expired fights from the cache
    this.lastFightResult = this.lastFightResult.filter((result) => time - result.creationTime < this.RESULT_CACHE_TIME)

    if (this.lastFightResult.length == 0) {
      return null
    } else {
      for (let i = 0; i < this.lastFightResult.length; i++) {
        if (this.lastFightResult[i].messageId == messageId) {
          return this.lastFightResult[i]
        }
      }
    }
    // We failed to find the messageId in the cache
    return null
  }
}
