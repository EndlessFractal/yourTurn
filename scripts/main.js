// Import custom patches
import "./auxiliary.js"

// Importing the Settings module from "./settings.js"
import { Settings } from "./settings.js";

// Exporting the TurnSubscriber class as the default export of the module
export default class TurnSubscriber {
    // Static properties of the TurnSubscriber class
    static gmColor;
    static container = null;
    static currentImg = null;
    static banner = null;
    static myTimer = null;

    // State tracking
    static lastProcessedTurn = null;
    static lastHiddenRound = null;
    static lastCombatId = null;

    // Static method that starts the turn tracking
    static begin() {
        // Register module settings
        Hooks.once('init', () => {
            Settings.registerSettings();
        });

        Hooks.on("ready", () => {
            const size = Settings.getImgSize() + "px";
            document.documentElement.style.setProperty("--yourTurnImgWidth", size);
            document.documentElement.style.setProperty("--yourTurnImgHeight", size);
            // Wait for the GM to be available
            this.waitForGM().then((gm) => {
                this.gmColor = gm.color;

                // Create UI elements once (avoids duplication)
                this.initializeUI();

                // Hook that triggers when the combat is updated
                Hooks.on("updateCombat", (combat, update, options, userId) => {
                    if (!combat.started || !combat.active) {
                        this.cleanup();
                        return;
                    }
                    this._onUpdateCombat(combat, update, options, userId);
                });

                // Cleanup when combat is deleted
                Hooks.on("deleteCombat", () => this.cleanup());
            });
        });
    }

