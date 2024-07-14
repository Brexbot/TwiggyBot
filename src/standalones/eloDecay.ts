import { PrismaClient, RPGCharacter } from '../../prisma/generated/prisma-client-js/index.js'
import { ELO_DECAY_FACTOR } from '../commands/RPG/Data.js'
import { getRandomElement } from '../commands/RPG/util.js'

function calculateEloDecay(eloRank: number): number {
  // Linear interpolation between eloRank and 1000 which is the mean ladder "skill"
  // Returned as shift to be applied
  const working = (1 - ELO_DECAY_FACTOR) * eloRank + ELO_DECAY_FACTOR * 1000 - eloRank
  return Math.round(working)
}

export async function decayElo() {
  console.log(`\nElo Decay running at ${new Date()}`)
  const client = new PrismaClient()

  const allEntries = await client.rPGCharacter.findMany()
  let eloDrift = 0
  for (const i in allEntries) {
    const entry = allEntries[i]
    const eloDecay = calculateEloDecay(entry.eloRank)
    const newEloRank = entry.eloRank + eloDecay
    console.log(`${entry.eloRank} gets ${eloDecay} shift`)
    eloDrift += eloDecay

    await client.rPGCharacter.update({
      where: {
        id: entry.id,
      },
      data: {
        eloRank: newEloRank,
        // These next two are not strictly necessary (Elo decay will never make a new extreme)
        // But they will update this for folks who haven't run `\rpg duel` yet.
        peakElo: Math.max(entry.peakElo, newEloRank),
        floorElo: Math.min(entry.floorElo, newEloRank),
      },
    })
  }

  // Due to rounding, points can get lost or created during the adjustment
  // Over time this would cause the "average skill" to move away from 1000
  // So we have tallied up this "Elo drift" to make a pool of missing points
  // Sort it by Elo rank, allowing us to take points from the rich, and give them
  // to the poor. As required to keep the status quo.

  const postDecayAllEntries = await client.rPGCharacter.findMany()
  console.log(`Final drift ${eloDrift}`)
  const mod = Math.sign(eloDrift)
  const filterdEntries = postDecayAllEntries.filter((a: RPGCharacter) => Math.sign(a.eloRank - 1000) == mod)
  while (eloDrift != 0) {
    const randomEntry = getRandomElement(filterdEntries)
    const newEloRank = randomEntry.eloRank - mod
    console.log(`Assigning ${-mod} to ${randomEntry.id} was ${randomEntry.eloRank} now ${newEloRank}.`)
    await client.rPGCharacter.update({
      where: {
        id: randomEntry.id,
      },
      data: {
        eloRank: newEloRank,
        // This time the Elo decay fairy may gift/grift someone a point and push
        // them to a new extreme value. We must always update this.
        peakElo: Math.max(randomEntry.peakElo, newEloRank),
        floorElo: Math.min(randomEntry.floorElo, newEloRank),
      },
    })
    eloDrift -= mod
  }

  const postFixAllEntries = await client.rPGCharacter.findMany()
  let tally = 0
  for (const i in postFixAllEntries) {
    tally += postFixAllEntries[i].eloRank
  }
  console.log(`Mean Elo now ${tally / postFixAllEntries.length}`)
}
