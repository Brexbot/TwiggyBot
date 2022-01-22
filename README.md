# TwiggyBot

Reach in the #bot-development channel in the [Discord](https://discord.gg/brex) for questions on joining the project.

## Regular commands

### [Duel](src/commands/duel.ts)

Parameters: n/a

A user can initiate a duel. By pressing the button, another user can accept the duel.
If it hasn't been accepted within 5 Minutes, it will automatically disable itself.

The bot rolls a number between 0 and 99 for both users and displays the results.

This command uses the timeout from other commands and sets a timeout of 10 minutes for the loser.

Currently, no simple-command version exists.

### [Duelstats](src/commands/duel.ts)

Parameters: n/a

Displays the user's duelstats from the database.

Currently, no simple-command version exists.

### [Eightball](src/commands/eightball.ts)

Parameters: message (optional)

Selects a response from a list, like the Magic 8-ball toy.

The optional message parameter is used if the user wants to ask the 8-Ball a question directly.

### [FBall](src/commands/fball.ts)

Parameters: message (optional)

Same as the eightball command but with Falk-style responses.

### [Issues](src/commands/issues.ts)

Parameters: n/a

Outputs the project's issues url to the channel.

### [Mixu](src/commands/mixu.ts)

Parameters: n/a

Only usable in the #mixu channel.

Outputs a 4x4 tiled image of Hatsune Miku with the tiles shuffled and an additional header row.
The result is scored based on the number of tiles which are in the correct position and correctly adjacent tiles.

The best result is persistet in the database.

### [BestMixu](src/commands/mixu.ts)

Parameters: n/a

Outputs the mixu picture with the best score from the DB and for whom it was generated.

### [Quote](src/commands/quote.ts)

Parameters: quoteid (optional)

Fetches a random quote from bufutda's quote API and outputs the id of the quote and the quote itself to the channel.
If the user specifies a quote ID, the bot outputs that quote.

The quotes are cached for 30 minutes.

### [Quwuote](src/commands/quote.ts)

Parameters: quoteid

Same as the quote command but runs the uwuify function from the uwu command over the quote.

### [Rps](src/commands/rps.ts)

Parameters: n/a

Challenge other users to a game of rock paper scissors.

The bot messages both users and asks for their choice. Afterwards, it shows who has won.

Currently, no slash-command version exists.

### [Sb](src/commands/spongebob.ts)

Parameters: text

Takes the input text and changes the case of the letters in the text like in the Mocking SpongeBob meme.

Texts longer than 200 characters are only allowed outside of the #banana-hammock channel.

### [Timeout](src/commands/timeout.ts)

Parameters: text, duration

Allows mods to timeout users for a certain duration.

### [Sudoku](src/commands/timeout.ts)

Parameters: n/a

Times out the user for a random duration between 420 and 690 seconds inclusively.

### [Uwu](src/commands/uwu.ts)

Parameters: text

Replaces certain characters in the text, giving it an UwU flair.

Texts longer than 200 characters are only allowed outside of the #banana-hammock channel.

### [Weather](src/commands/weather.ts)

Parameters: location

Outputs the weather at the location.

The location must be a place name or a postal code, optionally followed by a two letter country code.

## Mod commands

Special commands which can only be used my mods.

### [ReleaseTheEggplant](src/commands/releasetheeggplant.ts)

Parameters: user

Makes the bot change its user name to 🍆🔪 and threatens the user.

After a short timeout, the name changes back.

### [GambleChance](src/commands/setgamble.ts)

Parameters: gambleChance

Sets the gamble chance used for the random command.

## Role commands

These commands affect the role users have on the server.

### [Uncolor](src/commands/changecolor.ts)

Parameters: none

Only usable by Mods. Removes the color role from the user.

### [ChangeColor](src/commands/changecolor.ts)

Parameters: color, isFavorite

Set the user's color, which must be a 6 digit hex value, and optionally define it as their favourite color.

### [Random](src/commands/changecolor.ts)

Parameters: none

Randomly sets a user's color. The user's cooldown is set to 60 minutes.

### [Lazy](src/commands/changecolor.ts)

Parameters: none

Sets the user's favorite color, unless they are on a timeout.

### [Gamble](src/commands/changecolor.ts)

Parameter: none

Like the random command but has a chance that the user keeps their color.

## Development How-To

### Set up the database
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

### How to run
#### Docker
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

#### Locally
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