    // Static method that creates the static container and reusable image element
    static initializeUI() {
        if (this.container) return;

        this.container = document.createElement("div");
        this.container.id = "yourTurnContainer";
        const uiTOP = document.getElementById("ui-top");
        if (uiTOP) uiTOP.appendChild(this.container);

        // Compatibility override for Carousel Combat Tracker module (only if active)
        const combatTrackerDock = game.modules.get("combat-tracker-dock");
        if (combatTrackerDock?.active) {
            const styleId = "yourTurn-compat-override";
            if (!document.getElementById(styleId)) {
                const style = document.createElement("style");
                style.id = styleId;
                style.textContent = `
                    #ui-top #yourTurnContainer {
                        display: block !important;
                        margin-top: -10rem;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        this.currentImg = document.createElement("img");
        this.currentImg.id = "yourTurnCurrentImg";
        this.currentImg.className = "yourTurnImg";
        this.container.appendChild(this.currentImg);
    }

    // Static method that waits for the GM to be available
    static async waitForGM() {
        let gm = game.users.find((u) => u.isGM && u.active);
        if (gm) return gm;

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                gm = game.users.find((u) => u.isGM && u.active);
                if (gm) {
                    clearInterval(interval);
                    resolve(gm);
                }
            }, 1000);
        });
    }

    // Static method that initializes configuration
    static config() {
        return {
            showNextUp: true,
            showTurnNumber: true,
            imageMarginTop: '',
            bannerMarginTop: '',
            skipNextCombatant: false,
            getCombatantDisplayNameFn: null
        };
    }

    // Static method that resets all state and clears timers
    static cleanup() {
        if (this.myTimer) {
            clearTimeout(this.myTimer);
            this.myTimer = null;
        }
        if (this.banner) {
            this.banner.remove();
            this.banner = null;
        }
        this.lastProcessedTurn = null;
        this.lastHiddenRound = null;
        this.lastCombatId = null;
    }

    // Static method that handles the updateCombat hook
    static _onUpdateCombat(combat, update, options, userId) {
        // Reset hidden tracking if a new combat has started
        if (this.lastCombatId !== combat.id) {
            this.lastCombatId = combat.id;
            this.lastHiddenRound = null;
        }

        // Only proceed if the turn or round has changed
        if (!update || (!('turn' in update) && !('round' in update))) return;

        // Avoid processing the same turn twice
        const currentTurnId = `${combat.round}-${combat.turn}`;
        if (currentTurnId === this.lastProcessedTurn) return;
        this.lastProcessedTurn = currentTurnId;

        this.updateForNewTurn(combat);
    }

    // Core logic: show or hide banner based on combatant state
    static updateForNewTurn(combat) {
        // Always record dedup key so direct calls (e.g. Exalted toggleTurnOver) won't cause double-processing when the normal hook fires later.
        this.lastProcessedTurn = `${combat.round}-${combat.turn}`;

        const combatant = combat.combatant;
        if (!combatant) return;

        // If the combatant is defeated, simply hide any existing banner
        if (combatant.defeated) {
            this.hideBanner();
            return;
        }

        // Determine which image to show for the "current" combatant
        const useTokens = Settings.getUseTokens();
        let currentSrc = useTokens && combatant.token?.texture?.src
            ? combatant.token.texture.src
            : combatant.actor?.img;

        // Build the display name
        let ytName = this.getCombatantDisplayName(combatant);

        let ytText = "";

        // Determine the banner text based on ownership, hidden status, etc.
        if (combatant.isOwner && !game.user.isGM &&
            combatant.players?.some(p => p.id === game.user.id && p.active)) {
            ytText = `${game.i18n.localize("YOUR-TURN.YourTurn")}, ${ytName}!`;
        } else if (combatant.hidden) {
            // Hidden combatant handling
            if (!game.user.isGM && !Settings.getHideNextUpHidden()) {
                // Only show "Something Happens" once per round
                if (this.lastHiddenRound !== combat.round) {
                    ytText = game.i18n.localize("YOUR-TURN.SomethingHappens");
                    this.lastHiddenRound = combat.round;
                    currentSrc = "modules/your-turn/img/hidden.svg";
                } else {
                    this.hideBanner();
                    return;
                }
            } else {
                this.hideBanner();
                return;
            }
        } else {
            const localizedTurn = game.i18n.localize("YOUR-TURN.Turn");
            if (Settings.getUsePossessive()) {
                ytText = `${ytName}'s ${localizedTurn}!`;
            } else {
                ytText = `${ytName} ${localizedTurn}!`;
            }
        }

        // Compute config once and reuse it, rather than re-invoking (and re-allocating) it separately in each helper below.
        const config = this.config();

        // Find the "next" combatant, but only if it will be displayed (skipping hidden/defeated entries as needed).
        const nextCombatant = (config.showNextUp && !Settings.getHideNextUp())
            ? this.getNextCombatant(combat, config)
            : null;

        // Ensure UI exists
        if (!this.container || !this.currentImg) this.initializeUI();

        // Apply CSS animation when changing the main image
        this.updateCurrentImage(currentSrc, config);

        // Create or refresh the banner DOM element
        this.updateBanner(combat, ytText, nextCombatant, config);

        // Restart the unload timer so the image/banner will fade out after 4 seconds
        this.startUnloadTimer();
    }

    // Apply CSS animation when changing the main image
    static updateCurrentImage(src, config = this.config()) {
        if (!this.currentImg) return;

        this.currentImg.classList.remove("adding", "removing");
        this.currentImg.src = src || "modules/your-turn/img/hidden.svg";

        // Force reflow to restart animation
        void this.currentImg.offsetWidth;
        this.currentImg.classList.add("adding");
        const margin = config.imageMarginTop;
        if (margin) this.currentImg.style.marginTop = margin;
    }

