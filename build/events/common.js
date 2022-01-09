import { __decorate, __metadata } from "tslib";
import { Discord, On, Client } from "discordx";
let AppDiscord = class AppDiscord {
    onMessage([message], client) {
        console.log("Message Deleted", client.user?.username, message.content);
    }
};
__decorate([
    On("messageDelete"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Client]),
    __metadata("design:returntype", void 0)
], AppDiscord.prototype, "onMessage", null);
AppDiscord = __decorate([
    Discord()
], AppDiscord);
export { AppDiscord };
//# sourceMappingURL=common.js.map