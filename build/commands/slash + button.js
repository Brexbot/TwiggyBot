import { __decorate, __metadata, __param } from "tslib";
import { ButtonInteraction, CommandInteraction, MessageButton, MessageActionRow, } from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
let buttonExample = class buttonExample {
    async hello(user, interaction) {
        await interaction.deferReply();
        const helloBtn = new MessageButton()
            .setLabel("Hello")
            .setEmoji("👋")
            .setStyle("PRIMARY")
            .setCustomId("hello-btn");
        const row = new MessageActionRow().addComponents(helloBtn);
        interaction.editReply({
            content: `${user}, Say hello to bot`,
            components: [row],
        });
    }
    mybtn(interaction) {
        interaction.reply(`👋 ${interaction.member}`);
    }
};
__decorate([
    Slash("hello-btn"),
    __param(0, SlashOption("user", { type: "USER" })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CommandInteraction]),
    __metadata("design:returntype", Promise)
], buttonExample.prototype, "hello", null);
__decorate([
    ButtonComponent("hello-btn"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ButtonInteraction]),
    __metadata("design:returntype", void 0)
], buttonExample.prototype, "mybtn", null);
buttonExample = __decorate([
    Discord()
], buttonExample);
//# sourceMappingURL=slash%20+%20button.js.map