    // Create or refresh the banner DOM element
    static updateBanner(combat, ytText, nextCombatant, config = this.config()) {
        if (this.banner) {
            this.banner.remove();
            this.banner = null;
        }

        const bannerDiv = document.createElement("div");
        bannerDiv.id = "yourTurnBanner";
        bannerDiv.className = "yourTurnBanner";

        // Adjust banner height based on image size setting
        const imgSize = Settings.getImgSize();
        bannerDiv.style.height = `${imgSize + 30}px`;

        // Build subheading: always show round, optionally the turn number
        const baseTurn = this.computeCustomTurnNumber(combat);
        const turnNumber = Settings.getStartCounterAtOne() ? baseTurn : Math.max(0, baseTurn - 1);
        let subheadingHTML = `${game.i18n.localize("YOUR-TURN.Round")} #${combat.round}`;
        if (config.showTurnNumber) {
            subheadingHTML += ` ${game.i18n.localize("YOUR-TURN.Turn")} #${turnNumber}`;
        }

        // Next‑up line (only if enabled and a valid next combatant exists)
        let nextUpHTML = "";
        if (config.showNextUp && nextCombatant) {
            nextUpHTML = this.getNextTurnHtml(nextCombatant);
        }

        bannerDiv.innerHTML = `
            <p id="yourTurnText" class="yourTurnText">${ytText}</p>
            <div class="yourTurnSubheading">${subheadingHTML}</div>
            ${nextUpHTML}
            <div id="yourTurnBannerBackground" class="yourTurnBannerBackground"></div>
        `;

        // Set the CSS variables for player and GM colors
        const root = document.documentElement;
        const player = combat.combatant?.players?.[0];
        if (combat.combatant?.hasPlayerOwner && player?.active) {
            root.style.setProperty("--yourTurnPlayerColor", player.color);
            root.style.setProperty("--yourTurnPlayerColorTransparent", player.color + "80");
        } else {
            root.style.setProperty("--yourTurnPlayerColor", this.gmColor);
            root.style.setProperty("--yourTurnPlayerColorTransparent", this.gmColor + "80");
        }
        if (config.bannerMarginTop) {
            bannerDiv.style.marginTop = config.bannerMarginTop;
        }

        this.container.appendChild(bannerDiv);
        this.banner = bannerDiv;
    }

    // Static method that generates the HTML for the next turn
    static getNextTurnHtml(nextCombatant) {
        if (Settings.getHideNextUp() || !nextCombatant) return "";

        let name = TurnSubscriber.getCombatantDisplayName(nextCombatant);

        const useTokens = Settings.getUseTokens();
        let nextSrc = useTokens && nextCombatant.token?.texture?.src
            ? nextCombatant.token.texture.src
            : nextCombatant.actor?.img || "modules/your-turn/img/hidden.svg";

        return `
            <div class="yourTurnSubheading last">
                ${game.i18n.localize("YOUR-TURN.NextUp")}:
                <img class="yourTurnImg yourTurnSubheading" src="${nextSrc}" alt="">
                ${name}
            </div>`;
    }

    // Static method that retrieves the next combatant
    static getNextCombatant(combat, config = this.config()) {
        if (config.skipNextCombatant) return null;
        if (!combat?.turns?.length) return null;

        let j = 1;
        while (j < combat.turns.length) {
            const idx = (combat.turn + j) % combat.turns.length;
            const combatant = combat.turns[idx];

            // Return immediately if we find a valid combatant
            if (!combatant.hidden && !combatant.defeated) {
                return combatant;
            }
            j++;
        }

        // No valid next combatant found
        return null;
    }

    // For auxiliary.js usage
    static getCombatantDisplayName(combatant) {
        const fn = this.config().getCombatantDisplayNameFn;
        return fn ? fn(combatant) : combatant.name;
    }

    // Calculate custom turn number (counts only non‑defeated combatants)
    static computeCustomTurnNumber(combat) {
        if (!combat?.turns || combat.turn === null) return 0;

        let count = 0;
        for (let i = 0; i <= combat.turn; i++) {
            if (!combat.turns[i].defeated) count++;
        }
        return count;
    }

    // Static method that hides the banner with a fade-out animation
    static hideBanner() {
        clearTimeout(this.myTimer);
        this.myTimer = null;

        const target = this.banner;
        if (!target) return;

        target.classList.add("removing");
        setTimeout(() => {
            if (this.banner === target) {
                target.remove();
                this.banner = null;
            }
        }, 800);
    }

    // Static method that starts the auto‑hide timer
    static startUnloadTimer() {
        clearTimeout(this.myTimer);
        this.myTimer = setTimeout(() => this.unloadImage(), 4000);
    }

    // Static method that triggers fade‑out on image and banner background
    static unloadImage() {
        if (this.currentImg) this.currentImg.classList.add("removing");
        if (this.banner) {
            const bg = this.banner.querySelector("#yourTurnBannerBackground");
            if (bg) bg.classList.add("removing");
            this.banner.classList.add("removing");
        }
    }
}

// Call the begin() method of TurnSubscriber to start the turn tracking
TurnSubscriber.begin();