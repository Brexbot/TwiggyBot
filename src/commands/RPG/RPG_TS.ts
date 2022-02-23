import { Character } from "./Character";
import { get_random_element, roll_dy_x_times_pick_z } from "./util"
import { attack_texts, defence_failure_texts, defence_success_texts, victory_texts } from "./Dialogue"

// There can only be 6 different stats.
// Therefore, using an enum prevents typos begin treated as 
// mystery 7th stats.
// export type StatType = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHR";
// export const StatType = ["STR", "DEX", "CON", "INT", "WIS", "CHR"] as const;

type AttackResult = {
    text: string,
    damage: number
};

type FightResult = {
    log: string,
    winner_name?: string,
    loser_name?: string,
    summary: string
}

class RPG  {
    // CONSTANTS
    MAX_ROUNDS: number = 10;
    OUT_WIDTH: number = 35; 

    // Combat works with a weak rock-paper-scissors advantage
    // This list defines that,
    // i.e. STR has advantage over DEX and CON.
    advantages: Record<string, string[]> = {
        STR:["DEX", "CON"],
        DEX:["CON", "INT"],
        CON:["INT", "WIS"],
        INT:["WIS", "CHR"],
        WIS:["CHR", "STR"],
        CHR:["STR", "DEX"]
    };

    // The stat generating code counts these letters and 
    // improves the corresponding stat.

    get_move(attacker: Character, defender: Character)  {
    	// Select the attack and defence stats
        var attack_stat: string = get_random_element(attacker.move_choices);
        var defence_stat: string = get_random_element(defender.move_choices);

    	// Advantage grants a re-roll for the roll, so check the 
    	// rock-paper-scissors advantage list to see if it applies to either
    	// Uses unary + to convert false = 0 and true = 1
        var attack_rr = +this.advantages[attack_stat].includes(defence_stat);
        var defence_rr = +this.advantages[defence_stat].includes(attack_stat);

    	// Calculate stat modifier as Floor(STAT/2) - 5, as in DnD.
        var attack_roll = roll_dy_x_times_pick_z(20, 1 + attack_rr, 1) + Math.floor(attacker.stats[attack_stat]/2) - 5;
        var defence_roll = roll_dy_x_times_pick_z(20, 1 + defence_rr, 1) + Math.floor(defender.stats[defence_stat]/2) - 5;

    	// Attacker text is always got by taking a random element from the relevant dict entry
        var text = get_random_element(attack_texts[attack_stat]);

    	// Attack is resolved simply as whoever rolls highest. Meets-it beats-it, so attacker wins ties
        if (attack_roll >= defence_roll)  {
            text += " " + get_random_element(defence_failure_texts[defence_stat]);
            var damage = roll_dy_x_times_pick_z(10, 1, 1);
        }   else    {
            text += " " + get_random_element(defence_success_texts[defence_stat]);
            var damage = 0;
        }

        text = text.replace(/DEF/g, defender['name']).replace(/ATK/g,attacker['name']).replace(/DMG/g, damage.toString());

        return {'damage':damage, 'text': text};
    };

    duel_names(name_1: string, name_2: string): FightResult  {
    	// Full driver function that runs the battle.
    	// Supply with two strings, returns the result and log text.
    	
    	// Generate the stat blocks from the names
        var character_1 = new Character(name_1);
        var character_2 = new Character(name_2);

    	// Prepare the headers for the printout
        var header_1 = character_1.toString().split('\n');
        var header_2 = character_2.toString().split('\n');

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
        while (character_1['hp'] > 0 && character_2['hp'] > 0 && rounds < this.MAX_ROUNDS) {

            var initative_1 = roll_dy_x_times_pick_z(20, 1, 1) + Math.floor(character_1.stats['DEX']/2) - 5;
            var initative_2 = roll_dy_x_times_pick_z(20, 1, 1) + Math.floor(character_2.stats['DEX']/2) - 5;

            // name 2 has a slight advantage, eh, who cares?
            if (initative_1 > initative_2)    {
                var order = [character_1, character_2];
            }   else    {
                var order = [character_2, character_1];
            }

            for (var i = 0; i < 2; i++) {
                var attacker = order[i];  
                var defender = order[(i + 1)%2];
                var res = this.get_move(attacker, defender);
                defender['hp'] -= res['damage'];
                log += res['text'] + "\n";

                if (defender['hp'] <= 0)    {
                    break;
                }
            }
            rounds += 1;
        }

    	// Append the summary text to the log
        if (character_1['hp'] <= 0)  {
            var victor = character_2;
            var loser = character_1;
        }   else if (character_2['hp'] <= 0) {
            var victor = character_1;
            var loser = character_2;
        }   else    {
    		summary = `After ${this.MAX_ROUNDS} rounds they decide to call it a draw.`;
            log += summary;
            return {'log':log, 'summary':summary};
        }
        
        log += "=================\n";
        var summary = get_random_element(victory_texts).replace(/VICTOR/g, victor['name']).replace(/LOSER/g, loser['name']);
        log += summary

        var result = {'log':log, 'winner':victor['name'], 'loser':loser['name'], 'summary':summary};

        return result;
    };
};

var chr = new Character("Nose")
var chr2 = new Character("Background Nose#1628")
var rpg = new RPG();
var result = rpg.duel_names("Nose", "Background Nose#1628");

console.log(result.log)