import { __decorate, __metadata, __param } from "tslib";
import { Discord, SimpleCommand, SimpleCommandMessage, SimpleCommandOption, } from "discordx";
let simpleCommandExample = class simpleCommandExample {
    hello(command) {
        command.message.reply(`👋 ${command.message.member}`);
    }
    sum(num1, num2, command) {
        if (!num1 || !num2) {
            return command.sendUsageSyntax();
        }
        command.message.reply(`total = ${num1 + num2}`);
    }
};
__decorate([
    SimpleCommand("hello", { aliases: ["hi"] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SimpleCommandMessage]),
    __metadata("design:returntype", void 0)
], simpleCommandExample.prototype, "hello", null);
__decorate([
    SimpleCommand("sum", { argSplitter: "+" }),
    __param(0, SimpleCommandOption("num1", { type: "NUMBER" })),
    __param(1, SimpleCommandOption("num2", { type: "NUMBER" })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, SimpleCommandMessage]),
    __metadata("design:returntype", void 0)
], simpleCommandExample.prototype, "sum", null);
simpleCommandExample = __decorate([
    Discord()
], simpleCommandExample);
//# sourceMappingURL=simple%20command.js.map