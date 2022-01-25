export function getTimeLeftInReadableFormat(lockout: Date, coolDownInMillis: number): string {
  const timeLeftInMillis = lockout.getTime() + coolDownInMillis - Date.now()

  if (timeLeftInMillis >= 60 * 60 * 1000) {
    // If timeLeft >= 1hr
    const hoursLeft = Math.ceil(timeLeftInMillis / 60 / 60 / 1000)
    if (hoursLeft === 1) {
      return `${hoursLeft} hour`
    } else {
      return `${hoursLeft} hours`
    }
  } else if (timeLeftInMillis >= 60 * 1000) {
    // If timeLeft >= 1min
    const minutesLeft = Math.ceil(timeLeftInMillis / 60 / 1000)
    if (minutesLeft === 1) {
      return `${minutesLeft} minute`
    } else {
      return `${minutesLeft} minutes`
    }
  } else {
    const secondsLeft = Math.ceil(timeLeftInMillis / 1000)
    if (secondsLeft === 1) {
      return `${secondsLeft} second`
    } else {
      return `${secondsLeft} seconds`
    }
  }
}
