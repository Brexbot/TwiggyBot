
The directory contains useful documentation, and new-dev setup info (keep reading).

## Getting Started
### Git
Git is our version tracker and codebase maintainer (much like everywhere else). It's how we can all work on the same code without overriding each other's changes haphazardly.
- [Basic Git Commands](https://education.github.com/git-cheat-sheet-education.pdf)
- [Understanding Small-Team Git Workflow](https://docs.google.com/document/d/1UbYoit3UTWXC7_da_aprAjcJjIduepT6EsM9Qa1c8sg/edit) - courtesy of **zephyrtronium**

### Discord.JS/TS
The bot is built on Node.JS as its base. TypeScript is a superset of base Javascript that allows for strict typing of variables.
- [Discord.js Documentation](https://discord.js.org/#/docs)
- [Discord.ts Documentation](https://discord-ts.js.org/docs/installation)

## Initial bot setup

0. Install [Node.js](https://nodejs.org/en/download/) and npm for your computer. Check your versions with `node -v` and `npm -v` in your terminal.
1. Git Stuff
    1. Fork the repository to your user, then clone the forked repository. `git clone https://github.com/<your_user>/DiscordBot`
2. npm Stuff
    1. In your preffered terminal CLI, navigate to the folder of the repo. `cd DiscordBot`
    2. Run `npm install`
    3. Run `npm run build`
3. Bot Stuff
    1. Go to the [Discord Developer Portal](https://discord.com/developers/). Log in, if you need to.
    2. Create a new application with the button on the top right.
    3. After naming it, navigate to "Bot" on the left menu.
    4. Click "Add Bot" on the right side. Click "Yes, do it!"
    5. Navigate to "Bot" again if it takes you away.
    6. Under *Privileged Gateway Intents*, enable *Server Members Intent* and *Message Content Intent*.
        1. Server Members Intent will allow your bot to login using the token later.
    7. Navigate to "OAuth2" > "URL Generator"
        1. Check "Bot" and "application.commands".
        2. Check all the permissions you wish to give the bot within your server.
        3. Copy and navigate to the Generated URL in a new tab.
        4. Add the bot to the specified server. **Currently, please create your own server and add it to only your server for testing.**
    8. Copy your Bot Token, for later.
4. Code Stuff
    1. Export your bot token as an environment variable `export DISCORD_TOKEN=<token>` (bash and similar) or `$Env:DISCORD_TOKEN = "<token>"` (Powershell)
    2. Run `npm run start`
    3. If your bot runs without any errors (you see "Bot started"), then you're off and running. You can use Ctrl+C to hop out of the process whenever you want.


### Coming back to the project
1. In your CLI, navigate to the folder of your repo. (`cd DiscordBot`)
2. Get the latest version of the code:
    1. `git fetch origin` to take a gander at what's changed without messing with anything you have locally
    2. If everything looks good, run a `git pull`.
3. Re-run the following commands to install any node modules that have been added since you last worked on the bot.
    1. `npm install`
    2. `npm run build`
4. You should be good to go with an `npm run start`. Unless you did something to your Discord bot application, it should be right where you left it.
