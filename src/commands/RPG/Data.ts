// import { StatType } from "./RPG_TS"

// Alignments are built as "$ADJECTIVE $NOUN", these lists contain them
export const adjectives = [
  'chaotic',
  'neutral',
  'lawful',
  'ordered',
  'inspired',
  'performative',
  'angry',
  'hard',
  'soft',
  'low-key',
  'based',
  'woke',
  'projected',
  'mailicious',
  'directed',
  'memetic',
  'bureaucratic',
  'loving',
  'organised',
  'frustrated',
  'enlightend',
  'absurd',
  'frustrated',
  'indifferent',
  'apathetic',
  'contented',
  'cynical',
  'riteous',
  'indulgent',
  'pragmatic',
  'postmodern',
]

export const nouns = [
  'evil',
  'neutral',
  'good',
  'stupid',
  'zen',
  'angry',
  'coffee',
  'food',
  'heroic',
  'meme',
  'inactive',
  'pretty',
  'ugly',
  'wahoo',
  'horny',
  'righteous',
]

export type CharacterClass = {
  name: string // Name of the class as printed
  // Which stat each class prefers to attack with is
  // encoded as an array of the stats
  stat_preferences: string[]
}

export const classes: CharacterClass[] = [
  { name: 'artificer', stat_preferences: ['INT', 'WIS', 'DEX', 'CHR', 'CON', 'STR'] },
  { name: 'barbarian', stat_preferences: ['STR', 'CON', 'DEX', 'CHR', 'WIS', 'INT'] },
  { name: 'bard', stat_preferences: ['CHR', 'WIS', 'INT', 'DEX', 'CON', 'STR'] },
  { name: 'cleric', stat_preferences: ['WIS', 'CHR', 'CON', 'STR', 'DEX', 'INT'] },
  { name: 'druid', stat_preferences: ['WIS', 'INT', 'STR', 'CON', 'DEX', 'CHR'] },
  { name: 'fighter', stat_preferences: ['DEX', 'STR', 'CON', 'CHR', 'INT', 'WIS'] },
  { name: 'monk', stat_preferences: ['DEX', 'CHR', 'STR', 'WIS', 'CON', 'INT'] },
  { name: 'paladin', stat_preferences: ['CHR', 'STR', 'INT', 'CON', 'WIS', 'DEX'] },
  { name: 'ranger', stat_preferences: ['DEX', 'WIS', 'INT', 'CON', 'CHR', 'STR'] },
  { name: 'rogue', stat_preferences: ['DEX', 'CHR', 'STR', 'CON', 'WIS', 'INT'] },
  { name: 'sorcerer', stat_preferences: ['INT', 'CHR', 'WIS', 'DEX', 'CON', 'STR'] },
  { name: 'warlock', stat_preferences: ['INT', 'WIS', 'CHR', 'CON', 'DEX', 'STR'] },
  { name: 'wizard', stat_preferences: ['INT', 'WIS', 'CHR', 'CON', 'DEX', 'STR'] },
  { name: 'warrior', stat_preferences: ['STR', 'CON', 'DEX', 'CHR', 'WIS', 'INT'] },
  { name: 'thief', stat_preferences: ['DEX', 'CHR', 'WIS', 'INT', 'STR', 'CON'] },
  { name: 'motorcycle knight', stat_preferences: ['DEX', 'CHR', 'STR', 'CON', 'INT', 'WIS'] },
  { name: 'bardbarian', stat_preferences: ['STR', 'CHR', 'CON', 'DEX', 'WIS', 'INT'] },
  { name: 'person-at-Arms', stat_preferences: ['CON', 'STR', 'DEX', 'CHR', 'INT', 'WIS'] },
  { name: 'librarian', stat_preferences: ['INT', 'CHR', 'WIS', 'DEX', 'CON', 'STR'] },
  { name: 'jedi', stat_preferences: ['DEX', 'WIS', 'CHR', 'CON', 'STR', 'INT'] },
  { name: 'strangler', stat_preferences: ['DEX', 'STR', 'INT', 'WIS', 'CON', 'CHR'] },
  { name: 'battle felon', stat_preferences: ['CHR', 'STR', 'CON', 'DEX', 'INT', 'WIS'] },
  { name: 'pugalist', stat_preferences: ['STR', 'DEX', 'CON', 'CHR', 'WIS', 'INT'] },
  { name: 'documancer', stat_preferences: ['INT', 'WIS', 'DEX', 'CON', 'STR', 'CHR'] },
  { name: 'mathemagician', stat_preferences: ['WIS', 'INT', 'DEX', 'CON', 'STR', 'CHR'] },
  { name: 'tourist', stat_preferences: ['CON', 'DEX', 'CHR', 'WIS', 'INT', 'STR'] },
  { name: 'valkyrie', stat_preferences: ['DEX', 'STR', 'CON', 'WIS', 'INT', 'CHR'] },
  { name: 'juggler', stat_preferences: ['DEX', 'CHR', 'INT', 'STR', 'CON', 'WIS'] },
  { name: 'CEO', stat_preferences: ['CHR', 'INT', 'STR', 'CON', 'DEX', 'WIS'] },
  { name: 'drunken master', stat_preferences: ['DEX', 'CON', 'WIS', 'CHR', 'INT', 'STR'] },
  { name: 'chaotician', stat_preferences: ['WIS', 'INT', 'CHR', 'DEX', 'STR', 'CON'] },
  { name: 'prankster', stat_preferences: ['CHR', 'DEX', 'WIS', 'INT', 'STR', 'CON'] },
  { name: 'anarchist', stat_preferences: ['CHR', 'INT', 'STR', 'CON', 'DEX', 'WIS'] },
  { name: 'pacifist', stat_preferences: ['CHR', 'WIS', 'INT', 'CON', 'DEX', 'STR'] },
  { name: 'tactician', stat_preferences: ['INT', 'STR', 'CHR', 'WIS', 'CON', 'DEX'] },
  { name: 'bureaucrat', stat_preferences: ['INT', 'STR', 'CON', 'DEX', 'WIS', 'CHR'] },
  { name: 'mecha-pilot', stat_preferences: ['DEX', 'WIS', 'INT', 'CON', 'CHR', 'STR'] },
  { name: 'disarmorer', stat_preferences: ['WIS', 'INT', 'CHR', 'DEX', 'STR', 'CON'] },
  { name: 'potwash', stat_preferences: ['DEX', 'WIS', 'CON', 'INT', 'CHR', 'STR'] },
  { name: 'waifu', stat_preferences: ['CHR', 'DEX', 'STR', 'CON', 'WIS', 'INT'] },
  { name: 'street samurai', stat_preferences: ['DEX', 'WIS', 'STR', 'CHR', 'CON', 'INT'] },
]

