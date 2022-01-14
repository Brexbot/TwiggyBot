 # The Banana Hammock - Discord Bot

Example taken from https://github.com/oceanroleplay/discord.ts-example

Relevant links:
* https://discord-ts.js.org/docs/installation
* https://discordjs.guide/preparations/ (and following pages)

## To-do

 1. ~~Determine scope of bot.~~ Integrate within Discord server
 2. ~~Decide Framework.~~ TypeScript, with SQLLite DB
 3. Implement working base bot.
     1. Get a prod bot on Banana Discord
     2. Create and connect SQLLite DB to bot/bot code. (Separate prod/dev dbs?)
 4. Start-to-finish [documentation for setup and new devs](https://github.com/Brexbot/DiscordBot/tree/main/docs#getting-started). 
 5. [List of commands to implement](https://docs.google.com/spreadsheets/d/1Y9Z3YJUqWFB-CPGZUzIvDEc6tC9hR0jwobJfzH18eD0/edit#gid=2132467532)
 6. Investigate merging with current BrexBot implementation, including potential account ownership/transfer.


Reach in the #bot-development channel in the [Discord](https://discord.gg/brex) for questions on joining the project.

## Set up the database
The bot uses the [Prisma ORM](https://www.prisma.io/) for persistence.
By default this uses SQLite.

See [the duel commend](src/commands/duel.ts) for database integration examples.

The schema for the Database is stored in [the Prisma schema file](prisma/schema.prisma).

Create the client definition
```shell
npx prisma generate
```

Create a new empty Database for development
```shell
npx prisma migrate dev --name init
```

Open the file with sqlite
```shell
sqlite3 prisma/dev.db
```

For better output in sqlite enable columns and headers. You can also hardcode these settings in the ~/.sqliterc file.
```shell
sqlite> .mode column
sqlite> .headers ON
```

## How to run
### Docker
Prerequisites:
* Recent version of Docker

Build the image
```shell
docker build -t brexbot .
```

Create a .env file which contains the bot token
```
DISCORD_TOKEN=<token>
```

Start the container
```shell
docker run --rm --env-file.env -ti brexbot
```

### Locally
Prerequisites:
* Node.js >= 16

Install the dependencies
```shell
npm install
```

Export the bot token as an environment variable
```shell
# Bash and similar
export DISCORD_TOKEN=<token>
# Powershell 
$Env:DISCORD_TOKEN = "<token>"
```

Run the bot
```shell
npm run start
```
