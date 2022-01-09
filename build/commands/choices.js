import { __decorate, __metadata, __param } from "tslib";
import { CommandInteraction } from "discord.js";
import { Discord, Slash, SlashOption, SlashChoice } from "discordx";
var TextChoices;
(function (TextChoices) {
    // WhatDiscordShows = value
    TextChoices["Hello"] = "Hello";
    TextChoices["Good Bye"] = "GoodBye";
})(TextChoices || (TextChoices = {}));
let choicesExample = class choicesExample {
    async choose(what, interaction) {
        interaction.reply(what);
    }
    async choice(what, interaction) {
        interaction.reply(what);
    }
};
__decorate([
    Slash("choose"),
    __param(0, SlashChoice("Human", "human")),
    __param(0, SlashChoice("Astraunot", "astro")),
    __param(0, SlashChoice("Dev", "dev")),
    __param(0, SlashOption("what", { description: "What are you?" })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CommandInteraction]),
    __metadata("design:returntype", Promise)
], choicesExample.prototype, "choose", null);
__decorate([
    Slash("choice"),
    __param(0, SlashChoice(TextChoices)),
    __param(0, SlashChoice("How are you", "question")),
    __param(0, SlashOption("text")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CommandInteraction]),
    __metadata("design:returntype", Promise)
], choicesExample.prototype, "choice", null);
choicesExample = __decorate([
    Discord()
], choicesExample);
//# sourceMappingURL=choices.js.map