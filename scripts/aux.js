import TurnSubscriber from './main.js';

Hooks.once('ready', () => {
    // Detect which game system is currently active
    const isExalted = game.system.id === 'exaltedessence';
    const isPf2e = game.system.id === 'pf2e';

    // Override the static config method to supply system‑specific settings
    if (isExalted) {
        TurnSubscriber.config = () => ({
            showNextUp: false,
            showTurnNumber: false,
            imageMarginTop: '15rem',
            bannerMarginTop: '20rem',
            skipNextCombatant: true,
            getCombatantDisplayNameFn: null
        });
    } else if (isPf2e) {
        TurnSubscriber.config = () => ({
            showNextUp: true,
            showTurnNumber: true,
            imageMarginTop: '15rem',
            bannerMarginTop: '20rem',
            skipNextCombatant: false,
            // PF2e: hide actor name when token privacy demands it
            getCombatantDisplayNameFn: (combatant) => {
                const shouldShow = game.user.isGM
                    || (combatant.token?.playersCanSeeName ?? true);
                return shouldShow
                    ? combatant.name
                    : game.i18n.localize('YOUR-TURN.Unknown');
            }
        });
    }
    // For all other systems the default config (from main.js) is used automatically.

    // Exalted Essence: force banner refresh when a turn is toggled
    if (isExalted) {
        const CombatClass = CONFIG.Combat.documentClass;
        if (CombatClass) {
            const origToggleTurnOver = CombatClass.prototype.toggleTurnOver;
            CombatClass.prototype.toggleTurnOver = async function (id) {
                await origToggleTurnOver.call(this, id);
                TurnSubscriber.updateForNewTurn(this);
            };
        }
    }
});