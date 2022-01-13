import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'

@Discord()
abstract class hibob {
  private timeout = 60 * 60 * 24 // Cooldown of 1 day.
  private lastHibob = 0 // Initializes most recent succesful message time.
  private bobID = '104908485266817024' // Bob's user ID.
  
  @On('messageCreate')
  private onMessage(
    [message]: ArgsOf<'messageCreate'>
  ) {
    if (message.author.id === this.bobID && !this.inTimeout()) {
      message.channel.send(`Hi, ${message.member}!`)
      this.lastHibob = Math.floor(new Date().getTime() / 1000)
    }
  }
  
  private inTimeout(): boolean {
    return (Math.floor(new Date().getTime() / 1000)
             - this.lastHibob) < this.timeout
  }
}