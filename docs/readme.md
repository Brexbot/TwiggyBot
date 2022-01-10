The directory contains useful documentation, and new-dev setup info (keep reading).

## Getting Started
- [Basic Git Commands](https://education.github.com/git-cheat-sheet-education.pdf)
- [Understanding Small-Team Git Workflow](https://docs.google.com/document/d/1UbYoit3UTWXC7_da_aprAjcJjIduepT6EsM9Qa1c8sg/edit)

### Initial bot setup

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
        1. Check "Bot".
        2. Check all the permissions you wish to give the bot within your server.
        3. Copy and navigate to the Generated URL in a new tab.
        4. Add the bot to the specified server. **Currently, please create your own server and add it to only your server for testing.**
    8. Copy your Bot Token, for later.
4. Code Stuff
    1. In main.ts, next to `BOT_TOKEN`, change the line's default from an empty string to your copied Bot Token.
        1. `client.login(process.env.BOT_TOKEN ?? "<your_bot_token>"); // provide your bot token`
    2. Run `npm run start`

I've gotten to the point where I've added the bot to the server, but the bot crashes when I try to run it with `npm run start`.