// This list contains the possible species.
// The first entry is the name,
// the second list contains stat bonuses.
// Each appearance in the list adds 1 to that stat.
export type CharacterSpecie = {
  name: string // Name of the specie as printed
  // Array of Stats that should receive bonuses.
  // +1 is added for each appearance.
  stat_bonuses: string[]
}

export const species: CharacterSpecie[] = [
  { name: 'Dwarf', stat_bonuses: ['CON', 'CON', 'STR'] },
  { name: 'Elf', stat_bonuses: ['INT', 'INT', 'DEX'] },
  { name: 'Halfling', stat_bonuses: ['DEX', 'CHR', 'CHR'] },
  { name: 'Human', stat_bonuses: ['CON', 'DEX', 'STR'] },
  { name: 'Dragonborn', stat_bonuses: ['CON', 'STR', 'INT'] },
  { name: 'Gnome', stat_bonuses: ['DEX', 'DEX', 'DEX'] },
  { name: 'Half-Elf', stat_bonuses: ['INT', 'CON', 'CHR'] },
  { name: 'Half-Orc', stat_bonuses: ['STR', 'STR', 'CON'] },
  { name: 'Tiefling', stat_bonuses: ['INT', 'INT', 'DEX'] },
  { name: 'Dire-Manatee', stat_bonuses: ['INT', 'INT', 'INT'] },
  { name: 'Half-Goat', stat_bonuses: ['DEX', 'DEX', 'STR'] },
  { name: 'Reverse-Mermaid', stat_bonuses: ['CHR', 'CHR', 'DEX'] },
  { name: 'Reverse-Centaur', stat_bonuses: ['STR', 'DEX', 'DEX'] },
  { name: 'Satyr', stat_bonuses: ['INT', 'INT', 'DEX'] },
  { name: 'Double-Hobbit', stat_bonuses: ['CHR', 'CHR', 'CHR'] },
  { name: 'Long-Goblin', stat_bonuses: ['DEX', 'CON', 'CON'] },
  { name: 'Double half-orc', stat_bonuses: ['STR', 'STR', 'STR'] },
  { name: 'Gingerbrute-Person', stat_bonuses: ['CHR', 'INT', 'INT'] },
  { name: 'Sock Demon', stat_bonuses: ['INT', 'CHR', 'CHR'] },
  { name: 'Metalhead', stat_bonuses: ['CHR', 'INT', 'STR'] },
  { name: 'Beer Elemental', stat_bonuses: ['CON', 'CON', 'CHR', 'CHR'] },
  { name: 'Slime-Person', stat_bonuses: ['DEX', 'DEX', 'CHR'] },
]
