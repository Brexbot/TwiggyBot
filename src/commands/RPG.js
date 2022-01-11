const cyrb53 = function(str, seed = 0) {
    // Hash the input string to int
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
};

const mulberry32 = function(a) {
    // a is a seed, returns a simple seeded RNG function from then.
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const get_random_element = function(a, rng)    {
    // returns a random element from a, 
    // calling rng argument to get random number.
    // Uses Math.random as a fallback
    if (rng === undefined)  {rng = Math.random;}
    return a[Math.floor(rng()*a.length)];
}

const to_title_case = function(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1);
    }
  );
}

const roll_dy_x_times_pick_z = function(sides, total, pick, rng)   {
    // Roll $total d$sides dice, and sum the top $pick results
    // if provided, the $rng argument is used for random numbers,
    // else the Math.random is used. This allows a seeded RNG to be used.
    if (rng === undefined) { rng = Math.random; }
    var rolls = [];
    for (var i = 0; i < total; i++) {
        rolls.push(Math.floor(rng()*sides + 1));
    }
    rolls.sort().reverse()
    return rolls.slice(0, pick).reduce((a, b) => a + b, 0);
};

class RPG  {
    // CONSTANTS
    static MAX_ROUNDS = 10;
    static OUT_WIDTH = 35;


    // Alignments are built as "$ADJECTIVE $NOUN", these lists contain them
    static adjectives = [
        "chaotic",
        "neutral",
        "lawful",
        "ordered",
        "inspired",
        "performative",
        "angry",
        "hard",
        "soft",
        "low-key",
        "based",
        "woke",
        "projected",
        "mailicious",
        "directed",
        "memetic",
        "bureaucratic",
        "loving",
        "organised",
        "frustrated",
        "enlightend",
        "absurd",
        "frustrated",
        "indifferent",
        "apathetic",
        "contented",
        "cynical",
        "riteous",
        "indulgent",
        "pragmatic",
        "postmodern"
        ];

    static nouns = [
        "evil",
        "neutral",
        "good",
        "stupid",
        "zen",
        "angry",
        "coffee",
        "food",
        "heroic",
        "meme",
        "inactive",
        "pretty",
        "ugly",
        "wahoo",
    	"horny"
    ];

    // List of possible classes.
    // the first entry is the name, 
    // the second is a list of 6 stats in order, these define the order
    // of preference for attacking with this stat. 
    // i.e. the artificer will attack primarily with INT
    static classes = [
        ["artificer", ['INT', 'WIS', 'DEX', 'CHR', 'CON', 'STR']],
        ["barbarian", ['STR', 'CON', 'DEX', 'CHR', 'WIS', 'INT']],
        ["bard", ['CHR', 'WIS', 'INT', 'DEX', 'CON', 'STR']],
        ["cleric", ['WIS', 'CHR', 'CON', 'STR', 'DEX', 'INT']],
        ["druid", ['WIS', 'INT', 'STR', 'CON', 'DEX', 'CHR']],
        ["fighter", ['DEX', 'STR', 'CON', 'CHR', 'INT', 'WIS']],
        ["monk", ['DEX', 'CHR', 'STR', 'WIS', 'CON', 'INT']],
        ["paladin", ['CHR', 'STR', 'INT', 'CON', 'WIS', 'DEX']],
        ["ranger", ['DEX', 'WIS', 'INT', 'CON', 'CHR', 'STR']],
        ["rogue", ['DEX', 'CHR', 'STR', 'CON', 'WIS', 'INT']],
        ["sorcerer", ['INT', 'CHR', 'WIS', 'DEX', 'CON', 'STR']],
        ["warlock", ['INT', 'WIS', 'CHR', 'CON', 'DEX', 'STR']],
        ["wizard", ['INT', 'WIS', 'CHR', 'CON', 'DEX', 'STR']],
        ["warrior", ['STR', 'CON', 'DEX', 'CHR', 'WIS', 'INT']],
        ["thief", ['DEX', 'CHR', 'WIS', 'INT', 'STR', 'CON']],
        ["motorcycle knight", ['DEX', 'CHR', 'STR', 'CON', 'INT', 'WIS']],
        ["bardbarian", ['STR', 'CHR', 'CON', 'DEX', 'WIS', 'INT']],
        ["person-at-Arms", ['CON', 'STR', 'DEX', 'CHR', 'INT', 'WIS']],
        ["librarian", ['INT', 'CHR', 'WIS', 'DEX', 'CON', 'STR']],
        ["jedi", ['DEX', 'WIS', 'CHR', 'CON', 'STR', 'INT']],
        ["strangler", ['DEX', 'STR', 'INT', 'WIS', 'CON', 'CHR']],
        ["battle felon", ['CHR', 'STR', 'CON', 'DEX', 'INT', 'WIS']],
        ["pugalist", ['STR', 'DEX', 'CON', 'CHR', 'WIS', 'INT']],
        ["documancer", ['INT', 'WIS', 'DEX', 'CON', 'STR', 'CHR']],
        ["mathemagician", ['WIS', 'INT', 'DEX', 'CON', 'STR', 'CHR']],
        ["tourist", ['CON', 'DEX', 'CHR', 'WIS', 'INT', 'STR']],
        ["valkyrie", ['DEX', 'STR', 'CON', 'WIS', 'INT', 'CHR']],
        ["juggler",['DEX', 'CHR', 'INT', 'STR', 'CON', 'WIS']],
        ["CEO", ['CHR', 'INT', 'STR', 'CON', 'DEX', 'WIS']],
        ["drunken master", ['DEX', 'CON', 'WIS', 'CHR', 'INT', 'STR']],
        ["chaotician", ['WIS', 'INT', 'CHR', 'DEX', 'STR', 'CON']],
        ["prankster", ['CHR', 'DEX', 'WIS', 'INT', 'STR', 'CON']],
        ["anarchist", ['CHR', 'INT', 'STR', 'CON', 'DEX', 'WIS']],
        ["pacifist", ['CHR', 'WIS', 'INT', 'CON', 'DEX', 'STR']],
        ["tactician", ['INT', 'STR', 'CHR', 'WIS', 'CON', 'DEX']],
        ["bureaucrat", ['INT', 'STR', 'CON', 'DEX', 'WIS', 'CHR']],
        ["mecha-pilot", ['DEX', 'WIS', 'INT', 'CON', 'CHR', 'STR']],
        ["disarmorer", ['WIS', 'INT', 'CHR', 'DEX', 'STR', 'CON']],
        ["potwash", ['DEX', 'WIS', 'CON', 'INT', 'CHR', 'STR']],
        ["waifu", ['CHR', 'DEX', 'STR', 'CON', 'WIS', 'INT']]
    ];

