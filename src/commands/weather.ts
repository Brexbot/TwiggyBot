import { CommandInteraction } from 'discord.js'
import { Discord, SimpleCommand, SimpleCommandMessage, SlashOption, Slash, SimpleCommandOption } from 'discordx'
import fetch from 'node-fetch'

@Discord()
class Weather {
  @SimpleCommand('weather', { description: 'Get the weather for a location', argSplitter: '\n' })
  async simple(@SimpleCommandOption('location', { type: 'STRING' }) text: string, command: SimpleCommandMessage) {
    if (!text) {
      return command.sendUsageSyntax()
    }
    command.message.channel.send(await weather(text))
  }

  @Slash('weather', { description: 'Get the weather for a location' })
  async slash(
    @SlashOption('location', { type: 'STRING' })
    message: string,
    interaction: CommandInteraction
  ) {
    interaction.reply(await weather(message, true))
  }
}

const aboutMessage = `Weather data provided by OpenWeather (TM) <https://openweathermap.org>
Data made available under the Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0) <https://creativecommons.org/licenses/by-sa/4.0/>`

const apiKey = process.env.OPEN_WEATHER_TOKEN

const weatherURL = 'https://api.openweathermap.org/data/2.5/weather'

// Very basic check for a postal code, working on the assumpion that they include numbers and cities don't
const possiblyAPostCode = /\d/

function determineType(searchLocation: string): string {
  if (possiblyAPostCode.test(searchLocation)) {
    // Post code
    return 'zip'
  } else {
    // City name
    return 'q'
  }
}

// The API doesn't seem to handle whitespace around commas too well
// This is noticable when using a postal code
// Not found: "bs1 4uz, gb", Found: "bs1 4uz,gb"
const commaWhitespaceRegex = /(\s{0,}\,\s{0,})/g
function sortOutWhitespace(text: string): string {
  return text.replace(commaWhitespaceRegex, ',')
}

function buildRequestURL(searchLocation: string): string {
  const fragments: string = [
    [determineType(searchLocation), encodeURIComponent(sortOutWhitespace(searchLocation))],
    ['units', 'metric'],
    ['appid', apiKey]
  ].map(frag => frag.join('=')).join('&')
  return `${weatherURL}?${fragments}`
}


// Text formatting
function titleCase(text: string): string {
  return text
    .split(' ')
    .map(word =>
      word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase()
    )
    .join(' ')
}

// Wind
type directions = {
  [key: string]: Array<number>
}
const windLUT: directions = {
  N: [348.75, 11.25],
  NNE: [11.25, 33.75],
  NE: [33.75, 56.25],
  ENE: [56.25, 78.75],
  E: [78.75, 101.25],
  ESE: [101.25, 123.75],
  SE: [123.75, 146.25],
  SSE: [146.25, 168.75],
  S: [168.75, 191.25],
  SSW: [191.25, 213.75],
  SW: [213.75, 236.25],
  WSW: [236.25, 258.75],
  W: [258.75, 281.25],
  WNW: [281.25, 303.75],
  NW: [303.75, 326.25],
  NNW: [326.25, 348.75]
}
function cardinalDirection(degree: number): string {
  return Object.keys(windLUT).find(dir => {
    if (windLUT[dir][1] < windLUT[dir][0]) {
      return degree >= windLUT[dir][0] || degree <= windLUT[dir][1]
    } else {
      return degree >= windLUT[dir][0] && degree <= windLUT[dir][1]
    }
  }) || '?'
}

// Temperature
function localiseTemperature(celsius: number): string {
  const fahrenheit = 32 + celsius * 1.8
  return `${celsius.toFixed(1)}°C/${fahrenheit.toFixed(1)}°F`
}

// Speed
function localiseMSec(mSec: number): string {
  const mph = mSec * 2.236936
  const kph = mSec * 3.6
  return `${kph.toFixed(1)} KPH/${mph.toFixed(1)} MPH`
}

// Distance
function localiseMetres(metres: number): string {
  const kilometres = metres / 1000
  const miles = kilometres * 0.621371
  const feet = metres * 3.2808
  const imperial = miles < 1 ? `${feet.toLocaleString()} ft` : `${miles.toFixed(1)} mi`
  return `${kilometres.toFixed(1)} km/${imperial}`
}
function visibilityText(visibility: number | undefined) {
  /*
    Fog:  Less than 1 km (3,300 ft)
    Mist: Between 1 km (0.62 mi) and 2 km (1.2 mi)
    Haze: From 2 km (1.2 mi) to 5 km (3.1 mi)
  */
  if (!visibility || visibility > 5000) { return '' }
  return `, **Visibility:** ${localiseMetres(visibility)}`
}

