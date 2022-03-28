export const ELO_DECAY_FACTOR = 0.05 // Linear factor determining daily Elo rank decay
export const ELO_K = 48 // Maximum possible Elo rank change in one game. Higher makes ladder position less stable

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
  'educated',
  'ignorant',
]

export const nouns = [
  'evil',
  'neutral',
  'good',
  'stupid',
  'clever',
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
  'sin',
]

export type CharacterClass = {
  name: string // Name of the class as printed
  // Which stat each class prefers to attack with is
  // encoded as an array of the stats
  statPreferences: string[]
}

export const classes: CharacterClass[] = [
  { name: 'artificer', statPreferences: ['INT', 'WIS', 'CON', 'STR', 'DEX', 'CHR'] },
  { name: 'barbarian', statPreferences: ['STR', 'CON', 'CHR', 'WIS', 'DEX', 'INT'] },
  { name: 'bard', statPreferences: ['CHR', 'WIS', 'INT', 'DEX', 'CON', 'STR'] },
  { name: 'cleric', statPreferences: ['WIS', 'CON', 'CHR', 'STR', 'DEX', 'INT'] },
  { name: 'druid', statPreferences: ['WIS', 'INT', 'STR', 'CON', 'DEX', 'CHR'] },
  { name: 'fighter', statPreferences: ['STR', 'CON', 'DEX', 'CHR', 'INT', 'WIS'] },
  { name: 'monk', statPreferences: ['DEX', 'CHR', 'STR', 'WIS', 'CON', 'INT'] },
  { name: 'paladin', statPreferences: ['CHR', 'STR', 'INT', 'CON', 'WIS', 'DEX'] },
  { name: 'ranger', statPreferences: ['WIS', 'DEX', 'CON', 'INT', 'CHR', 'STR'] },
  { name: 'rogue', statPreferences: ['DEX', 'CHR', 'STR', 'CON', 'WIS', 'INT'] },
  { name: 'sorcerer', statPreferences: ['INT', 'CHR', 'WIS', 'DEX', 'CON', 'STR'] },
  { name: 'warlock', statPreferences: ['INT', 'WIS', 'CHR', 'CON', 'DEX', 'STR'] },
  { name: 'wizard', statPreferences: ['INT', 'WIS', 'CHR', 'CON', 'DEX', 'STR'] },
  { name: 'warrior', statPreferences: ['STR', 'CON', 'DEX', 'CHR', 'WIS', 'INT'] },
  { name: 'thief', statPreferences: ['DEX', 'WIS', 'INT', 'STR', 'CHR', 'CON'] },
  { name: 'motorcycle knight', statPreferences: ['DEX', 'STR', 'CON', 'CHR', 'INT', 'WIS'] },
  { name: 'bardbarian', statPreferences: ['STR', 'CHR', 'CON', 'DEX', 'WIS', 'INT'] },
  { name: 'person-at-Arms', statPreferences: ['CON', 'STR', 'DEX', 'CHR', 'INT', 'WIS'] },
  { name: 'librarian', statPreferences: ['INT', 'CHR', 'WIS', 'CON', 'STR', 'DEX'] },
  { name: 'jedi', statPreferences: ['WIS', 'CHR', 'DEX', 'CON', 'STR', 'INT'] },
  { name: 'strangler', statPreferences: ['STR', 'INT', 'WIS', 'DEX', 'CON', 'CHR'] },
  { name: 'battle felon', statPreferences: ['CHR', 'STR', 'CON', 'DEX', 'INT', 'WIS'] },
  { name: 'pugalist', statPreferences: ['STR', 'DEX', 'CON', 'CHR', 'WIS', 'INT'] },
  { name: 'documancer', statPreferences: ['INT', 'WIS', 'DEX', 'CON', 'STR', 'CHR'] },
  { name: 'mathemagician', statPreferences: ['WIS', 'INT', 'DEX', 'CON', 'STR', 'CHR'] },
  { name: 'tourist', statPreferences: ['CON', 'DEX', 'CHR', 'WIS', 'INT', 'STR'] },
  { name: 'valkyrie', statPreferences: ['STR', 'CON', 'DEX', 'WIS', 'INT', 'CHR'] },
  { name: 'juggler', statPreferences: ['DEX', 'CHR', 'INT', 'STR', 'CON', 'WIS'] },
  { name: 'CEO', statPreferences: ['CHR', 'INT', 'STR', 'CON', 'DEX', 'WIS'] },
  { name: 'drunken master', statPreferences: ['DEX', 'CON', 'WIS', 'CHR', 'INT', 'STR'] },
  { name: 'chaotician', statPreferences: ['CON', 'WIS', 'INT', 'CHR', 'DEX', 'STR'] },
  { name: 'prankster', statPreferences: ['CHR', 'DEX', 'WIS', 'INT', 'STR', 'CON'] },
  { name: 'anarchist', statPreferences: ['INT', 'STR', 'CON', 'CHR', 'DEX', 'WIS'] },
  { name: 'pacifist', statPreferences: ['CON', 'WIS', 'CHR', 'INT', 'STR', 'DEX'] },
  { name: 'tactician', statPreferences: ['INT', 'STR', 'CHR', 'WIS', 'CON', 'DEX'] },
  { name: 'bureaucrat', statPreferences: ['INT', 'STR', 'CON', 'DEX', 'WIS', 'CHR'] },
  { name: 'mecha-pilot', statPreferences: ['DEX', 'WIS', 'INT', 'CON', 'CHR', 'STR'] },
  { name: 'disarmorer', statPreferences: ['WIS', 'INT', 'CHR', 'DEX', 'STR', 'CON'] },
  { name: 'potwash', statPreferences: ['CON', 'WIS', 'INT', 'DEX', 'CHR', 'STR'] },
  { name: 'waifu', statPreferences: ['CHR', 'DEX', 'STR', 'CON', 'WIS', 'INT'] },
  { name: 'street samurai', statPreferences: ['DEX', 'WIS', 'STR', 'CHR', 'CON', 'INT'] },
]

