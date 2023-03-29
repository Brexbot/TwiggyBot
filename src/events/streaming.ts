import { ActivityType, Presence } from 'discord.js'
import type { ArgsOf, IGuild } from 'discordx'
import { Discord, On } from 'discordx'

@Discord()
export abstract class AppDiscord {
  private static guildRoleMap = new Map<IGuild, string>([
    ['103678524375699456', '730137929124675615'], // The Banana Hammock
  ])

  private isStreaming(presence: Presence): boolean {
    return presence.activities.some((activity) => activity.type === ActivityType.Streaming)
  }

  @On({ event: 'presenceUpdate' })
  async onUpdate([oldPresence, newPresence]: ArgsOf<'presenceUpdate'>) {
    if (!AppDiscord.guildRoleMap.has(newPresence.guild?.id ?? '')) {
      return
    }

    const role = newPresence.guild?.roles.cache.find(
      (role) => role.id === AppDiscord.guildRoleMap.get(newPresence.guild?.id ?? '')
    )
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