    // This list contains the possible species.
    // The first entry is the name,
    // the second list contains stat bonuses.
    // Each appearance in the list adds 1 to that stat.
    static species = [
        ["Dwarf", ['CON', 'CON', 'STR']],
        ["Elf", ['INT', 'WIS', 'DEX']], 
        ["Halfling", ['DEX', 'CHR', 'CHR']],
        ["Human", ['CON', 'DEX', 'STR']],
        ["Dragonborn", ['CON', 'STR', 'WIS']],
        ["Gnome", ['DEX', 'DEX', 'DEX']],
        ["Half-Elf", ['WIS', 'CON', 'CHR']],
        ["Half-Orc", ['STR', 'STR', 'CON']],
        ["Tiefling", ['WIS', 'WIS', 'DEX']],
        ["Dire-Manatee", ['INT', 'INT', 'WIS']],
        ["Half-Goat", ['DEX', 'DEX', 'STR']],
        ["Reverse-Mermaid", ['CHR', 'CHR', 'DEX']],
        ["Reverse-Centaur", ['STR', 'DEX', 'DEX']],
        ["Satyr", ['INT', 'INT', 'DEX']],
        ["Double-Hobbit", ['CHR', 'CHR', 'CHR']],
        ["Long-Goblin", ['DEX', 'CON', 'CON']],
        ["Double half-orc", ['STR', 'STR', 'STR']],
        ["Gingerbrute-Person", ['CHR', 'INT', 'INT']],
        ["Sock Demon", ['INT', 'CHR', 'CHR']],
        ["Metalhead", ['CHR', 'WIS', 'STR']],
        ["Beer Elemental", ['CON', 'CON', 'CHR', 'CHR']]
    ];

    // Combat works with a weak rock-paper-scissors advantage
    // This list defines that,
    // i.e. STR has advantage over DEX and CON.
    static advantages = {
        'STR':['DEX', 'CON'],
        'DEX':['CON', 'INT'],
        'CON':['INT', 'WIS'],
        'INT':['WIS', 'CHR'],
        'WIS':['CHR', 'STR'],
        'CHR':['STR', 'DEX']
    };

