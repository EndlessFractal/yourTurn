import TurnSubscriber from './main.js';

Hooks.once('ready', () => {
    // Detect which game system is currently active
    const isExalted = game.system.id === 'exaltedessence';
    const isPf2e = game.system.id === 'pf2e';

    // Adjust an image element's top margin for the current system
    const setImageMargin = (imgElement) => {
        if (!imgElement) return;
        if (isExalted) {
            imgElement.style.marginTop = '15rem';
        } else if (isPf2e) {
            imgElement.style.marginTop = '15rem';
        } else {
            // Default (D&D5e, etc.)
            imgElement.style.marginTop = '';
        }
    };

    // Adjust the banner element's top margin for the current system
    const setBannerMargin = (bannerElement) => {
        if (!bannerElement) return;
        if (isExalted) {
            bannerElement.style.marginTop = '20rem';
        } else if (isPf2e) {
            bannerElement.style.marginTop = '20rem';
        } else {
            bannerElement.style.marginTop = '';
        }
    };

    // -----------------------------------------------
    // Override updateCurrentImage to apply system margin
    // after the original image update.
    // -----------------------------------------------
    const originalUpdateImage = TurnSubscriber.updateCurrentImage;
    TurnSubscriber.updateCurrentImage = function(src) {
        originalUpdateImage.call(this, src);
        setImageMargin(this.currentImg);
    };

    // -----------------------------------------------
    // Override updateBanner to handle system differences.
    // For Exalted: create a simplified banner without "Next Up".
    // For others: normal banner, then add margin.
    // -----------------------------------------------
    const originalUpdateBanner = TurnSubscriber.updateBanner;
    TurnSubscriber.updateBanner = function(combat, ytText, nextCombatant) {
        if (isExalted) {
            const combatant = combat.combatant;
            if (!combatant) return;

            // Remove any existing banner
            if (this.banner) {
                this.banner.remove();
                this.banner = null;
            }

            // Create the banner div
            const bannerDiv = document.createElement('div');
            bannerDiv.id = 'yourTurnBanner';
            bannerDiv.className = 'yourTurnBanner';
            setBannerMargin(bannerDiv);   // Apply Exalted margin (20rem)

            // Build the inner HTML (no "Next Up" line)
            bannerDiv.innerHTML = `
                <p id="yourTurnText" class="yourTurnText">${ytText}</p>
                <div class="yourTurnSubheading">
                    ${game.i18n.localize('YOUR-TURN.Round')} #${combat.round}
                </div>
                <div id="yourTurnBannerBackground" class="yourTurnBannerBackground"></div>
            `;

            // Set player color (or fallback to GM color)
            const root = document.documentElement;
            const player = combatant.players?.[0];
            if (combatant.hasPlayerOwner && player?.active) {
                root.style.setProperty('--yourTurnPlayerColor', player.color);
                root.style.setProperty('--yourTurnPlayerColorTransparent', player.color + '80');
            } else {
                root.style.setProperty('--yourTurnPlayerColor', this.gmColor);
                root.style.setProperty('--yourTurnPlayerColorTransparent', this.gmColor + '80');
            }

            this.container.appendChild(bannerDiv);
            this.banner = bannerDiv;
        } else {
            // Use the original banner for all other systems (D&D5e, PF2e, etc.)
            originalUpdateBanner.call(this, combat, ytText, nextCombatant);
            // Apply the appropriate margin after creating the banner
            if (this.banner) setBannerMargin(this.banner);
        }
    };

    // -----------------------------------------------
    // Exalted Essence adjustments:
    // - No "Next Up" combatant (popcorn initiative).
    // - Force banner refresh when a turn is toggled over.
    // -----------------------------------------------
    if (isExalted) {
        // getNextCombatant always returns null (Exalted doesn't have a set order)
        TurnSubscriber.getNextCombatant = () => null;

        // Hook into toggleTurnOver so the banner updates after a turn ends/starts
        const CombatClass = CONFIG.Combat.documentClass;
        if (CombatClass) {
            const origToggleTurnOver = CombatClass.prototype.toggleTurnOver;
            CombatClass.prototype.toggleTurnOver = async function (id) {
                await origToggleTurnOver.call(this, id);
                TurnSubscriber.updateForNewTurn(this);
            };
        }
    }

    // -----------------------------------------------
    // PF2e adjustment: hide actor names when the token
    // setting "playersCanSeeName" is false.
    // -----------------------------------------------
    if (isPf2e) {
        TurnSubscriber.getCombatantDisplayName = function (combatant) {
            const shouldShowName = game.user.isGM
                || (combatant.token?.playersCanSeeName ?? true);
            return shouldShowName ? combatant.name : game.i18n.localize('YOUR-TURN.Unknown');
        };
    }
});