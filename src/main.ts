import 'reflect-metadata'
import type { Interaction, Message } from 'discord.js'
import { GatewayIntentBits, IntentsBitField } from 'discord.js'
import { Client, DIService, tsyringeDependencyRegistryEngine } from 'discordx'
import { container } from 'tsyringe'
import { importx } from '@discordx/importer'
import { NotBot } from './guards/RoleChecks'
import { NoWhitespace } from './guards/NoWhitespace'
import { isPromise } from 'util/types'
import { CronJob } from 'cron'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;
import {clearOrphanedRoles} from "./standalones/clearOrphanedRoles";

(BigInt.prototype as any).toJSON = function () {
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
    guild: { log: false },
    global: { log: false },
  })

  // To clear all guild commands, uncomment this line,
  // This is useful when moving from guild commands to global commands
  // It must only be executed once
  //
  //  await bot.clearApplicationCommands(
  //    ...client.guilds.cache.map((g) => g.id)
  //  );

  console.log('Bot started')

  // Auto starting cron job to clear orphaned roles at midnight, bot time
  new CronJob('00 00 00 * * *', () => {
    bot.guilds.cache.forEach(guild => {
      clearOrphanedRoles(guild)
    })
  }, null, true)
})

bot.on('error', (error) => {
  console.error('[Discord JS] An unexpected error occurred', error)
})

// Handle any errors not caught by us or the discord-js framework
process.on('unhandledRejection', (error) => {
  console.error('[Process] An unhandled rejection occurred', error)
})

bot.on('interactionCreate', (interaction: Interaction) => {
  try {
    const i = bot.executeInteraction(interaction)
    if (isPromise(i)) {
      i.catch((error) => {
        console.error('[Interaction] An unhandled rejection occurred', error)
      })
    }
  } catch (error) {
    console.error('[Interaction] An unexpected error occurred', error)
  }
})

bot.on('messageCreate', (message: Message) => {
  try {
    bot.executeCommand(message).catch((error) => {
      console.error('[Simple] An unhandled rejection occurred', error)
    })
  } catch (error) {
    console.error('[Simple] An unexpected error occurred', error)
  }
})

async function run() {
  DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container)

  await importx(`${__dirname}/{events,commands,persistence}/**/*.{ts,js}`)
  bot.login(process.env.DISCORD_TOKEN ?? '') // provide your bot token
}

run()
