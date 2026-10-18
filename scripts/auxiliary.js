// Sets up game-system-specific options for the turn banner.
// Called from main.js once the TurnSubscriber class exists.
export function applySystemOverrides(Subscriber) {
    const isExalted = game.system.id === "exaltedessence";
    const isPf2e = game.system.id === "pf2e";

    if (isExalted) {
        Subscriber.config = () => ({
            showNextUp: false,
            showTurnNumber: false,
            imageMarginTop: "5rem",
            bannerMarginTop: "10rem",
            skipNextCombatant: true,
            getCombatantDisplayNameFn: null,
        });
    } else if (isPf2e) {
        Subscriber.config = () => ({
            showNextUp: true,
            showTurnNumber: true,
            imageMarginTop: "5rem",
            bannerMarginTop: "10rem",
            skipNextCombatant: false,
            // Hides the name if PF2e's token privacy setting says players shouldn't see it.
            getCombatantDisplayNameFn: (combatant) => {
                const shouldShow =
                    game.user.isGM || (combatant.token?.playersCanSeeName ?? true);
                return shouldShow
                    ? combatant.name
                    : game.i18n.localize("YOUR-TURN.Unknown");
            },
        });
    }

    // Exalted's "end turn" button can skip the normal combat update,
    // so we refresh the banner manually as a backup.
    if (isExalted) {
        const CombatClass = CONFIG.Combat.documentClass;
        if (CombatClass) {
            const origToggleTurnOver = CombatClass.prototype.toggleTurnOver;
            CombatClass.prototype.toggleTurnOver = async function (id) {
                await origToggleTurnOver.call(this, id);
                Subscriber.updateForNewTurn(this);
            };
        }
    }
}