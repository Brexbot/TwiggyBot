import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, SimpleCommandOptionType } from 'discordx'

@Discord()
class Artemis {
  protected facts = [
    '0. Lord Of The Rings Facts Infographics',
    '1. Viggo Mortensen bought 3 horses that were used in the films.',
    '2. The son of Tolkien does not like the LotR books that Peter Jackson wrote.',
    '3. Sean Bean climbed the mountains of New Zealand daily to get to the set.',
    '4. The LotR movies cost less to make compared to the Hobbit films.',
    '5. Christopher Lee met Tolkien by coincidence.',
    '6. The Beatles tried to make their own LotR movie.',
    '7. Merry originally had a different name.',
    "8. Peter Jackson's LotR movies takes almost half a day to finish.",
    "9. All the mountains on Saturn's largest moon is named after the mountains from LotR.",
    '10. Elijah Wood immersed himself in the role of Frodo for his audition tape.',
    '11. John Rhys-Davies refused to get his matching Elvish tattoo with his fellowship. ',
    '12. Tolkien did not receive the total amount he was owed for the LotR Trilogy.',
    "13. Filming the destruction of Sauron's tower was difficult.",
    '14. The LotR trilogy could not fully make use of CGI for its effects. ',
    '15. Tolkien originally did not want to name the third book The Return of the King.',
    "16. Tolkien and his wife's gravestones are engraved with two names from LotR.",
    '17. The University of California offers a LotR dorm for its freshmen.',
    '18. Frodo is depicted as a clumsy character in the films.',
    '19. Christopher Lee has always wanted to play the role of Gandalf. ',
    '20. Nicolas Cage was originally supposed to play the role of Aragorn.',
    '21. The fight scenes were choreographed by an Olympic fencer.',
    '22. Viggo Mortensen did his stunts without a double.',
    '23. Orlando Bloom broke his ribs during filming. ',
    '24. John Rhy-Davies is the tallest actor in the fellowship. ',
    "25. Peter Jackson's daughter makes several cameos throughout the films.",
    '26. Denethor could not light the pyre on fire.',
    '27. Green ping pong balls were used as stand-ins. ',
    '28. The Queen of Denmark illustrated the Danish edition of LotR.',
    '29. Nazgul screeches were made with plastic cups. ',
    '30. The Gollum Effect was loosely based on the withdrawal symptoms of heroin addicts.',
    "31. The filming of the battle of Helm's Deep took forever to finish.",
    '32. Gollums were originally kind creatures. ',
    "33. The Dead Marshes were said to be based on Tolkien's experience in WWI.",
    '34. Sean Astin was knocked unconscious during filming.',
    '35. The LotR franchise has won every award it was nominated for.',
    'https://www.youtube.com/watch?v=xqeYKf8tdsU', // Bonus answer
  ]

  @SimpleCommand({ name: 'artemis', description: 'Artemis', prefix: '!' })
  async simple(
    @SimpleCommandOption({ name: 'text', type: SimpleCommandOptionType.String }) text: string | undefined,
    command: SimpleCommandMessage
  ) {
    await command.message.reply({
      content: this.facts[Math.floor(Math.random() * this.facts.length)],
    })
    return
  }
}
