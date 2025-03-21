import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'

@Discord()
abstract class HiBlob {
  private cooldown = 60 * 60 * 6 // [seconds]. Cooldown of 6 hours.
  private lastBlobMessage = 0 // Initializes most recent message time from Blob.
  private blobID = '104908485266817024' // Blob's user ID.

  @On({ event: 'messageCreate' })
  private onMessage([message]: ArgsOf<'messageCreate'>) {
    if (message.author.id === this.blobID) {
      // Check whether it has been <cooldown> seconds since last message.
      if (!this.hasCooldown()) {
        message.channel.send(`Hi, Blob!`)
      }
      // Update most recent message time.
      this.lastBlobMessage = Math.floor(Date.now())
    }
  }

  private hasCooldown(): boolean {
    return Math.floor(Date.now()) - this.lastBlobMessage < this.cooldown * 1000
  }
}
