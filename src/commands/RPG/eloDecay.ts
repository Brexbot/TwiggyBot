import { PrismaClient } from '../../../prisma/generated/prisma-client-js'
import { ELO_DECAY_FACTOR } from './Data'

function calculateEloDecay(eloRank: number): number {
  // Linear interpolation between eloRank and 1000 which is the mean ladder "skill"
  // Returned as shift to be applied
  const working = (1 - ELO_DECAY_FACTOR) * eloRank + ELO_DECAY_FACTOR * 1000 - eloRank
  return Math.round(working)
}

async function main() {
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
  console.log(`Final drift ${eloDrift}`)
}

main()
