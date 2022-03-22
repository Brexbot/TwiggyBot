// This contains the attack strings.
// The attacker chooses a stat to attack with,
// then selects a random description from the appropriate list.
// 'ATK' gets replaced with the attacker name,
// 'DEF' gets replaced with the defender name
export const attackTexts: Record<string, string[]> = {
  STR: [
    'ATK swings a wild haymaker at DEF,',
    'ATK throws a punch at DEF,',
    'ATK goes in for the bear hug,',
    'ATK tries to crush DEF like a bug,',
    'ATK hurls a boulder at DEF,',
    'ATK advances menacingly,',
    'ATK does a shoryuken,',
    'ATK tries to bonk DEF on the noggin,',
    'ATK yeets DEF,',
  ],
  DEX: [
    'ATK lunges at DEF,',
    'ATK darts in with an attack,',
    'ATK throws a rock,',
    'ATK unleashes a flurry of blows',
    'ATK sneaks up on DEF,',
    'ATK shoots an arrow at DEF,',
    'ATK begins the 5 point exploding heart technique,',
    'ATK pulls off a special move,',
    'ATK starts throwing hands,',
  ],
  CON: [
    'ATK flexes at DEF,',
    'ATK bull-charges DEF,',
    'ATK challenges DEF to a drinking contest,',
    'ATK body slams DEF,',
    'ATK shows off their hot bod,',
    'ATK winks at DEF,',
    'ATK starts throwing shapes,',
  ],
  INT: [
    'ATK throws a fireball at DEF,',
    'ATK unleashes a psychic assault,',
    'ATK plays a face-down card and ends their turn,',
    'ATK outsmarts DEF,',
    'ATK points their finger of death at DEF,',
    'ATK reads the dictionary at DEF,',
    'ATK throws a spirit bomb at DEF,',
  ],
  WIS: [
    'ATK calls on a higher power to smite DEF,',
    'ATK orders their animal companion to attack,',
    'ATK believes in themself,',
    'ATK springs an ambush,',
    'ATK enacts a cunning plan,',
    "ATK appeals to DEF's better nature,",
    'ATK casts turn undead,',
    'ATK stands in contemplation,',
  ],
  CHR: [
    'ATK says mean things about DEF,',
    'ATK cancels DEF on Twitter,',
    'ATK bombards DEF with discord pings,',
    'ATK starts the crowd chanting,',
    'ATK drops a truth bomb on DEF,',
    'ATK taunts DEF,',
    'ATK reads DEF their rights,',
    'ATK uses "good" as an adverb,',
  ],
}

// If the defence is successful, this set of strings is chosen from
// according to the stat the defender defended with
// 'ATK' gets replaced with the attacker name,
// 'DEF' gets replaced with the defender name
export const defenceSuccessTexts: Record<string, string[]> = {
  STR: [
    'but DEF pushes them over.',
    'but DEF simply flexes.',
    "but it glances off DEF's washboard abs.",
    'but DEF is a force of nature.',
    'but DEF is having none of it.',
    'but DEF is too strong.',
    'but DEF is too stacked.',
    'but DEF is built like a brick shithouse.',
  ],
  DEX: [
    'but DEF dodges the attack.',
    'but DEF is nowhere to be seen!',
    'but DEF is somewhere else.',
    'DEF parries!',
    'DEF counters with pocket sand!',
    'but DEF narrowly avoids it.',
    'but DEF sidesteps.',
  ],
  CON: [
    'but DEF stands impervious.',
    'but DEF hardly notices.',
    'but DEF ignores it.',
    "but DEF isn't affected.",
    'but DEF is built of sterner stuff.',
    "it's not very effective.",
    'DEF takes it on the chin.',
    'DEF just blinks.',
    'but DEF goes super saiyan!',
  ],
  INT: [
    'but DEF reads them like a book.',
    'but DEF uses their brain wrinkles to counter.',
    'but DEF teleports away.',
    'but DEF casts stoneskin for extra armor.',
    'but DEF knows better.',
    'but DEF shouts COUNTERSPELL!',
    'but DEF outsmarts them.',
    'but DEF is one step ahead.',
  ],
  WIS: [
    'but DEF is protected by divine light.',
    'but DEF is saved by their animal companion.',
    "but DEF doesn't believe in damage.",
    'but DEF has other ideas.',
    'but DEF already prepared for that.',
    'but DEF has other plans.',
    'but DEF is destined for greater things.',
    'but DEF just turns the other cheek.',
    'DEF meditates through the attack.',
  ],
  CHR: [
    'but DEF just laughs, unnerving ATK.',
    "but DEF convinces them it's a bad idea.",
    'but DEF talks them out of it.',
    'but DEF distracts them.',
    'but DEF just cracks wise.',
    'but DEF just shouts them down.',
    'but DEF talks their way out of it.',
    'but DEF is too pretty.',
    'but DEF gets the crowd on their side.',
  ],
}

