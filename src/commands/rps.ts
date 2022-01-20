import { CommandInteraction, TextBasedChannel, TextChannel, User } from 'discord.js';
import {
  type ArgsOf,
  Discord,
  On,
  SlashChoice,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  Slash,
  SlashOption,
} from 'discordx';

enum SlashOptions {
  Challenge = 'challenge',
  Accept = 'accept',
  End = 'end',
};

@Discord()
class RPS {
  private general_channel = '103678524375699456';

  private timeout_duration = 1000 * 60 * 5;
  private challenger: User | null = null;
  private acceptor: User | null = null;
  private plays: { [user_id: string]: string } = {};
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private channel: TextChannel | TextBasedChannel | null = null;

  private wins_table: { [play: string]: string } = {
    'rock': 'scissors',
    'paper': 'rock',
    'scissors': 'paper',
  };

  private clear_game() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.challenger = null;
    this.acceptor = null;
    this.plays = {};
    this.timeout = null;
  }

  private expect_play(user: User) {
    user.send('Please respond with rock, paper, or scissors');
  }

  private do_rps(text: string, user: User, channel: TextChannel | TextBasedChannel): string {
    text = text.toLowerCase();

    if (text === 'challenge') {
      // If successful, sets this.challenger and this.timeout
      if (this.acceptor) {
        return 'Rps in progress. Please wait.';
      }
      if (this.challenger) {
        return this.challenger.username + ' is already challenging someone. Use /rps accept to accept their challenge.';
      }

      this.timeout = setTimeout(() => {
        if (!this.challenger) {
          console.log('Impossible: rps: this.challenger not set');
          return 'You broke me!';
        }
        channel.send(this.challenger.username + ' failed to find someone for their challenge.');
        this.clear_game();
      }, this.timeout_duration);
      this.challenger = user;
      return this.challenger.username + ' is looking for someone to play in rock, paper, scissors. Use /rps accept to accept their challenge.';
    }

    if (text === 'accept') {
      // If successful, sets this.acceptor and resets this.timeout
      if (this.acceptor) {
        return 'Rps in progress. Please wait.';
      }
      if (!this.challenger) {
        return 'No one is currently initiating a rps encounter. Use /rps challenge to issue forth a challenge.';
      }
      if (this.challenger.id === user.id) {
        this.clear_game();
        return 'I see we\'re fighting ourselves again...';
      }

      this.acceptor = user;
      this.expect_play(this.challenger);
      this.expect_play(this.acceptor);
      if (!this.timeout) {
        console.log('Impossible: rps: this.timout not set to challenger timeout');
        return 'You broke me!';
      }
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        channel.send('Time out!  No one wins!');
        this.challenger = null;
        this.acceptor = null;
        this.plays = {};
      }, this.timeout_duration);
      return this.acceptor.username + ' accepts the duel. Please check your DMs.';
    }

    if (text === 'end') {
      if (!this.challenger || this.challenger.id !== user.id) {
        return 'You aren\'t challenging anyone!';
      }
      this.clear_game();
      return user.username + ' has ended their challenge because they are a big, fat :chicken:';
    }

    return 'Usage challenge/accept/end';
  }

  @On('messageCreate')
  rps_dm([message]: ArgsOf<'messageCreate'>) {
    // Only accept messages that are DMs if a game of rps is ongoing
    if (message.channel.type !== 'DM') {
      return;
    }
    if (!this.challenger || !this.acceptor) {
      return;
    }

    let player = null;
    if (this.challenger.id === message.author.id) {
      player = this.challenger;
    }
    if (this.acceptor.id === message.author.id) {
      player = this.acceptor;
    }
    if (!player) {
      return;
    }

    // Cannot change play
    if (this.plays[player.id]) {
      return;
    }
    const playerChoice = message.content.toLowerCase()
    if (playerChoice !== 'rock' && playerChoice !== 'paper' && playerChoice !== 'scissors') {
      this.expect_play(player);
    }

    this.plays[player.id] = message.content;

    if (!this.plays[this.challenger.id] || !this.plays[this.acceptor.id]) {
      return;
    }

    // Both players have played - decide winner
    let winner = null;
    if (this.wins_table[this.plays[this.challenger.id]] === this.plays[this.acceptor.id]) {
      winner = this.challenger;
    }
    if (this.wins_table[this.plays[this.acceptor.id]] === this.plays[this.challenger.id]) {
      winner = this.acceptor;
    }

    if (!this.channel) {
      console.log('Impossible: rps: this.channel not set');
      return;
    }
    if (!winner) {
      this.channel.send(this.challenger.username + ' and ' + this.acceptor.username + ' both show ' + this.plays[this.challenger.id] + '. It\'s a tie!');
    }
    else {
      this.channel.send(this.challenger.username + ' shows ' + this.plays[this.challenger.id] + '. ' + this.acceptor.username + ' shows ' + this.plays[this.acceptor.id] + '.\n' + winner.username + ' wins!');
    }

    this.clear_game();
  }
  
  @SimpleCommand('rps')
  rps(
    @SimpleCommandOption('text', { type: 'STRING' })
    text: string,
    command : SimpleCommandMessage
  ) {
    if (command.message.channel.id !== this.general_channel) {
      return;
    }
    this.channel = command.message.channel;
    this.channel.send(this.do_rps(text, command.message.author, command.message.channel));
  }

  @Slash('rps', { description: 'challenge, accept, or end a rock paper scissors game' })
  async slash(
    @SlashChoice(SlashOptions)
    @SlashOption('text')
    text: string,
    interaction : CommandInteraction
  ) {
    if (!interaction.channel) {
      return;
    }
    if (interaction.channel.id !== this.general_channel) {
      return;
    }
    this.channel = interaction.channel;
    interaction.reply(this.do_rps(text, interaction.user, interaction.channel));
  }
}
