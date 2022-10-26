import { Guild } from 'discord.js'

export async function clearOrphanedRoles(guild: Guild) {
  const hexExp = /^#?[0-9A-F]{6}$/i

  let rolesDeleted = 0
  guild.roles.cache
    .filter((role) => hexExp.test(role.name))
    .filter((role) => role.members.size <= 0)
    .forEach((role) => {
      rolesDeleted++
      role
        .delete()
        .catch((_) => console.error(`Error deleting orphaned role: ${role.name}`))
    })
  console.log(`Deleted ${rolesDeleted} orphan roles`)
}
