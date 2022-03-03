export function mulberry32(a: number): () => number {
  // a is a seed, returns a simple seeded RNG function from then.
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function getRandomElement(a: Array<any>) {
  // returns a random element from a using Math.random()
  return a[Math.floor(Math.random() * a.length)]
}

export function getSeededRandomElement(a: Array<any>, rng: () => number) {
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
  const rolls = []
  for (let i = 0; i < total; i++) {
    rolls.push(Math.floor(Math.random() * sides + 1))
  }
  rolls.sort().reverse()
  return rolls.slice(0, pick).reduce((a, b) => a + b, 0)
}
