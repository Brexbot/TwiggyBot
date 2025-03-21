import { ApplicationCommandOptionType, ColorResolvable, CommandInteraction, EmbedBuilder } from 'discord.js'
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
} from 'discordx'
import hslRgb from 'hsl-rgb'

interface weatherResponse {
  msg: EmbedBuilder
  ephemeral: boolean
}
interface weatherInfo {
  id: number
  main: string
  description: string
  icon: string
}
interface weatherDirections {
  [key: string]: Array<number>
}

@Discord()
class Weather {
  @SimpleCommand({ name: 'weather', description: 'Get the weather for a location', argSplitter: '\n' })
  async simple(
    @SimpleCommandOption({ name: 'location', type: SimpleCommandOptionType.String }) text: string,
    command: SimpleCommandMessage
  ) {
    if (!text) {
      return command.sendUsageSyntax()
    }
    const weatherInfo: weatherResponse = await this.handleInput(text)
    const channel = command.message.channel
    if (channel && channel.isSendable()) {
      channel.send({ embeds: [weatherInfo.msg] })
    }
  }

  @Slash({ name: 'weather', description: 'Get the weather for a location' })
  async slash(
    @SlashOption({
      name: 'location',
      description: 'The location for which to display the weather',
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    message: string,
    interaction: CommandInteraction
  ) {
    const weatherInfo: weatherResponse = await this.handleInput(message)
    interaction.reply({ embeds: [weatherInfo.msg], ephemeral: weatherInfo.ephemeral })
  }

  private static aboutMessage = `Weather data provided by [OpenWeather (TM)](https://openweathermap.org)
  Data made available under the [Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0)](<https://creativecommons.org/licenses/by-sa/4.0/>)`

  private static helpMessage = `Acceptable input formatting:
    \`City name\`
    \`City name, State code\`
    \`City name, State code, Country code\`
    \`Zip/Postal code, Country code\`
    \n**Also acceptable**:
    \`about\` - Information on the API & data used
    \`help\` - This command`

  private static missingApiKey = `This function is currently unavailable.\n**Reason**: Weather API key is missing.`

  private static apiKey = process.env.OPEN_WEATHER_TOKEN ?? ''

  private static weatherURL = 'https://api.openweathermap.org/data/2.5/weather'

  // Very basic check for a postal code, working on the assumpion that they include numbers and cities don't
  private static possiblyAPostCode = /\d/

  private determineType(searchLocation: string): string {
    if (Weather.possiblyAPostCode.test(searchLocation)) {
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
  private static commaWhitespaceRegex = /(\s{0,}\,\s{0,})/g
  private sortOutWhitespace(text: string): string {
    return text.replace(Weather.commaWhitespaceRegex, ',')
  }

  private buildRequestURL(searchLocation: string): string {
    const fragments: string = [
      [this.determineType(searchLocation), encodeURIComponent(this.sortOutWhitespace(searchLocation))],
      ['units', 'metric'],
      ['appid', Weather.apiKey],
    ]
      .map((frag) => frag.join('='))
      .join('&')
    return `${Weather.weatherURL}?${fragments}`
  }

  // Text formatting
  private titleCase(text: string): string {
    return text
      .split(' ')
      .map((word) => word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase())
      .join(' ')
  }

  // Wind
  private windLUT: weatherDirections = {
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
    NNW: [326.25, 348.75],
  }
  private cardinalDirection(degree: number): string {
    return (
      Object.keys(this.windLUT).find((dir) => {
        if (this.windLUT[dir][1] < this.windLUT[dir][0]) {
          return degree >= this.windLUT[dir][0] || degree <= this.windLUT[dir][1]
        } else {
          return degree >= this.windLUT[dir][0] && degree <= this.windLUT[dir][1]
        }
      }) || '?'
    )
  }

  // Temperature
  private localiseTemperature(celsius: number): string {
    const fahrenheit = 32 + celsius * 1.8
    return `${celsius.toFixed(1)}°C/${fahrenheit.toFixed(1)}°F`
  }

  // Speed
  private localiseMSec(mSec: number): string {
    const mph = mSec * 2.236936
    const kph = mSec * 3.6
    return `${kph.toFixed(1)} KPH/${mph.toFixed(1)} MPH`
  }

  // Distance
  private localiseMetres(metres: number): string {
    const kilometres = metres / 1000
    const miles = kilometres * 0.621371
    const feet = metres * 3.2808
    const imperial =
      miles < 1 ? `${feet.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft` : `${miles.toFixed(1)} mi`
    return `${kilometres.toFixed(1)} km/${imperial}`
  }
  private visibilityText(visibility: number | undefined) {
    /*
      Fog:  Less than 1 km (3,300 ft)
      Mist: Between 1 km (0.62 mi) and 2 km (1.2 mi)
      Haze: From 2 km (1.2 mi) to 5 km (3.1 mi)
    */
    if (!visibility || visibility > 5000) {
      return ''
    }
    return `, **Visibility:** ${this.localiseMetres(visibility)}`
  }

  // Locations can be expericing more than one type of weather at the same time
  private weatherDescription(weather: Array<weatherInfo>): string {
    return weather.map((w) => this.titleCase(w.description)).join(', ')
  }

  // Localise and format a time
  private timestampTo12Hour(timezoneOffset: number, timestamp = 0): string {
    const dateObj = new Date(timestamp === 0 ? timezoneOffset * 1000 + Date.now() : (timezoneOffset + timestamp) * 1000)

    let hours = dateObj.getUTCHours()
    const amPM = hours > 11 ? 'PM' : 'AM'
    hours %= 12

    if (hours === 0) {
      hours = 12
    }

    const mins = String(dateObj.getUTCMinutes()).padStart(2, '0')

    return `${hours}:${mins} ${amPM}`
  }

  private sunsetInfo(sunrise: number, sunset: number, latitude: number, timezoneOffset: number): string {
    if (sunrise === 0 && sunset === 0) {
      const currentMonth = new Date().getMonth()

      if (
        (latitude > 0 && (currentMonth < 2 || currentMonth > 8)) ||
        (latitude < 0 && currentMonth > 3 && currentMonth < 7)
      ) {
        return '🌚 Polar night is occuring 🌚'
      } else {
        return '🌞 Midnight sun is occuring 🌞'
      }
    }

    return `**Sunrise:** ${this.timestampTo12Hour(timezoneOffset, sunrise)}, **Sunset:** ${this.timestampTo12Hour(
      timezoneOffset,
      sunset
    )}`
  }

  private colorFromTemp(celsius: number): ColorResolvable {
    const scaledCelsius: number = celsius > 0 ? celsius * 6 : celsius * 3.5
    return hslRgb((200 - scaledCelsius) % 360, 0.75, 0.6)
  }

  // TODO: Replace any with a more precise type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatWeather(data: any): weatherResponse {
    const outputStrings: Array<string> = [
      //`**${data.name}**, ${data.sys.country} — ${timestampTo12Hour(data.timezone)}`,
      `**Currently:** ${this.weatherDescription(data.weather)}`,
      `**Cloud Cover:** ${data.clouds.all}%${this.visibilityText(data.visibility)}`,
      `**Temp:** ${this.localiseTemperature(data.main.temp)}, **Feels like:** ${this.localiseTemperature(
        data.main.feels_like
      )}`,
      `**Min:** ${this.localiseTemperature(data.main.temp_min)}, **Max:** ${this.localiseTemperature(
        data.main.temp_max
      )}`,
      `**Humidity:** ${data.main.humidity}%`,
      `**Wind:** ${this.localiseMSec(data.wind.speed)} @ ${data.wind.deg}°/${this.cardinalDirection(data.wind.deg)}`,
      this.sunsetInfo(data.sys.sunrise, data.sys.sunset, data.coord.lat, data.timezone),
    ]

    const tmpCountry = data.sys.country ? `, ${data.sys.country}` : ''

    return {
      msg: new EmbedBuilder()
        .setAuthor({
          name: `${data.name}${tmpCountry} — ${this.timestampTo12Hour(data.timezone)}`,
          iconURL: `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        })
        .setColor(this.colorFromTemp(data.main.temp))
        .setDescription(outputStrings.join('\n')),
      ephemeral: false,
    }
  }

  private newBasicEmbed(description = '', color: ColorResolvable = '#ffffff'): EmbedBuilder {
    return new EmbedBuilder().setColor(color).setAuthor({ name: 'Weather' }).setDescription(description)
  }

  // TODO: Replace any with a more precise type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatError(data: any): weatherResponse {
    let errorMsg: string

    if (data?.message) {
      // Pick the best emoji for the response
      const whichEmoji = data.message.endsWith('not found') ? '🔎' : '🤔'
      // I think saw a request time out, and the response included the URL,
      //  so lets avoid showing the API key in that situation.
      errorMsg = `${whichEmoji} ${this.titleCase(data.message.replace(Weather.apiKey, '[redacted]'))}`
    } else {
      // Not the most helpful of error messages :)
      errorMsg = `😵 What happened?!`
    }

    return {
      msg: this.newBasicEmbed(errorMsg, '#e3377b'),
      ephemeral: true,
    }
  }

  // TODO: Replace any with a more precise type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchWeather(searchLocation: string): Promise<any> {
    return await fetch(this.buildRequestURL(searchLocation))
      .then(async (resp) => {
        if (resp.ok) {
          return await resp.json()
        } else {
          return Promise.reject(await resp.json())
        }
      })
      .catch((error) => Promise.reject(error))
  }

  private async handleInput(searchLocation: string): Promise<weatherResponse> {
    if (searchLocation.toLowerCase() === 'about') {
      return {
        msg: this.newBasicEmbed(Weather.aboutMessage, '#eb6e4b'),
        ephemeral: false,
      }
    }

    if (searchLocation.toLowerCase() === 'help') {
      return {
        msg: this.newBasicEmbed(Weather.helpMessage, '#47aeef'),
        ephemeral: false,
      }
    }

    if (!Weather.apiKey) {
      return {
        msg: this.newBasicEmbed(Weather.missingApiKey, '#e3377b'),
        ephemeral: true,
      }
    }

    if (searchLocation === 'Stephenville' || searchLocation === 'rex') {
      searchLocation = 'Stephenville, CA'
    }

    return await this.fetchWeather(searchLocation)
      .then((weather) => this.formatWeather(weather))
      .catch((error) => this.formatError(error))
  }
}
