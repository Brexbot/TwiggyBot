import { adjectives, nouns, CharacterClass, classes, CharacterSpecie, species } from './Data'
import { getSeededRandomElement, rollSeeded_dy_x_TimesPick_z, mulberry32, cyrb53 } from './util'

import { MessageEmbed, User } from 'discord.js'

const preferredLetter: Record<string, string> = {
  STR: 'S',
  DEX: 'D',
  CON: 'C',
  INT: 'I',
  WIS: 'W',
  CHR: 'T',
}

export class Character {
  static HIT_DICE = 4

  stats: Record<string, number> = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHR: 0 }

  moveChoices: string[]

  hp = 0
  maxHp = 0

  name = ''
  characterClass: CharacterClass
  characterSpecie: CharacterSpecie
  alignment: string

  seed = 0

  rng: () => number

  public constructor(public user: User, private seedPhrase?: string) {
    // Maybe the screen name is better until folks can build their own character
    if (this.seedPhrase) {
      this.seed = cyrb53(this.seedPhrase)
      this.name = this.seedPhrase
    } else {
      // But we can use the user id as a fallback seed
      this.seed = parseInt(this.user.id)
      this.name = user.username
    }
    // then seed the RNG
    this.rng = mulberry32(this.seed)

    if (this.user.id == '89926310410850304') {
      this.characterSpecie = {
        name: 'Bananasaurus',
        statBonuses: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHR'],
      }
    } else {
      this.characterSpecie = getSeededRandomElement(species, this.rng)
    }

    // get the class from the list
    this.characterClass = getSeededRandomElement(classes, this.rng)

    // move choices are set by adding each stat to the list
    // if there are 6 entries, the first is added 6 times, the second
    // is added 5 times, the 3rd 4 times, etc...
    this.moveChoices = []
    for (let i = 0; i < this.characterClass.statPreferences.length; i++) {
      for (let j = 0; j < this.characterClass.statPreferences.length - i; j++) {
        this.moveChoices.push(this.characterClass.statPreferences[i])
      }
    }

    // Build the alignment from the lists
    const adjective: string = getSeededRandomElement(adjectives, this.rng)
    const noun: string = getSeededRandomElement(nouns, this.rng)
    this.alignment = `${adjective} ${noun}`
    this.alignment = this.alignment[0].toUpperCase() + this.alignment.substring(1) // Capitalise

    // Count the number of "2" in the input string, minimum of 1.
    // Twos are cursed, so ya get better stats
    const twos = this.name.split('2').length - 1

    // generate HP as N d6 choose HIT_DICE
    this.hp = rollSeeded_dy_x_TimesPick_z(6, Character.HIT_DICE + twos + 2, Character.HIT_DICE, this.rng)
    this.maxHp = this.hp

    const ustr = this.name.toUpperCase()

    for (const [key, value] of Object.entries(preferredLetter)) {
      // Roll stats by counting the occurence of the stat name in istr
      // Having that letter turn up in your name has got to be good right?
      // Final score is sum of best 3 of d6 rolled.
      const char = value
      const total_rolls = 1 + Math.max(ustr.split(char).length + twos, 2)
      this.stats[key] = rollSeeded_dy_x_TimesPick_z(6, total_rolls, 3, this.rng)
    }

    // Now add the species modifier.
    for (let i = 0; i < this.characterSpecie.statBonuses.length; i++) {
      this.stats[this.characterSpecie.statBonuses[i]] += 1
    }
  }

  public toString(): string {
    let ostr = `\`\`\`\n${this.name}\n`
    ostr += '-'.repeat(this.name.length) + '\n'
    ostr += `${this.characterSpecie.name} ${this.characterClass.name}` + '\n'
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

  public toEmbed(eloBandIcon?: string): MessageEmbed {
    const suffix = eloBandIcon ? ` ${eloBandIcon}` : ''
    const out = new MessageEmbed()
      .setTitle(this.name + suffix)
      .setDescription(
        `${this.characterSpecie.name} ${this.characterClass.name}` +
          `\n**Alignment:** ${this.alignment}` +
          `\n**HP:** ${this.maxHp}` +
          `\n\`\`\`\n` +
          ' STR | DEX | CON | INT | WIS | CHR \n' +
          `  ${this.stats['STR'].toString().padStart(2, ' ')} |  ${this.stats['DEX']
            .toString()
            .padStart(2, ' ')} |  ${this.stats['CON'].toString().padStart(2, ' ')} |  ${this.stats['INT']
            .toString()
            .padStart(2, ' ')} |  ${this.stats['WIS'].toString().padStart(2, ' ')} |  ${this.stats['CHR']
            .toString()
            .padStart(2, ' ')} \n` +
          `\n\`\`\``
      )
      .setColor('#009933') // Seems a nice enough colour. Could match use colour if we wanted.
    return out
  }
}
