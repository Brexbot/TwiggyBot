import { __decorate, __metadata } from "tslib";
import { ContextMenuInteraction } from "discord.js";
import { Discord, ContextMenu } from "discordx";
let contextTest = class contextTest {
    async messageHandler(interaction) {
        interaction.reply("I am user context handler");
    }
    async userHandler(interaction) {
        interaction.reply("I am user context handler");
    }
};
__decorate([
    ContextMenu("MESSAGE", "message context"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ContextMenuInteraction]),
    __metadata("design:returntype", Promise)
], contextTest.prototype, "messageHandler", null);
__decorate([
    ContextMenu("USER", "user context"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ContextMenuInteraction]),
    __metadata("design:returntype", Promise)
], contextTest.prototype, "userHandler", null);
contextTest = __decorate([
    Discord()
], contextTest);
export { contextTest };
//# sourceMappingURL=context.js.map