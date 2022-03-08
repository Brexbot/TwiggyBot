import { Character } from './Character'
import { getRandomElement as getRandomElement, roll_dy_x_TimesPick_z } from './util'
import { attackTexts, defenceFailureTexts, defenceSuccessTexts, victoryTexts } from './Dialogue'

import {
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  Message,
  ButtonInteraction,
  MessageAttachment,
} from 'discord.js'
import { Discord, Slash } from 'discordx'
import { getCallerFromCommand } from '../../utils/CommandUtils'
import { injectable } from 'tsyringe'
import { ORM } from '../../persistence/ORM'
import { RPGCharacter } from '../../../prisma/generated/prisma-client-js'
import { getTimeLeftInReadableFormat } from '../../utils/CooldownUtils'

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
}

@Discord()
@injectable()
export class RPG {
  // CONSTANTS
  static MAX_ROUNDS = 10
  static OUT_WIDTH = 35

  static SUMMARY_BUTTON_ID = 'get-log-button'

  private lastFightResult?: FightResult

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
    const attackRoll = roll_dy_x_TimesPick_z(20, 1 + attackRR, 1) + Math.floor(attacker.stats[attackStat] / 2) - 5
    const defenceRoll = roll_dy_x_TimesPick_z(20, 1 + defenceRR, 1) + Math.floor(defender.stats[defenceStat] / 2) - 5

    // Attacker text is always got by taking a random element from the relevant dict entry
    let text = getRandomElement(attackTexts[attackStat])

    // Attack is resolved simply as whoever rolls highest. Meets-it beats-it, so attacker wins ties
    let damage = 0
    if (attackRoll >= defenceRoll) {
      text += ' ' + getRandomElement(defenceFailureTexts[defenceStat])
      damage = roll_dy_x_TimesPick_z(10, 1, 1)
    } else {
      text += ' ' + getRandomElement(defenceSuccessTexts[defenceStat])
      damage = 0
    }