    // This contains the attack strings.
    // The attacker chooses a stat to attack with,
    // then selects a random description from the appropriate list.
    // "ATK" gets replaced with the attacker name, 
    // "DEF" gets replaced with the defender name
    static attack_texts = {
        'STR':[
            "ATK swings a wild haymaker at DEF,",
            "ATK throws a punch at DEF,",
            "ATK goes in for the bear hug,",
            "ATK tries to crush DEF like a bug,",
            "ATK hurls a boulder at DEF,",
            "ATK advances menacingly,",
            "ATK does a shoryuken,",
    		"ATK tries to bonk DEF on the noggin,",
    		"ATK yeets DEF,"
            ],
        'DEX':[
            "ATK lunges at DEF,",
            "ATK darts in with an attack,",
            "ATK throws a rock,",
            "ATK unleashes a flurry of blows",
            "ATK sneaks up on DEF,",
            "ATK shoots an arrow at DEF,",
            "ATK begins the 5 point exploding heart technique,",
            "ATK pulls off a special move,",
    		"ATK starts throwing hands,"
            ],
        'CON':[
            "ATK flexes at DEF,",
            "ATK bull-charges DEF,",
            "ATK challenges DEF to a drinking contest,",
            "ATK body slams DEF,",
            "ATK shows off their hot bod,",
            "ATK winks at DEF,",
    		"ATK starts throwing shapes,"
            ],
        'INT':[
            "ATK throws a fireball at DEF,",
            "ATK unleashes a psychic assault,",
            "ATK plays a face-down card and ends their turn,",
            "ATK outsmarts DEF,",
            "ATK points their finger of death at DEF,",
            "ATK reads the dictionary at DEF,",
    		"ATK throws a spirit bomb at DEF,"
            ],
        'WIS':[
            "ATK calls on a higher power to smite DEF,",
            "ATK orders their animal companion to attack,",
            "ATK believes in themself,",
            "ATK springs an ambush,",
            "ATK enacts a cunning plan,",
            "ATK appeals to DEF\'s better nature,",
    		"ATK casts turn undead,"
            ],
        'CHR':[
            "ATK says mean things about DEF,",
            "ATK cancels DEF on Twitter,",
            "ATK bombards DEF with discord pings,",
            "ATK starts the crowd chanting,",
            "ATK drops a truth bomb on DEF,",
            "ATK taunts DEF,",
            "ATK reads DEF their rights,"
            ]
    }

    // If the defence is successful, this set of strings is chosen from
    // according to the stat the defender defended with 
    // "ATK" gets replaced with the attacker name, 
    // "DEF" gets replaced with the defender name
    static defence_success_texts = {
        'STR':[
            "but DEF pushes them over.",
            "but DEF simply flexes.",
            "but it glances off DEF\'s washboard abs.",
            "but DEF is a force of nature.",
            "but DEF is having none of it.",
            "but DEF is too strong.",
    		"but DEF is too stacked.",
    		"but DEF is built like a brick shithouse."
            ],
        'DEX':[
            "but DEF dodges the attack.",
            "but DEF is nowhere to be seen!",
            "but DEF is somewhere else.",
            "DEF parries!",
            "DEF counters with pocket sand!",
            "but DEF narrowly avoids it.",
    		"but DEF sidesteps."
            ],
        'CON':[
            "but DEF stands impervious.",
            "but DEF hardly notices.",
            "but DEF ignores it.",
            "but DEF isn\'t affected.",
            "but DEF is built of sterner stuff.",
            "it\'s not very effective.",
            "DEF takes it on the chin.",
    		"DEF just blinks.",
    		"but DEF goes super saiyan!"
            ],
        'INT':[
            "but DEF reads them like a book.",
            "but DEF uses their brain wrinkles to counter.",
            "but DEF teleports away.",
            "but DEF casts stoneskin for extra armor.",
            "but DEF knows better.",
            "but DEF shouts COUNTERSPELL!",
    		"but DEF outsmarts them.",
    		"but DEF is one step ahead."
            ],
        'WIS':[
            "but DEF is protected by divine light.",
            "but DEF is saved by their animal companion.",
            "but DEF doesn\'t believe in damage.",
            "but DEF has other ideas.",
            "but DEF already prepared for that.",
            "but DEF has other plans.",
            "but DEF is destined for greater things.",
            "but DEF just turns the other cheek.",
    		"DEF meditates through the attack."
            ],
        'CHR':[
            "but DEF just laughs, unnerving ATK.",
            "but DEF convinces them it\'s a bad idea.",
            "but DEF talks them out of it.",
            "but DEF distracts them.",
            "but DEF just cracks wise.",
            "but DEF just shouts them down.",
            "but DEF talks their way out of it.",
            "but DEF is too pretty.",
    		"but DEF gets the crowd on their side."
            ]
    }

