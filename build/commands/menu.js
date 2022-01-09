import { __decorate, __metadata } from "tslib";
import { CommandInteraction, MessageActionRow, SelectMenuInteraction, MessageSelectMenu, } from "discord.js";
import { Discord, Slash, SelectMenuComponent } from "discordx";
const roles = [
    { label: "Principal", value: "principal" },
    { label: "Teacher", value: "teacher" },
    { label: "Student", value: "student" },
];
let buttons = class buttons {
    async handle(interaction) {
        await interaction.deferReply();
        // extract selected value by member
        const roleValue = interaction.values?.[0];
        // if value not found
        if (!roleValue) {
            return await interaction.followUp("invalid role id, select again");
        }
        await interaction.followUp(`you have selected role: ${roles.find((r) => r.value === roleValue)?.label}`);
        return;
    }
    async myroles(interaction) {
        await interaction.deferReply();
        // create menu for roels
        const menu = new MessageSelectMenu()
            .addOptions(roles)
            .setCustomId("role-menu");
        // create a row for meessage actions
        const buttonRow = new MessageActionRow().addComponents(menu);
        // send it
        interaction.editReply({
            content: "select your role!",
            components: [buttonRow],
        });
        return;
    }
};
__decorate([
    SelectMenuComponent("role-menu"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SelectMenuInteraction]),
    __metadata("design:returntype", Promise)
], buttons.prototype, "handle", null);
__decorate([
    Slash("myroles", { description: "roles menu" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CommandInteraction]),
    __metadata("design:returntype", Promise)
], buttons.prototype, "myroles", null);
buttons = __decorate([
    Discord()
], buttons);
export { buttons };
//# sourceMappingURL=menu.js.map