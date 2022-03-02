import { Character } from './Character'
import { getRandomElement as getRandomElement, roll_dy_x_TimesPick_z } from './util'
import { attackTexts, defenceFailureTexts, defenceSuccessTexts, victoryTexts } from './Dialogue'

import { CommandInteraction, MessageActionRow, MessageButton, Message, ButtonInteraction } from 'discord.js'
import { Discord, Slash } from 'discordx'
import { getCallerFromCommand } from '../../utils/CommandUtils'

// There can only be 6 different stats.
// Therefore, using an enum prevents typos begin treated as
// mystery 7th stats.
// export type StatType = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHR";
// export const StatType = ["STR", "DEX", "CON", "INT", "WIS", "CHR"] as const;

type AttackResult = {
  text: string
  damage: number
}

type FightResult = {
  log: string
  winnerName?: string
  loserName?: string
  summary: string
}

@Discord()
export class RPG {
  // CONSTANTS
  static MAX_ROUNDS = 10
  static OUT_WIDTH = 35

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

    text = text.replace(/DEF/g, defender['name']).replace(/ATK/g, attacker['name']).replace(/DMG/g, damage.toString())

    return { damage: damage, text: text }
  }

  private duelNames(name_1: string, name_2: string): FightResult {
    // Full driver function that runs the battle.
    // Supply with two strings, returns the result and log text.

    // Generate the stat blocks from the names
    const character_1 = new Character(name_1)
    const character_2 = new Character(name_2)

    // Prepare the headers for the printout
    const header_1 = character_1.toString().split('\n')
    const header_2 = character_2.toString().split('\n')

    // Format it for vertical output.
    let log = ''

    for (let i = 1; i < header_1.length - 1; i++) {
      log += header_1[i].padEnd(RPG.OUT_WIDTH, ' ') + '\n'
    }

    log +=
      '\n' + '+-------+'.padStart(Math.floor(RPG.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(RPG.OUT_WIDTH / 2), ' ') + '\n'
    log += '|  vs.  |'.padStart(Math.floor(RPG.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(RPG.OUT_WIDTH / 2), ' ') + '\n'
    log += '+-------+'.padStart(Math.floor(RPG.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(RPG.OUT_WIDTH / 2), ' ') + '\n\n'

    for (let i = 1; i < header_2.length - 1; i++) {
      log += header_2[i].padEnd(RPG.OUT_WIDTH, ' ') + '\n'
    }
    log += '\n'

    // Loop through until one stat block is out of HP, or 20 rounds are done.
    let rounds = 0
    while (character_1['hp'] > 0 && character_2['hp'] > 0 && rounds < RPG.MAX_ROUNDS) {
      const initative_1 = roll_dy_x_TimesPick_z(20, 1, 1) + Math.floor(character_1.stats['DEX'] / 2) - 5
      const initative_2 = roll_dy_x_TimesPick_z(20, 1, 1) + Math.floor(character_2.stats['DEX'] / 2) - 5

      // name 2 has a slight advantage, eh, who cares?
      const order = initative_1 > initative_2 ? [character_1, character_2] : [character_2, character_1]

      for (let i = 0; i < 2; i++) {
        const attacker = order[i]
        const defender = order[(i + 1) % 2]
        const res = this.get_move(attacker, defender)
        defender['hp'] -= res['damage']
        log += res['text'] + '\n'

        if (defender['hp'] <= 0) {
          break
        }
      }
      rounds += 1
    }

    let victor, loser
    // Append the summary text to the log
    if (character_1['hp'] <= 0) {
      victor = character_2
      loser = character_1
    } else if (character_2['hp'] <= 0) {
      victor = character_1
      loser = character_2
    } else {
      const summary = `After ${RPG.MAX_ROUNDS} rounds they decide to call it a draw.`
      log += summary
      return { log: log, summary: summary }
    }

    log += '=================\n'
    const summary = getRandomElement(victoryTexts)
      .replace(/VICTOR/g, victor['name'])
      .replace(/LOSER/g, loser['name'])
    log += summary

    const result = { log: log, winner: victor['name'], loser: loser['name'], summary: summary }

    return result
  }

  @Slash('rpg_character', { description: 'Print your character sheet' })
  async rpgCharacter(interaction: CommandInteraction) {
    const callerMember = getCallerFromCommand(interaction)

    const callingUsername = callerMember?.user.username

    if (!callingUsername) {
      interaction.reply('Username undefined')
    } else {
      const character = new Character(callingUsername)
      interaction.reply(character.toString())
    }
  }

  @Slash('rpg_challenge')
  private async rpg_challenge(interaction: CommandInteraction) {
    await interaction.deferReply()

    // Create Character for challenger. Later use DB, for now re-generate each time.
    const challengerMember = getCallerFromCommand(interaction)
    const challengerUsername = challengerMember?.user.username
    let challenger: Character | undefined
    if (!challengerUsername) {
      await interaction.followUp({
        content: 'Challenger username undefined',
        ephemeral: true,
      })
      challenger = undefined
    } else {
      challenger = new Character(challengerUsername)
    }

    // Check if a duel is currently already going on.
    if (this.challengeInProgress) {
      await interaction.followUp({
        content: 'An RPG challenge is already in progress.',
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
        content: `No one was brave enough to do battle with ${challengerMember?.user}.`,
        components: [row],
      })
      this.challengeInProgress = false
    }, this.timeoutDuration)

    const row = new MessageActionRow().addComponents(this.createButton(false))
    const message = await interaction.followUp({
      content: `${challengerMember?.user} is throwing down the gauntlet in challenge.`,
      fetchReply: true,
      components: [row],
    })

    if (!(message instanceof Message)) {
      throw Error('InvalidMessage instance')
    }

    const collector = message.createMessageComponentCollector()
    collector.on('collect', async (collectionInteraction: ButtonInteraction) => {
      await collectionInteraction.deferUpdate()

      // Prevent the challenger accepting their own duels and ensure that the acceptor is valid.
      // For now do without the database
      const acceptorMember = getCallerFromCommand(collectionInteraction)

      // Create Character for challenger. Later use DB, for now re-generate each time.
      const challengerUsername = acceptorMember?.user.username
      let acceptor: Character | undefined
      if (!challengerUsername) {
        await interaction.followUp({
          content: 'Challenger username undefined',
          ephemeral: true,
        })
        acceptor = undefined
      } else {
        acceptor = new Character(challengerUsername)
      }

      // Prevent challenger from accepting their own duels, and ensure both are valid.
      if (!acceptor || !challenger || acceptor.name === challenger.name) {
        return
      }

      // TODO: Check for timeout if lost recently
      if (!this.challengeInProgress) {
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
        await collectionInteraction.editReply({
          content: `${challenger?.name} issued a challenge and ${acceptor?.name} accepted`,
        })
      }
    })
  }

  private createButton(disabled: boolean): MessageButton {
    // TODO: Move this to shared code
    let button = new MessageButton().setEmoji('⚔️').setStyle('PRIMARY').setCustomId('rpg-btn')
    if (disabled) {
      button = button.setLabel("It's over").setDisabled(true)
    } else {
      button = button.setLabel('Accept duel')
    }
    return button
  }
}