    // If the defence fails, then text is selected from this set.
    // "ATK" gets replaced with the attacker name, 
    // "DEF" gets replaced with the defender name
    // "DMG" gets replaced with the damage value.
    static defence_failure_texts = {
        'STR':[
            "and DEF\'s strength fails, taking DMG damage.",
            "and DEF can\'t resist the DMG damage.",
            "and DEF is too weak to prevent the DMG damage.",
            "overpowering DEF\'s defence inflicting DMG damage.",
            "and DEF can\'t quite get the upper hand. DMG damage.",
            "and DEF can\'t push through. DMG damage.",
    		"DEF's muscles aren't big enough to avoid the DMG damage."
            ],
        'DEX':[
            "and DEF is too slow to get out the way, eating DMG damage.",
            "DEF fails to dodge. DMG damage done.",
            "DEF didn\'t react in time and takes DMG damage.",
            "DEF stumbles and takes the full DMG damage.",
            "and DEF gets the parry timing wrong, taking DMG damage.",
            "DEF takes DMG damage and blames lag.",
    		"DEF walks right into the DMG damage.",
    		"DEF\'s fancy footwork isn't enough. DMG damage."
            ],
        'CON':[
            "and DEF takes the full DMG damage.",
            "and DEF blocks it with their face taking DMG damage.",
            "and DEF can\'t resist the DMG damage.",
            "DEF is left with DMG fewer hit points.",
            "and DEF isn\'t tough enough to resist the DMG damage.",
            "and DEF isn\'t tough enough to ignore DMG damage.",
    		"DEF\'s is less healthy after the DMG damage."
            ],
        'INT':[
            "and DEF reacts poorly suffering DMG damage.",
            "and DEF has a smooth brain moment resulting in DMG damage.",
            "and DEF didn\'t see the DMG damage coming.",
            "and DEF\'s counterspell fizzles, taking DMG damage.",
            "DEF forgot the words to their spell and takes DMG damage.",
            "DEF doesn\'t know what hit them. DMG damage.",
    		"and DEF can\'t think of a solution to the DMG damage."
            ],
        'WIS':[
            "and DEF\'s power abandons them, taking DMG damage.",
            "and DEF wasn\'t prepared for that, taking DMG damage.",
            "and DEF didn\'t expect it. DMG damage done.",
            "and DEF\'s faith falters suffering DMG damage.",
            "DEF turns the other cheek. It gets hit for DMG damage.",
            "DEF is caught off guard, suffering DMG damage.",
    		"and DEF didn\'t try hard enough. DMG damage."
            ],
        'CHR':[
            "and DEF\'s laughter is not the best medicine. DMG damage.",
            "and DEF\'s talking doesn\'t stop the DMG damage.",
            "cutting DEF off mid sentence and inflicting DMG damage.",
            "interrupting DEF\'s monologue and inflicting DMG damage.",
            "and DEF is left speechless. DMG damage.",
            "and DEF has no reply. DMG damage.",
    		"and DEF is tongue-tied. DMG damage."
            ]
    };

    // Finally, it selects a random concluding message.
    // VICTOR is replaced with the winner's name
    // LOSER is replaced with the loser's name
    static victory_texts = [
        "LOSER falls and VICTOR wins!",
        "LOSER is smashed like a bowl of eggs. VICTOR wins!",
        "LOSER taps out. VICTOR wins!",
        "Sucks to suck LOSER, VICTOR wins!",
        "LOSER can't go on, VICTOR wins!",
        "VICTOR stands victorious, LOSER is left to lick their wounds.",
        "VICTOR wins! GG go next.",
        "VICTOR wins! GG no re.",
        "LOSER faints.",
        "LOSER can\'t take it any more, VICTOR wins!",
        "LOSER is outplayed, VICTOR is the winner!",
    	"Winner winner chicken dinner for VICTOR. LOSER starves.",
        "VICTOR wins! LOSER thinks the game is rigged!"
    ];

    // The stat generating code counts these letters and 
    // improves the corresponding stat.
    static preferred_letter = {'CON':'C', 'DEX':'D', 'STR':'S', 'CHR':'T', 'WIS':'W', 'INT':'I'};