// This list contains the possible species.
// The first entry is the name,
// the second list contains stat bonuses.
// Each appearance in the list adds 1 to that stat.
export type CharacterSpecie = {
  name: string // Name of the specie as printed
  // Array of Stats that should receive bonuses.
  // +1 is added for each appearance.
  statBonuses: string[]
}

export const species: CharacterSpecie[] = [
  { name: 'Dwarf', statBonuses: ['CON', 'CON', 'STR'] },
  { name: 'Elf', statBonuses: ['INT', 'INT', 'DEX'] },
  { name: 'Halfling', statBonuses: ['DEX', 'CHR', 'CHR'] },
  { name: 'Human', statBonuses: ['CON', 'DEX', 'STR'] },
  { name: 'Dragonborn', statBonuses: ['CON', 'STR', 'INT'] },
  { name: 'Gnome', statBonuses: ['DEX', 'DEX', 'DEX'] },
  { name: 'Half-Elf', statBonuses: ['INT', 'CON', 'CHR'] },
  { name: 'Half-Orc', statBonuses: ['STR', 'STR', 'CON'] },
  { name: 'Tiefling', statBonuses: ['INT', 'INT', 'DEX'] },
  { name: 'Dire-Manatee', statBonuses: ['INT', 'INT', 'INT'] },
  { name: 'Half-Goat', statBonuses: ['DEX', 'DEX', 'STR'] },
  { name: 'Reverse-Mermaid', statBonuses: ['CHR', 'CHR', 'DEX'] },
  { name: 'Reverse-Centaur', statBonuses: ['STR', 'DEX', 'DEX'] },
  { name: 'Satyr', statBonuses: ['INT', 'INT', 'DEX'] },
  { name: 'Double-Hobbit', statBonuses: ['CHR', 'CHR', 'CHR'] },
  { name: 'Long-Goblin', statBonuses: ['DEX', 'CON', 'CON'] },
  { name: 'Double half-orc', statBonuses: ['STR', 'STR', 'STR'] },
  { name: 'Gingerbrute-Person', statBonuses: ['CHR', 'INT', 'INT'] },
  { name: 'Sock Demon', statBonuses: ['INT', 'CHR', 'CHR'] },
  { name: 'Metalhead', statBonuses: ['CHR', 'INT', 'STR'] },
  { name: 'Beer Elemental', statBonuses: ['CON', 'CON', 'CHR', 'CHR'] },
  { name: 'Slime-Person', statBonuses: ['DEX', 'DEX', 'CHR'] },
]
