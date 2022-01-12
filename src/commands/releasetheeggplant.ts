import { CommandInteraction } from 'discord.js'
import { ArgsOf, Discord, SimpleCommand, SimpleCommandOption, SimpleCommandMessage, SlashOption, Slash } from 'discordx'

@Discord()
class ReleaseTheEggplant {

  @SimpleCommand('releasetheeggplant', { description: 'Release the eggplant on a user of your choosing', argSplitter: '\n'})
  simple(@SimpleCommandOption("name", { type: "USER" }) name: user | undefined, command: SimpleCommandMessage) {
    if (!name) return command.message.reply("usage: ``>releasetheeggplant <user>``");
    let originalNickname = command.message.client.user?.username;
    let botId = command.message.client.user?.id;
    let thisBot = command.message.guild.members.cache.find(u => u.id === botId);
    thisBot.setNickname("🍆🔪");
    command.message.channel.send(`I'm coming for you, ${name}!`);
    setTimeout(() => thisBot.setNickname(null), 30000);
  }

  @Slash('releasetheeggplant', { description: 'Release the eggplant on a user of your choosing' })
  async slash(
    @SlashOption('name', { type: "USER", required: true })
    name: user,
    interaction: CommandInteraction
  ) {
    let originalNickname = command.message.client.user?.username;
    let botId = command.message.client.user?.id;
    let thisBot = command.message.guild.members.cache.find(u => u.id === botId);
    thisBot.setNickname("🍆🔪");
    interaction.reply(`I'm coming for you, ${name}!`);
    setTimeout(() => thisBot.setNickname(null), 30000);
  }
}
