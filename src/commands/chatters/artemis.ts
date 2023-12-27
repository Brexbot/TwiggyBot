import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, SimpleCommandOptionType } from 'discordx'

@Discord()
class Artemis {
  protected facts = [
    'Viggo Mortensen bought 3 horses that were used in the films.',
    "The son of Tolkien does not like the LotR movies. (He's wrong)",
    'Sean Bean climbed the mountains of New Zealand daily to get to the set. Due to being scared to ride in a helicopter.',
    'The LotR movies cost less to make compared to the Hobbit films.',
    'Christopher Lee met Tolkien by coincidence.',
    'Pippin named his son Faramir.',
    'The Beatles tried to make their own LotR movie.',
    'During filming Christopher Lee corrected Peter Jackson on the appropriate sound a man would make when he was stabbed in the back, stating "do you know what it actually sounds "like when someone is stabbed? Because I do."',
    'Merry was originally named Marmaduke Brandybuck.',
    'Billy Boyd wrote the music for the song "Edge of Night" which he sings in Denethor\'s halls.',
    'The theatrical edition of the movies is 9h6m. The extended edition is 11h22m.',
    "All of the mountains on Saturn's largest moon are named after the mountains from LotR.",
    'John Noble (Denethor) ate sloppily because he was starved before filming to "make the greed more real"',
    "After filming, the entire fellowship got matching elvish tattoos, save for John Rhys Davis, as he did not want to get a tattoo. Instead Gimli's stuntman got the tattoo in his place.",
    'Tolkien did not receive the total amount he was owed for the LotR Trilogy.',
    'Tolkien originally did not want to name the third book The Return of the King because it revealed too much about the story.',
    'Tolkien and his wife\'s gravestones are engraved with two names from the Silmarillion, Beren and Luthien, the characters in "the greatest love story he ever wrote" according to Tolkien.',
    'The University of California offers a LotR dorm for its freshmen.',
    "We don't talk about the Hobbit movies.",
    'Frodo is depicted as a clumsy character in the films, falling 39 times.',
    "Christopher Lee is the only cast member to have met Tolkien, and always wanted to play the role of Gandalf which he received Tolkien's blessing to play.",
    'Nicolas Cage was originally supposed to play the role of Aragorn.',
    'The fight scenes were choreographed by an Olympic fencer, who described Viggo Mortensen as "the best Sword fighter i have ever trained"',
    'Viggo Mortensen did his stunts without a double (he also broke his toe)',
    'Orlando Bloom broke his ribs during filming.',
    'John Rhy-Davies (Gimli) is the tallest actor in the fellowship.',
    "Peter Jackson's daughter makes several cameos throughout the films.",
    'Denethor could not light the pyre on fire.',
    'The Queen of Denmark illustrated the Danish edition of LotR.',
    'Nazgul screeches were made with plastic cups.',
    'The game of golf canonically exists in Middle Earth.',
    'The Gollum Effect was loosely based on the withdrawal symptoms of heroin addicts.',
    "The battle of Helm's Deep took 4 months to film.",
    'Did you know, the Urukhai who threw the knife at Aragorn was supposed to miss, but he got too into the scene, but then Viggo simply "Aragorned" the knife away?',
    'Gollums were originally kind creatures.',
    "The Dead Marshes were said to be based on Tolkien's experience in WWI.",
    'Sean Astin was knocked unconscious during filming. He also suffered a deep laceration to his foot.',
    'The LotR franchise has won every award it was nominated for.',
    'Jake Gyllenhaal auditioned to play Frodo.',
    'Vin Diesel, Liam Neeson, and Uma Thurman were up for roles.',
    'Bill the pony was two people in a horse costume.',
    'Sean Bean was reading his script during the council of Elrond scene.',
    "The uruk-hai at Helm's Deep are New Zealand cricket fans.",
    'Aragorn is the hottest character in the movies.',
    'Most of the Rohirrim are actually women in fake beards, as the production found it hard to find enough male horse riders.',
    "Weta Workshop had to keep asking the stuntmen playing soldiers/orcs to be more gentle with the swords they made, as they kept breaking swords and injuring each other. (The stuntmen didn't listen)",
    'Tolkien once received a goblet as a gift with the script of the one ring around the top. As the language was of Mordor and as such, a cursed language, he used it as an ashtray instead.',
  ]

  @SimpleCommand({ name: 'artemis', description: 'Artemis', prefix: '!' })
  async simple(
    @SimpleCommandOption({ name: 'text', type: SimpleCommandOptionType.String }) text: string | undefined,
    command: SimpleCommandMessage
  ) {
    await command.message.channel.send({
      content: this.facts[Math.floor(Math.random() * this.facts.length)],
    })
    return
  }
}