    return { damage: damage, text: text }
  }

  private runRPGFight(challenger: Character, accepter: Character): FightResult {
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

    let log = ''
    // Loop through until one stat block is out of HP, or 20 rounds are done.
    let rounds = 0
    while (challenger.hp > 0 && accepter.hp > 0 && rounds < RPG.MAX_ROUNDS) {
      const initative_1 = roll_dy_x_TimesPick_z(20, 1, 1) + Math.floor(challenger.stats['DEX'] / 2) - 5
      const initative_2 = roll_dy_x_TimesPick_z(20, 1, 1) + Math.floor(accepter.stats['DEX'] / 2) - 5

      // name 2 has a slight advantage, eh, who cares?
      const order = initative_1 > initative_2 ? [challenger, accepter] : [accepter, challenger]

      for (let i = 0; i < 2; i++) {
        const attacker = order[i]
        const defender = order[(i + 1) % 2]
        const res = this.get_move(attacker, defender)

        defender.hp = Math.max(0, defender.hp - res.damage)

        res.text =
          '▪ ' +
          res.text
            .replace(/DEF/g, `${defender.user}[${defender.hp}]`)
            .replace(/ATK/g, `${attacker.user}[${attacker.hp}]`)
            .replace(/DMG/g, res.damage.toString())

        log += res.text + '\n'

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
      const summary = `After ${RPG.MAX_ROUNDS} rounds they decide to call it a draw.`
      return { intro: intro, log: log, summary: summary, challenger: challenger, accepter: accepter }
    }

    log += '\n\n'
    const summary: string = getRandomElement(victoryTexts)
      .replace(/VICTOR/g, `${victor.user}`)
      .replace(/LOSER/g, `${loser.user}`)
    log += summary

    const result = {
      intro: intro,
      log: log,
      winner: victor,
      loser: loser,
      summary: summary,
      challenger: challenger,
      accepter: accepter,
    }

    return result
  }

  @Slash('rpg_character', { description: 'Print your character sheet' })
  async rpgCharacter(interaction: CommandInteraction) {
    const callerMember = getCallerFromCommand(interaction)

    const callingUser = callerMember?.user

    if (!callingUser) {
      interaction.reply('Username undefined')
    } else {
      const character = new Character(callingUser)
      interaction.reply({ embeds: [character.toEmbed()] })
      console.log((await this.getUserCharacter(callingUser.id)).wins)
    }
  }

  @Slash('rpg_challenge')
  private async rpg_challenge(interaction: CommandInteraction) {
    await interaction.deferReply()

    // Create Character for challenger. Later use DB, for now re-generate each time.
    const challengerUser = getCallerFromCommand(interaction)?.user
    let challenger: Character
    let challengerDBRecord: RPGCharacter
    if (!challengerUser) {
      // If this hasn't worked. Bail out now.
      await interaction.followUp({
        content: 'Challenger user undefined',
        ephemeral: true,
      })
      return
    } else {
      challengerDBRecord = await this.getUserCharacter(challengerUser.id)
      challenger = new Character(challengerUser)
    }

    // Check if a duel is currently already going on.
    if (this.challengeInProgress) {
      await interaction.followUp({
        content: 'An RPG challenge is already in progress.',
        ephemeral: true,
      })
      return
    }

    // Check to see if the challenger has recently lost.
    if (challengerDBRecord.lastLoss.getTime() + RPG.cooldown > Date.now()) {
      await interaction.followUp({
        content: `${challenger.user}, you have recently lost a fight. Please wait ${getTimeLeftInReadableFormat(
          challengerDBRecord.lastLoss,
          RPG.cooldown
        )} before trying again.`,
        ephemeral: true,
      })
      return
    }
    this.challengeInProgress = true

    // Disable the duel after a timeout
    this.timeout = setTimeout(async () => {
      // Disable the button
      const button = this.createButton(true)
      const row = new MessageActionRow().addComponents(button)
      await interaction.editReply({
        content: `No one was brave enough to do battle with ${challengerUser}.`,
        components: [row],
      })
      this.challengeInProgress = false
    }, this.timeoutDuration)

    const row = new MessageActionRow().addComponents(this.createButton(false))
    const message = await interaction.followUp({
      content: `${challengerUser} is throwing down the gauntlet in challenge.`,
      fetchReply: true,
      components: [row],
    })

    if (!(message instanceof Message)) {
      throw Error('InvalidMessage instance')
    }

    const collector = message.createMessageComponentCollector()
    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()

      // Intercept if this is someone requesting a log of the fight
      if (collectionInteraction.customId === RPG.SUMMARY_BUTTON_ID) {
        // Currently this gets the most recent fight.
        // Could cache by collectionInteraction.message.id and store a record of them
        if (this.lastFightResult) {
          // We must check the output isn't longer than discord allows,
          // otherwise send as two messages, or embed as a file in last resort.
          const full = `${this.lastFightResult.intro}\n${this.lastFightResult.log}`
          if (full.length <= 2000) {
            await collectionInteraction.followUp({
              content: full,
              ephemeral: true,
            })
          } else if (this.lastFightResult.intro.length <= 2000 && this.lastFightResult.log.length <= 2000) {
            await collectionInteraction.followUp({
              content: this.lastFightResult.intro,
              ephemeral: true,
            })
            await collectionInteraction.followUp({
              content: this.lastFightResult.log,
              ephemeral: true,
            })
          } else {
            // Prepare the file output by replacing the user strings with screen names
            let output = this.lastFightResult.intro.replaceAll('```', '')
            output += this.lastFightResult.log

            // Check for a draw
            if (this.lastFightResult.winner && this.lastFightResult.loser) {
              output = output
                .replaceAll(String(this.lastFightResult.winner.user), this.lastFightResult.winner.name)
                .replaceAll(String(this.lastFightResult.loser.user), this.lastFightResult.loser.name)
            }

            await collectionInteraction.followUp({
              content: 'Phew! That was a long fight! The bards had to write it to a file.',
              ephemeral: true,
              files: [new MessageAttachment(Buffer.from(output), `results.txt`)],
            })
          }
        } else {
          await collectionInteraction.followUp({
            content: 'Looks like the record of the fight is lost to time. Or maybe it never happened...',
            ephemeral: true,
          })
        }
        return
      }

      // Prevent the challenger accepting their own duels and ensure that the acceptor is valid.
      // For now do without the database
      // Create Character for challenger. Later use DB, for now re-generate each time.
      const accepterUser = getCallerFromCommand(collectionInteraction)?.user
      let accepter: Character
      let accepterDBRecord: RPGCharacter
      if (!accepterUser) {
        await interaction.followUp({
          content: 'Accepter username undefined',
          ephemeral: true,
        })
        return
      } else {
        accepter = new Character(accepterUser)
        accepterDBRecord = await this.getUserCharacter(accepterUser.id)
        console.log(
          `Accepter: ${accepterDBRecord.id}, Wins: ${accepterDBRecord.wins}, Losses: ${accepterDBRecord.losses}`
        )
      }

      // Prevent challenger from accepting their own duels, and ensure both are valid.
      if (!accepter || !challenger || accepter.user == challenger.user || !accepterDBRecord || !challengerDBRecord) {
        return
      }

      // TODO: Check for timeout if lost recently
      // Check to see if the accepter has recently lost.
      if (accepterDBRecord.lastLoss.getTime() + RPG.cooldown > Date.now()) {
        await interaction.followUp({
          content: `${accepter.user}, you have recently lost a fight. Please wait ${getTimeLeftInReadableFormat(
            accepterDBRecord.lastLoss,
            RPG.cooldown
          )} before trying again.`,
          ephemeral: true,
        })
        return
      } else if (!this.challengeInProgress) {
        // This should be impossible. We should not get this far if something is in progress.
        // Copying /duel, for safety...

        // Check if there is no current duel
        await collectionInteraction.followUp({
          content: 'Someone grabbed the gauntlet before you could! (or the challenger wandered off)',
          ephemeral: true,
        })
        const button = this.createButton(true)
        const row = new MessageActionRow().addComponents(button)
        await collectionInteraction.editReply({
          components: [row],
        })
        return
      } else {
        // Disable duel
        this.challengeInProgress = false
        if (this.timeout) {
          clearTimeout(this.timeout)
        }

        // Disable the button
        const button = this.createButton(true)
        const row = new MessageActionRow().addComponents(button)
        await collectionInteraction.editReply({
          components: [row],
        })

        // Now do the actual duel.
        this.lastFightResult = this.runRPGFight(challenger, accepter)

        if (this.lastFightResult.winner && this.lastFightResult.loser) {
          // Wasn't a draw, find the winner and update
          if (this.lastFightResult.winner === challenger) {
            await this.updateUserRPGScore(challengerDBRecord, 'win')
            await this.updateUserRPGScore(accepterDBRecord, 'loss')
          } else {
            await this.updateUserRPGScore(accepterDBRecord, 'win')
            await this.updateUserRPGScore(challengerDBRecord, 'loss')
          }
        } else {
          // Must be a draw
          this.updateUserRPGScore(challengerDBRecord, 'draw')
          this.updateUserRPGScore(accepterDBRecord, 'draw')
        }

        // Prepare the buttons.
        const logButton = new MessageButton()
          .setEmoji('📜')
          .setLabel('See fight!')
          .setStyle('SECONDARY')
          .setCustomId(RPG.SUMMARY_BUTTON_ID)
        await collectionInteraction.editReply({
          components: [new MessageActionRow().addComponents(logButton)],
        })

        // Finally, send the reply
        await collectionInteraction.editReply({
          content: `${this.lastFightResult.summary}`,
          // files: [new MessageAttachment(Buffer.from(result.log), `results.txt`)],
          // components: [],
        })
      }
    })
  }

  private async getUserCharacter(userId: string) {
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

  private async updateUserRPGScore(stats: RPGCharacter, outcome: 'win' | 'loss' | 'draw') {
    switch (outcome) {
      case 'draw': {
        await this.client.rPGCharacter.update({
          where: {
            id: stats.id,
          },
          data: {
            draws: { increment: 1 },
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
          },
        })
        break
      }
    }
  }

  private createButton(disabled: boolean): MessageButton {
    // TODO: Move this to shared code
    let button = new MessageButton().setEmoji('⚔️').setStyle('PRIMARY').setCustomId('rpg-btn')
    if (disabled) {
      button = button.setLabel("It's over").setDisabled(true)
    } else {
      button = button.setLabel('Accept challenge')
    }
    return button
  }
}
