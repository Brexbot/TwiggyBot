import 'reflect-metadata'
import type { Interaction, Message } from 'discord.js'
import { GatewayIntentBits, IntentsBitField } from 'discord.js'
import { Client, DIService, tsyringeDependencyRegistryEngine } from 'discordx'
import { container } from 'tsyringe'
import { importx } from '@discordx/importer'
import { NotBot } from './guards/RoleChecks'

import { NoWhitespace } from './guards/NoWhitespace'

;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}

export const bot = new Client({
  simpleCommand: {
    prefix: '>',
  },
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.GuildPresences,
    GatewayIntentBits.MessageContent,

    // todo: These are currently not needed but if shit breaks and you don't know why try uncommenting this first
    // GatewayIntentBits.GuildMembers,
    // GatewayIntentBits.GuildPresences,
  ],
  // If you only want to use global commands only, comment this line
  botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
  guards: [NotBot, NoWhitespace],
})

bot.once('ready', async () => {
  // make sure all guilds are in cache
  await bot.guilds.fetch()

  // init all application commands
  await bot.initApplicationCommands({
    guild: { log: true },
    global: { log: true },
  })

  // To clear all guild commands, uncomment this line,
  // This is useful when moving from guild commands to global commands
  // It must only be executed once
  //
  //  await bot.clearApplicationCommands(
  //    ...client.guilds.cache.map((g) => g.id)
  //  );

  console.log('Bot started')
})

bot.on('interactionCreate', (interaction: Interaction) => {
  // This should always be a Promise... if it isn't then something is horribly wrong, and we deserve to crash
  try {
    ;(bot.executeInteraction(interaction) as Promise<unknown>).catch((error) => {
      console.error(`[Interaction] An unexpected error occurred: ${error}`)
    })
  } catch (error) {
    console.error(error)
  }
})

bot.on('messageCreate', (message: Message) => {
  try {
    bot.executeCommand(message).catch((error) => {
      console.error(`[Simple] An unexpected error occurred: ${error}`)
    })
  } catch (error) {
    console.error(error)
  }
})

async function run() {
  DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container)

  await importx(`${__dirname}/{events,commands,persistence}/**/*.{ts,js}`)
  bot.login(process.env.DISCORD_TOKEN ?? '') // provide your bot token
}

run()
