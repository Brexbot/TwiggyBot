import 'reflect-metadata'
import { Intents, Interaction, Message } from 'discord.js'
import { Client, DIService } from 'discordx'
import { container } from 'tsyringe'
import { importx } from '@discordx/importer'
import { NotBot } from './guards/RoleChecks'

const client = new Client({
  simpleCommand: {
    prefix: '>',
  },
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_PRESENCES,
  ],
  partials: ['CHANNEL'],
  // If you only want to use global commands only, comment this line
  botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
  guards: [NotBot],
})

client.once('ready', async () => {
  // make sure all guilds are in cache
  await client.guilds.fetch()

  // init all application commands
  await client.initApplicationCommands({
    guild: { log: true },
    global: { log: true },
  })

  // init permissions; enabled log to see changes
  await client.initApplicationPermissions(true)

  // uncomment this line to clear all guild commands,
  // useful when moving to global commands from guild commands
  //  await client.clearApplicationCommands(
  //    ...client.guilds.cache.map((g) => g.id)
  //  );

  console.log('Bot started')
})

client.on('interactionCreate', (interaction: Interaction) => {
  // This should always be a Promise... if it isn't then something is horribly wrong, and we deserve to crash
  try {
    ;(client.executeInteraction(interaction) as Promise<unknown>).catch((error) => {
      console.error(`[Interaction] An unexpected error occurred: ${error}`)
    })
  } catch (error) {
    console.error(error)
  }
})

client.on('messageCreate', (message: Message) => {
  try {
    client.executeCommand(message).catch((error) => {
      console.error(`[Simple] An unexpected error occurred: ${error}`)
    })
  } catch (error) {
    console.error(error)
  }
})

async function run() {
  DIService.container = container

  await importx(`${__dirname}/{events,commands,persistence}/**/*.{ts,js}`)
  client.login(process.env.DISCORD_TOKEN ?? '') // provide your bot token
}

run()