    static get_character(istr, as_string)    {
    	// Main driver function that takes the string $istr and generates the character
    	// $as_string is a bool, flagging if the character should be 
    	// returned as a string for printing, or a dict for further use.

        // Get the seed by hashing the input string
        var num = cyrb53(istr);
    	// then seed the RNG
        var rng = mulberry32(num);


    	// Silly easter egg, to give Rex (and only rex), the "Bananasaurus" specie 
    	// otherwise get the name and stat mods from the list
        if (istr == "Brex#0001")    {
            var specie = "Bananasaurus";
            var stat_mods = ['DEX', 'WIS', 'CON', 'INT', 'CHR', 'STR'];
        }   else    {
            var specie = this.species[num%this.species.length][0];
            var stat_mods = this.species[num%this.species.length][1];
        }

    	// get the class from the list
        var cres = get_random_element(this.classes, rng);
        var c_class = cres[0];
        var init_choices = cres[1];
    	
    	// move choices are set by adding each stat to the list
    	// if there are 6 entries, the first is added 6 times, the second
    	// is added 5 times, the 3rd 4 times, etc...
    	var move_choices = [];
    	for (var i = 0; i < init_choices.length; i++)	{
    		for (var j = 0; j < init_choices.length - i; j++)	{
    			move_choices.push(init_choices[i]);
    		}
    	}

    	// Build the alignment from the lists
        var adjective = get_random_element(this.adjectives, rng);
        var noun = get_random_element(this.nouns, rng);
        var alignment = to_title_case(`${adjective} ${noun}`);

        // count the number of "2" in istr, minimum of 1.
        // Twos are cursed, so ya get better stats
        var twos = istr.split("2").length - 1;

    	// generate HP as N d6 choose HIT_DICE
        var HIT_DICE = 4;
        var hp = roll_dy_x_times_pick_z(6, HIT_DICE + twos + 2, HIT_DICE, rng);

        var stats = {
            'CON':0, 
            'STR':0,
            'DEX':0,
            'WIS':0,
            'INT':0,
            'CHR':0
        };

        var ustr = istr.toUpperCase();

        var skeys = Object.keys(stats)

        for (var i = 0; i < skeys.length; i++ )  {
            // Roll stats by counting the occurence of the stat name in istr
            // Having that letter turn up in your name has got to be good right?
            // Final score is sum of best 3 of d6 rolled.
            var s = skeys[i];
            var total_rolls = 1 + Math.max(ustr.split(this.preferred_letter[s]).length + twos, 2);
            stats[s] = roll_dy_x_times_pick_z(6, total_rolls, 3, rng);
        }

        // Now add this.species modifier.
        for (var i = 0; i < stat_mods.length; i++)    {
            stats[stat_mods[i]] += 1;
        }

    	// Stuff the data into a dict defining the character
        var character_block = {
                'name':istr,
                'specie':specie,
                'class':c_class,
                'move_choices':move_choices,
                'alignment':alignment,
                'hp':hp,
                'STR':stats['STR'],
                'DEX':stats['DEX'],
                'CON':stats['CON'],
                'INT':stats['INT'],
                'WIS':stats['WIS'],
                'CHR':stats['CHR']
            };

        // Output result, either as string or as dict.
        if (as_string)  {
            return this.print_statblock(character_block);
        }   else    {
            return character_block;
        }
    };

    static print_statblock(stats)  {
        var ostr = `\`\`\`\n${stats['name']}\n`;
        ostr += "-".repeat(stats['name'].length) + "\n";
        ostr += to_title_case(`${stats['specie']} ${stats['class']}`) + "\n";
        ostr += `Alignment: ${stats['alignment']}` + "\n";
        ostr += `HP: ${stats['hp']}` + "\n";
        ostr += " STR | DEX | CON | INT | WIS | CHR \n";
        ostr += `  ${stats['STR'].toString().padStart(2, ' ')} |  ${stats['DEX'].toString().padStart(2, ' ')} |  ${stats['CON'].toString().padStart(2, ' ')} |  ${stats['INT'].toString().padStart(2, ' ')} |  ${stats['WIS'].toString().padStart(2, ' ')} |  ${stats['CHR'].toString().padStart(2, ' ')} \n`
        ostr += "\`\`\`"
        return ostr;
    }

