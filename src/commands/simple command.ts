import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";

@Discord()
class simpleCommandExample {
  @SimpleCommand("hello", { aliases: ["hi"] })
  hello(command: SimpleCommandMessage) {
    command.message.reply(`👋 ${command.message.member}`);
  }

  @SimpleCommand("sum", { argSplitter: "+" })
  sum(
    @SimpleCommandOption("num1", { type: "NUMBER" }) num1: number | undefined,
    @SimpleCommandOption("num2", { type: "NUMBER" }) num2: number | undefined,
    command: SimpleCommandMessage
  ) {
    if (!num1 || !num2) {
      return command.sendUsageSyntax();
    }
    command.message.reply(`total = ${num1 + num2}`);
  }
}