// Locations can be expericing more than one type of weather at the same time
interface weatherInfo {
  id: number,
  main: string,
  description: string,
  icon: string
}
function weatherDescription(weather: Array<weatherInfo>): string {
  return weather.map(w => titleCase(w.description)).join(', ')
}

// Localise and format a time
function timestampTo12Hour(timezoneOffset: number, timestamp: number = 0): string {
  const dateObj = new Date(
    timestamp === 0 ?
      (timezoneOffset * 1000) + Date.now() :
      (timezoneOffset + timestamp) * 1000
  )

  let hours = dateObj.getUTCHours()
  const amPM = hours > 12 ? 'PM' : 'AM'
  hours %= 12

  if (hours === 0) { hours = 12 }

  const mins = String(dateObj.getUTCMinutes()).padStart(2, '0')

  return `${hours}:${mins} ${amPM}`
}

function sunsetInfo(sunrise: number, sunset: number, latitude: number, timezoneOffset: number): string {
  if (sunrise === 0 && sunset === 0) {
    const currentMonth = new Date().getMonth()

    if (
      (latitude > 0 && (currentMonth < 2 || currentMonth > 8)) ||
      (latitude < 0 && (currentMonth > 3 && currentMonth < 7))
    ) {
      return '🌚 Polar night is occuring 🌚'
    } else {
      return '🌞 Midnight sun is occuring 🌞'
    }
  }

  return `**Sunrise:** ${timestampTo12Hour(timezoneOffset, sunrise)}, **Sunset:** ${timestampTo12Hour(timezoneOffset, sunset)}`
}

function formatWeather(data: any): string {

  const outputStrings: Array<string> = [
    `${data.name}, ${data.sys.country}     ${timestampTo12Hour(data.timezone)}`,
    `**Currently:** ${weatherDescription(data.weather)}`,
    `**Cloud Cover:** ${data.clouds.all}%${visibilityText(data.visibility)}`,
    `**Temp:** ${localiseTemperature(data.main.temp)}, **Feels like:** ${localiseTemperature(data.main.feels_like)}`,
    `**Min:** ${localiseTemperature(data.main.temp_min)}, **Max:** ${localiseTemperature(data.main.temp_max)}`,
    `**Humidity:** ${data.main.humidity}%`,
    `**Wind:** ${localiseMSec(data.wind.speed)} @ ${data.wind.deg}°/${cardinalDirection(data.wind.deg)}`,
    sunsetInfo(data.sys.sunrise, data.sys.sunset, data.coord.lat, data.timezone)
  ]

  return outputStrings.join('\n')

}

function formatError(data: any, searchLocation: string, slashMessage: boolean): string {
  // Include the user input when they use a slash message, to make sure it's visible
  const locationHint = slashMessage ? ` (Location: ${makeSafe(searchLocation)})` : ''

  if (data?.message) {
    // Pick the best emoji for the response
    const whichEmoji = data.message.endsWith('not found') ? '🔎' : '🤔'
    // Try to avoid including the location, unless it's not printed anywhere
    const includeHint = !data.message.includes(searchLocation) ? locationHint : ''
    // I think saw a request time out, and the response included the URL,
    //  so lets avoid showing the API key in that situation.
    return `${whichEmoji} ${titleCase(data.message.replace(apiKey, '[redacted]'))}${includeHint}`
  } else {
    // Not the most helpful of error messages :)
    return `😵 What happened?!${locationHint}`
  }
}

// Escapes markup, and urls, in user input, so it's suitable for printing
const makeSafeRegEx = /(>|\*|_|~|\`|:\/\/)/g
function makeSafe(text: string): string {
    return text.replace(makeSafeRegEx, '\\$1')
}

async function fetchWeather(searchLocation: string): Promise<any> {
  return await fetch(buildRequestURL(searchLocation))
    .then(async (resp) => {
      if (resp.ok) {
        return await resp.json()
      } else {
        return Promise.reject(await resp.json())
      }
    })
    .catch(error => Promise.reject(error) )
}

async function weather(searchLocation: string, slashMessage: boolean = false): Promise<string> {
  let output: string

  if (searchLocation.toLowerCase() === 'about') {
    return aboutMessage
  }

  try {
    const weather = await fetchWeather(searchLocation)
    output = formatWeather(weather)
  } catch (error) {
    output = formatError(error, searchLocation, slashMessage)
  }
  return output
}