    static get_move(attacker, defender)  {
    	// Select the attack and defence stats
        var attack = get_random_element(attacker['move_choices']);
        var defence = get_random_element(defender['move_choices']);

    	// Advantage grants a re-roll for the roll, so check the 
    	// rock-paper-scissors advantage list to see if it applies to either
    	// Uses fact that false = 0 and true = 1
        var attack_rr = this.advantages[attack].includes(defence);
        var defence_rr = this.advantages[defence].includes(attack);

    	// Calculate stat modifier as Floor(STAT/2) - 5, as in DnD.
        var attack_roll = roll_dy_x_times_pick_z(20, 1 + attack_rr, 1) + Math.floor(attacker[attack]/2) - 5;
        var defence_roll = roll_dy_x_times_pick_z(20, 1 + defence_rr, 1) + Math.floor(defender[defence]/2) - 5;

    	// Attacker text is always got by taking a random element from the relevant dict entry
        var text = get_random_element(this.attack_texts[attack]);

    	// Attack is resolved simply as whoever rolls highest. Meets-it beats-it, so attacker wins ties
        if (attack_roll >= defence_roll)  {
            text += " " + get_random_element(this.defence_failure_texts[defence]);
            var damage = roll_dy_x_times_pick_z(10, 1, 1);
        }   else    {
            text += " " + get_random_element(this.defence_success_texts[defence]);
            var damage = 0;
        }

        text = text.replace(/DEF/g, defender['name']).replace(/ATK/g,attacker['name']).replace(/DMG/g, damage.toString());

        return {'damage':damage, 'text': text};
    };

    static duel_names(name_1, name_2)  {
    	// Full driver function that runs the battle.
    	// Supply with two strings, returns the result and log text.
    	
    	// Generate the stat blocks from the names
        var stat_1 = this.get_character(name_1, false);
        var stat_2 = this.get_character(name_2, false);

    	// Prepare the headers for the printout
        var header_1 = this.print_statblock(stat_1).split('\n');
        var header_2 = this.print_statblock(stat_2).split('\n');

    	// Format it for vertical output.
        var log = "";
    	
        for (var i = 1; i < header_1.length - 1; i++)   {
            log += header_1[i].padEnd(this.OUT_WIDTH, ' ') + "\n";
        }
    	
    	log += "\n" + "+-------+".padStart(Math.floor(this.OUT_WIDTH/2), ' ').padEnd(Math.ceil(this.OUT_WIDTH/2), ' ') + "\n";
        log += "|  vs.  |".padStart(Math.floor(this.OUT_WIDTH/2), ' ').padEnd(Math.ceil(this.OUT_WIDTH/2), ' ') + "\n";
    	log += "+-------+".padStart(Math.floor(this.OUT_WIDTH/2), ' ').padEnd(Math.ceil(this.OUT_WIDTH/2), ' ') + "\n\n";
    	
    	for (var i = 1; i < header_2.length - 1; i++)   {
            log += header_2[i].padEnd(this.OUT_WIDTH, ' ') + "\n";
    	}
    	log += "\n";

        // Loop through until one stat block is out of HP, or 20 rounds are done.
        var rounds = 0;
        while (stat_1['hp'] > 0 && stat_2['hp'] > 0 && rounds < RPG.MAX_ROUNDS) {

            var initative_1 = roll_dy_x_times_pick_z(20, 1, 1) + Math.floor(stat_1['DEX']/2) - 5;
            var initative_2 = roll_dy_x_times_pick_z(20, 1, 1) + Math.floor(stat_2['DEX']/2) - 5;

            // name 2 has a slight advantage, eh, who cares?
            if (initative_1 > initative_2)    {
                var order = [stat_1, stat_2];
            }   else    {
                var order = [stat_2, stat_1];
            }

            for (var i = 0; i < 2; i++) {
                var attacker = order[i];  
                var defender = order[(i + 1)%2];
                var res = RPG.get_move(attacker, defender);
                defender['hp'] -= res['damage'];
                log += res['text'] + "\n";

                if (defender['hp'] <= 0)    {
                    break;
                }
            }
            rounds += 1;
        }

    	// Append the summary text to the log
        if (stat_1['hp'] <= 0)  {
            var victor = stat_2;
            var loser = stat_1;
        }   else if (stat_2['hp'] <= 0) {
            var victor = stat_1;
            var loser = stat_2;
        }   else    {
    		summary = `After ${RPG.MAX_ROUNDS} rounds they decide to call it a draw.`;
            log += summary;
            return {'log':log, 'winner':undefined, 'loser':undefined, 'summary':summary};
        }
        
        log += "=================\n";
        var summary = get_random_element(RPG.victory_texts).replace(/VICTOR/g, victor['name']).replace(/LOSER/g, loser['name']);
        log += summary

        return {'log':log, 'winner':victor['name'], 'loser':loser['name'], 'summary':summary};
    };
};