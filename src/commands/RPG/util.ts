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

export function mulberry32(a: number): Function {
  // a is a seed, returns a simple seeded RNG function from then.
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function get_random_element(a: Array<any>) {
  // returns a random element from a using Math.random()
  return a[Math.floor(Math.random() * a.length)]
}

export function get_seeded_random_element(a: Array<any>, rng: Function) {
  // returns a random element from a,
  // calling rng argument to get random number.
  return a[Math.floor(rng() * a.length)]
}

export function roll_seeded_dy_x_times_pick_z(sides: number, total: number, pick: number, rng: Function): number {
  // Roll {total} d{sides} dice, and sum the top {pick} results
  // if provided, the {rng} argument is used for random numbers,
  const rolls = []
  for (let i = 0; i < total; i++) {
    rolls.push(Math.floor(rng() * sides + 1))
  }
  rolls.sort().reverse()
  return rolls.slice(0, pick).reduce((a, b) => a + b, 0)
}

export function roll_dy_x_times_pick_z(sides: number, total: number, pick: number): number {
  // Roll {total} d{sides} dice, and sum the top {pick} results
  // random generation is done by unseeded Math.random()
  const rolls = []
  for (let i = 0; i < total; i++) {
    rolls.push(Math.floor(Math.random() * sides + 1))
  }
  rolls.sort().reverse()
  return rolls.slice(0, pick).reduce((a, b) => a + b, 0)
}
