// import { StatType } from "./RPG_TS";
import { adjectives, nouns, CharacterClass, classes, CharacterSpecie, species } from './Data'
import { get_seeded_random_element, roll_seeded_dy_x_times_pick_z, cyrb53, mulberry32 } from './util'

const preferred_letter: Record<string, string> = {
  STR: 'S',
  DEX: 'D',
  CON: 'C',
  INT: 'I',
  WIS: 'W',
  CHR: 'T',
}

export class Character {
  stats: Record<string, number> = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHR: 0 }

  move_choices: string[]

  hp = 0

  name = ''
  character_class: CharacterClass
  character_specie: CharacterSpecie
  alignment: string

  seed = 0

  rng: Function

  constructor(data: string) {
    this.name = data

    // Get the seed by hashing the input string
    this.seed = cyrb53(this.name)
    // then seed the RNG
    this.rng = mulberry32(this.seed)

    // placeholder classes and species because TS throws a shitfit worried that they might be undefined
    // this.character_class = classes[0];
    // this.character_specie = species[0];

    if (this.name == 'Brex#0001') {
      this.character_specie = {
        name: 'Bananasaurus',
        stat_bonuses: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHR'],
      }
    } else {
      this.character_specie = get_seeded_random_element(species, this.rng)
    }

    // get the class from the list
    this.character_class = get_seeded_random_element(classes, this.rng)

    // move choices are set by adding each stat to the list
    // if there are 6 entries, the first is added 6 times, the second
    // is added 5 times, the 3rd 4 times, etc...
    this.move_choices = []
    for (let i = 0; i < this.character_class.stat_preferences.length; i++) {
      for (let j = 0; j < this.character_class.stat_preferences.length - i; j++) {
        this.move_choices.push(this.character_class.stat_preferences[i])
      }
    }

    // Build the alignment from the lists
    const adjective: string = get_seeded_random_element(adjectives, this.rng)
    const noun: string = get_seeded_random_element(nouns, this.rng)
    this.alignment = `${adjective} ${noun}`
    this.alignment = this.alignment[0].toUpperCase() + this.alignment.substring(1) // Capitalise

    // Count the number of "2" in the input string, minimum of 1.
    // Twos are cursed, so ya get better stats
    const twos = this.name.split('2').length - 1

    // generate HP as N d6 choose HIT_DICE
    const HIT_DICE = 4
    this.hp = roll_seeded_dy_x_times_pick_z(6, HIT_DICE + twos + 2, HIT_DICE, this.rng)

    const ustr = this.name.toUpperCase()

    for (const [key, value] of Object.entries(preferred_letter)) {
      // Roll stats by counting the occurence of the stat name in istr
      // Having that letter turn up in your name has got to be good right?
      // Final score is sum of best 3 of d6 rolled.
      const char = preferred_letter[key]
      const total_rolls = 1 + Math.max(ustr.split(char).length + twos, 2)
      this.stats[key] = roll_seeded_dy_x_times_pick_z(6, total_rolls, 3, this.rng)
    }

    // Now add the species modifier.
    for (let i = 0; i < this.character_specie.stat_bonuses.length; i++) {
      this.stats[this.character_specie.stat_bonuses[i]] += 1
    }
  }

  toString() {
    let ostr = `\`\`\`\n${this.name}\n`
    ostr += '-'.repeat(this.name.length) + '\n'
    ostr += `${this.character_specie.name} ${this.character_class.name}` + '\n'
    ostr += `Alignment: ${this.alignment}` + '\n'
    ostr += `HP: ${this.hp}` + '\n'
    ostr += ' STR | DEX | CON | INT | WIS | CHR \n'
    ostr += `  ${this.stats['STR'].toString().padStart(2, ' ')} |  ${this.stats['DEX']
      .toString()
      .padStart(2, ' ')} |  ${this.stats['CON'].toString().padStart(2, ' ')} |  ${this.stats['INT']
      .toString()
      .padStart(2, ' ')} |  ${this.stats['WIS'].toString().padStart(2, ' ')} |  ${this.stats['CHR']
      .toString()
      .padStart(2, ' ')} \n`
    ostr += '```'
    return ostr
  }
}
