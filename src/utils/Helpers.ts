export const shuffleArray = <T>(array: Array<T>): Array<T> => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export const getRandomElement = <T>(array: Array<T>): T => {
  if (array.length === 0) {
    throw new Error('Array cannot be empty')
  }
  const randomIndex = Math.floor(Math.random() * array.length)
  return array[randomIndex]
}
