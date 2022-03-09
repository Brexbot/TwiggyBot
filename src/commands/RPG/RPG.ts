import { Character } from './Character'
import { get_random_element as getRandomElement, roll_dy_x_times_pick_z } from './util'
import { attack_texts, defence_failure_texts, defence_success_texts, victory_texts } from './Dialogue'

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

class RPG {
  // CONSTANTS
  MAX_ROUNDS = 10
  OUT_WIDTH = 35

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

  get_move(attacker: Character, defender: Character): AttackResult {
    // Select the attack and defence stats
    const attackStat: string = getRandomElement(attacker.move_choices)
    const defenceStat: string = getRandomElement(defender.move_choices)

    // Advantage grants a re-roll for the roll, so check the
    // rock-paper-scissors advantage list to see if it applies to either
    // Uses unary + to convert false = 0 and true = 1
    const attackRR = +this.advantages[attackStat].includes(defenceStat)
    const defenceRR = +this.advantages[defenceStat].includes(attackStat)

    // Calculate stat modifier as Floor(STAT/2) - 5, as in DnD.
    const attackRoll = roll_dy_x_times_pick_z(20, 1 + attackRR, 1) + Math.floor(attacker.stats[attackStat] / 2) - 5
    const defenceRoll = roll_dy_x_times_pick_z(20, 1 + defenceRR, 1) + Math.floor(defender.stats[defenceStat] / 2) - 5

    // Attacker text is always got by taking a random element from the relevant dict entry
    let text = getRandomElement(attack_texts[attackStat])

    // Attack is resolved simply as whoever rolls highest. Meets-it beats-it, so attacker wins ties
    let damage = 0
    if (attackRoll >= defenceRoll) {
      text += ' ' + getRandomElement(defence_failure_texts[defenceStat])
      damage = roll_dy_x_times_pick_z(10, 1, 1)
    } else {
      text += ' ' + getRandomElement(defence_success_texts[defenceStat])
      damage = 0
    }

    text = text.replace(/DEF/g, defender['name']).replace(/ATK/g, attacker['name']).replace(/DMG/g, damage.toString())

    return { damage: damage, text: text }
  }

  duelNames(name_1: string, name_2: string): FightResult {
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
      log += header_1[i].padEnd(this.OUT_WIDTH, ' ') + '\n'
    }

    log +=
      '\n' + '+-------+'.padStart(Math.floor(this.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(this.OUT_WIDTH / 2), ' ') + '\n'
    log += '|  vs.  |'.padStart(Math.floor(this.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(this.OUT_WIDTH / 2), ' ') + '\n'
    log += '+-------+'.padStart(Math.floor(this.OUT_WIDTH / 2), ' ').padEnd(Math.ceil(this.OUT_WIDTH / 2), ' ') + '\n\n'

    for (let i = 1; i < header_2.length - 1; i++) {
      log += header_2[i].padEnd(this.OUT_WIDTH, ' ') + '\n'
    }
    log += '\n'

    // Loop through until one stat block is out of HP, or 20 rounds are done.
    let rounds = 0
    while (character_1['hp'] > 0 && character_2['hp'] > 0 && rounds < this.MAX_ROUNDS) {
      const initative_1 = roll_dy_x_times_pick_z(20, 1, 1) + Math.floor(character_1.stats['DEX'] / 2) - 5
      const initative_2 = roll_dy_x_times_pick_z(20, 1, 1) + Math.floor(character_2.stats['DEX'] / 2) - 5

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
      const summary = `After ${this.MAX_ROUNDS} rounds they decide to call it a draw.`
      log += summary
      return { log: log, summary: summary }
    }

    log += '=================\n'
    const summary = getRandomElement(victory_texts)
      .replace(/VICTOR/g, victor['name'])
      .replace(/LOSER/g, loser['name'])
    log += summary

    const result = { log: log, winner: victor['name'], loser: loser['name'], summary: summary }

    return result
  }
}

const chr = new Character('Nose')
const chr2 = new Character('Background Nose#1628')
const rpg = new RPG()
const result = rpg.duelNames('Nose', 'Background Nose#1628')

console.log(result.log)