// If the defence fails, then text is selected from this set.
// 'ATK' gets replaced with the attacker name,
// 'DEF' gets replaced with the defender name
// 'DMG' gets replaced with the damage value.
export const defenceFailureTexts: Record<string, string[]> = {
  STR: [
    "and DEF's strength fails, taking DMG damage.",
    "and DEF can't resist the DMG damage.",
    'and DEF is too weak to prevent the DMG damage.',
    "overpowering DEF's defence inflicting DMG damage.",
    "and DEF can't quite get the upper hand. DMG damage.",
    "and DEF can't push through. DMG damage.",
    "DEF's muscles aren't big enough to avoid the DMG damage.",
  ],
  DEX: [
    'and DEF is too slow to get out the way, eating DMG damage.',
    'DEF fails to dodge. DMG damage done.',
    "DEF didn't react in time and takes DMG damage.",
    'DEF stumbles and takes the full DMG damage.',
    'and DEF gets the parry timing wrong, taking DMG damage.',
    'DEF takes DMG damage and blames lag.',
    'DEF walks right into the DMG damage.',
    "DEF's fancy footwork isn't enough. DMG damage.",
  ],
  CON: [
    'and DEF takes the full DMG damage.',
    'and DEF blocks it with their face taking DMG damage.',
    "and DEF can't resist the DMG damage.",
    'DEF is left with DMG fewer hit points.',
    "and DEF isn't tough enough to resist the DMG damage.",
    "and DEF isn't tough enough to ignore DMG damage.",
    "DEF's is less healthy after the DMG damage.",
  ],
  INT: [
    'and DEF reacts poorly suffering DMG damage.',
    'and DEF has a smooth brain moment resulting in DMG damage.',
    "and DEF didn't see the DMG damage coming.",
    "and DEF's counterspell fizzles, taking DMG damage.",
    'DEF forgot the words to their spell and takes DMG damage.',
    "DEF doesn't know what hit them. DMG damage.",
    "and DEF can't think of a solution to the DMG damage.",
  ],
  WIS: [
    "and DEF's power abandons them, taking DMG damage.",
    "and DEF wasn't prepared for that, taking DMG damage.",
    "and DEF didn't expect it. DMG damage done.",
    "and DEF's faith falters suffering DMG damage.",
    'DEF turns the other cheek. It gets hit for DMG damage.',
    'DEF is caught off guard, suffering DMG damage.',
    "and DEF didn't try hard enough. DMG damage.",
    "and DEF can't come to accept it. DMG damage.",
  ],
  CHR: [
    "and DEF's laughter is not the best medicine. DMG damage.",
    "and DEF's talking doesn't stop the DMG damage.",
    'cutting DEF off mid sentence and inflicting DMG damage.',
    "interrupting DEF's monologue and inflicting DMG damage.",
    'and DEF is left speechless. DMG damage.',
    'and DEF has no reply. DMG damage.',
    'and DEF is tongue-tied. DMG damage.',
    'and the DMG damage makes DEF cry.',
  ],
}

// Finally, it selects a random concluding message.
// VICTOR is replaced with the winner's name
// LOSER is replaced with the loser's name
export const victoryTexts: Record<string, string[]> = {
  STANDARD: [
    'LOSER falls and VICTOR wins!',
    'LOSER is smashed like a bowl of eggs. VICTOR wins!',
    'LOSER taps out. VICTOR wins!',
    'Sucks to suck LOSER, VICTOR wins!',
    "LOSER can't go on, VICTOR wins!",
    'VICTOR stands victorious, LOSER is left to lick their wounds.',
    'VICTOR wins! GG go next.',
    'VICTOR wins! GG no re.',
    'LOSER faints. VICTOR jumps for joy!',
    "LOSER can't take it any more, VICTOR wins!",
    'LOSER is outplayed, VICTOR is the winner!',
    'Winner winner chicken dinner for VICTOR. LOSER starves.',
    'VICTOR wins! LOSER thinks the game is rigged!',
  ],

  PERFECT: [
    'VICTOR scores a perfect victory! LOSER is shamed!',
    'VICTOR is untouchable! LOSER never got a hit in.',
    "VICTOR must be hacking because LOSER couldn't land a hit.",
    'FRAUD ALERT! VICTOR scores a perfect victory over LOSER.',
    'VICTOR wins without breaking a sweat. Was LOSER even trying?',
  ],

  CLOSE: [
    'VICTOR stands bloodied but victorious. LOSER gave as good as they got!',
    'VICTOR scrapes by, narrowly defeating LOSER.',
    'VICTOR wins over LOSER by a hair.',
    'VICTOR and LOSER are evenly matched, but VICTOR comes out ahead.',
    'A close one, but VICTOR wins.',
  ],
}

export const ladderTexts: Record<string, string[]> = {
  TOP: [
    'is the champion',
    'is the big cheese',
    'is top banana',
    'is supreme ruler',
    'is the coolest chatter',
    'is the gout gamer',
    'is based and RPG pilled',
    'probably cheated',
    'is the raid boss',
    'is on top',
  ],

  TOP_PLURAL: [
    'are the champions',
    'are the big cheeses',
    'are top bananas',
    'are supreme rulers',
    'are the coolest chatters',
    'are gout gamers',
    'are based and RPG pilled',
    'probably cheated',
    'are the raid bosses',
    'are on top',
  ],

  BOTTOM: [
    "is everyone's best friend",
    'had their lunch money taken',
    'has the best personality',
    'is making the room brighter',
    "can't seem to catch a break",
    'is a sweet summer child',
    'gave peace a chance',
  ],

  BOTTOM_PLURAL: [
    "are everyone's best friends",
    'had their lunch money taken',
    'are making the room brighter',
    "can't seem to catch a break",
    'are sweet summer children',
    'gave peace a chance',
  ],

  WINS: [
    'has the most bedpost notches',
    'has the biggest tally',
    'sits on a throne of skulls',
    'has been winning a lot',
  ],

  WINS_PLURAL: [
    'have the most bedpost notches',
    'have the biggest tallies',
    'sit on a throne of skulls',
    'have been winning a lot',
  ],

  LOSS: [
    'has the worst luck',
    "can't catch a break",
    'needs to work on their technique',
    'has found inner peace',
    'will turn it around soon',
    'is a victim of variance',
    'has taken the most Ls',
  ],

  LOSS_PLURAL: [
    'have the worst luck',
    "can't catch a break",
    'need to work on their technique',
    'have found inner peace',
    'will turn it around soon',
    'are victims of variance',
    'have taken the most Ls',
  ],
}
