import { classes } from './Data'

export function cyrb53(str: string, seed = 0): number {
  // Hash the input string to int
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export function mulberry32(a: number): () => number {
  // a is a seed, returns a simple seeded RNG function from then.
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function getRandomElement<T>(a: T[]): T {
  // returns a random element from a using Math.random()
  return getSeededRandomElement(a, Math.random)
}

export function getSeededRandomElement<T>(a: T[], rng: () => number): T {
  // returns a random element from a,
  // calling rng argument to get random number.
  return a[Math.floor(rng() * a.length)]
}

export function rollSeeded_dy_x_TimesPick_z(sides: number, total: number, pick: number, rng: () => number): number {
  // Roll {total} d{sides} dice, and sum the top {pick} results
  // if provided, the {rng} argument is used for random numbers,
  const rolls = []
  for (let i = 0; i < total; i++) {
    rolls.push(Math.floor(rng() * sides + 1))
  }
  rolls.sort().reverse()
  return rolls.slice(0, pick).reduce((a, b) => a + b, 0)
}

export function roll_dy_x_TimesPick_z(sides: number, total: number, pick: number): number {
  // Roll {total} d{sides} dice, and sum the top {pick} results
  // random generation is done by unseeded Math.random()

  return rollSeeded_dy_x_TimesPick_z(sides, total, pick, Math.random)
}

export function getEloRankChange(rankA: number, rankB: number, K: number, result: 'win' | 'loss' | 'draw'): number {
  // Returns player A's new Elo rank for given result.
  const BASE = 10
  const EXPONENT = 1.0 / 400.0
  const expectedA = 1.0 / (1.0 + BASE ** (EXPONENT * (rankB - rankA)))

  let score: number
  switch (result) {
    case 'win': {
      score = 1.0
      break
    }
    case 'loss': {
      score = 0.0
      break
    }
    case 'draw': {
      score = 0.5
      break
    }
  }

  return Math.round(rankA + K * (score - expectedA))
}

export function balancingClasses() {
  const stats = ['STR', 'DEX', 'CON', 'WIS', 'INT', 'CHR'] as const
  const data: Record<string, number> = { STR: 0, DEX: 0, CON: 0, WIS: 0, INT: 0, CHR: 0 }
  for (let i = 0; i < classes.length; i++) {
    const cclass = classes[i]
    for (let j = 0; j < cclass.statPreferences.length; j++) {
      data[cclass.statPreferences[j]] += 6 - j
    }
  }

  for (const key of stats) {
    console.log(key, data[key])
  }
}
