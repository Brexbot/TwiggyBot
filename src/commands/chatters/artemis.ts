import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, SimpleCommandOptionType } from 'discordx'

@Discord()
class Artemis {
  protected facts = [
    'Viggo Mortensen (Aragorn) bought 3 horses that were used in the films.',
    "The son of Tolkien does not like the LotR movies. (He's wrong)",
    'Sean Bean climbed the mountains of New Zealand in full costume daily to get to the set, due to being too scared to ride in a helicopter.',
    'The LotR movies cost less to make compared to the Hobbit films.',
    'Billy Boyd (Pippin) named his son Faramir.',
    'The Beatles tried to make their own LotR movie.',
    'During filming Christopher Lee (Saruman) corrected Peter Jackson on the appropriate sound a man would make when he was stabbed in the back, stating, “Do you know what it actually sounds like when someone is stabbed? Because I do.”',
    'Merry was originally named Marmaduke Brandybuck.',
    "Billy Boyd (Pippin) wrote the music for the song “Edge of Night” which he sings in Denethor's halls. ",
    'The theatrical edition of the movies is 9h18m. The extended edition is 11h22m.',
    "All of the mountains on Saturn's largest moon are named after the mountains from LotR.",
    'John Noble (Denethor) ate sloppily because he was starved for a month before filming to “make the greed more real”',
    "After filming, the entire fellowship got matching elvish tattoos, save for John Rhys Davies (Gimli), as he did not want to get a tattoo. Instead Gimli's stuntman got the tattoo in his place.",
    'Tolkien originally did not want to name the third book The Return of the King because it revealed too much about the story.',
    "Tolkien's and his wife's gravestones are engraved with two names from the Silmarillion, Beren and Luthien, the characters in “the greatest love story he ever wrote” according to Tolkien. ",
    'The University of California offers a LotR dorm for its freshmen.',
    "We don't talk about the Hobbit movies.",
    'Frodo is depicted as a clumsy character in the films, falling 39 times.',
    'Christopher Lee is the only cast member to have met Tolkien, and always wanted to play the role of Gandalf, he was very happy to be involved and play Sauruman however and stated he was always thinking about whether Tolkien would have approved.',
    'Nicolas Cage was originally supposed to play the role of Aragorn.',
    'The fight scenes were choreographed by an Olympic fencer, who described Viggo Mortensen as “the best Sword fighter i have ever trained”',
    'Viggo Mortensen (Aragorn) did most of his stunts (he also broke his toe)',
    'Orlando Bloom (Legolas) fell off his horse and broke his rib during filming. The cast enjoyed making fun of how “whingy” he was.',
    'John Rhy-Davies (Gimli) is the tallest actor in the fellowship.',
    "Peter Jackson's daughter makes several cameos throughout the films.",
    'The Queen of Denmark illustrated the Danish edition of LotR.',
    'Nazgul screeches were made with plastic cups.',
    'The game of golf canonically exists in Middle Earth.',
    "The battle of Helm's Deep took 4 months to film and was edited down from 20 hours of footage.",
    "Did you know, the Urukhai who threw the knife at Aragorn was supposed to miss, but the actor couldn't see well in those prosthetics so he threw it right at Viggo Mortensen, but then Viggo simply “Aragorned” the knife away?",
    "The Dead Marshes were said to be based on Tolkien's experience in WWI.",
    'Sean Astin (Samwise) was knocked unconscious during filming. He also suffered a deep laceration to his foot.',
    'Jake Gyllenhaal auditioned to play Frodo.',
    'Vin Diesel, Liam Neeson, and Uma Thurman were up for roles.',
    'Bill the pony was played by two people in a horse costume on the blizzard scenes in the mountains.',
    'Sean Bean was reading the speech from his knee during the council of Elrond scene. There was a last minute script revision that he got that same day.',
    "The war cries of the uruk-hai at Helm's Deep are New Zealand cricket fans.",
    "Aragorn is the hottest character in the movies (it's actually Éomer)",
    'Most of the Rohirrim are actually women in fake beards, as the production found it hard to find enough male horse riders.',
    "Weta Workshop had to keep asking the stuntmen playing soldiers/orcs to be more gentle with the swords they made, as they kept breaking swords and injuring each other. (The stuntmen didn't listen)",
    'The eagles were fucking busy.',
    'There was a copy of all three books on set at all times during filming.',
  ]

  @SimpleCommand({ name: 'artemis', description: 'Artemis' })
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
