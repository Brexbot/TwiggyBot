import { Presence } from 'discord.js'
import type { ArgsOf } from 'discordx'
import { Discord, On } from 'discordx'

@Discord()
export abstract class AppDiscord {
  private streamingRoleId = '730137929124675615'

  private isStreaming(presence: Presence): boolean {
    return presence.activities.some((activity) => activity.type === 'STREAMING')
  }

  @On('presenceUpdate')
  async onUpdate([oldPresence, newPresence]: ArgsOf<'presenceUpdate'>) {
    const role = newPresence.guild?.roles.cache.find((role) => role.id === this.streamingRoleId)
    if (!role) {
      console.error('Could not find the streaming role.')
      return
    }

    // User is streaming, it doesn't matter if we add the role multiple times
    if (this.isStreaming(newPresence)) {
      return await newPresence.member?.roles.add(role).catch(console.error)
    }

    // User is not longer streaming
    if (oldPresence && this.isStreaming(oldPresence)) {
      return await newPresence.member?.roles.remove(role).catch(console.error)
    }
  }
}
