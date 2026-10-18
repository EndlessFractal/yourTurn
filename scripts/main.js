// Import custom patches and settings
import { applySystemOverrides } from "./auxiliary.js";
import { Settings } from "./settings.js";

const BANNER_PADDING_PX = 30;
const UNLOAD_TIMEOUT_MS = 4000;
const HIDE_ANIMATION_MS = 800;

// Runs the setup right away if the game is loaded; otherwise, waits until it is.
function whenReady(fn) {
    if (game.ready) fn();
    else Hooks.once("ready", fn);
}

// Makes text safe to show on the page by replacing special characters.
function esc(value) {
    return foundry.utils.escapeHTML(String(value ?? ""));
}

// Adds transparency to a hex color. Leaves values it doesn't recognize unchanged.
function withAlpha(hex, alpha) {
    if (typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex)) {
        return hex + alpha;
    }
    return hex;
}

export default class TurnSubscriber {
    // On-screen elements
    static container = null;
    static currentImg = null;
    static banner = null;
    static myTimer = null;

    // Turn-tracking info
    static lastProcessedTurn = null;
    static lastHiddenRound = null;
    static lastCombatId = null;

    // Loads settings, then sets up the banner and watches for combat changes.
    static begin() {
        if (game.settings) {
            Settings.registerSettings();
        } else {
            Hooks.once("init", () => Settings.registerSettings());
        }

        whenReady(() => {
            applySystemOverrides(this);

            const size = `${Settings.getImgSize()}px`;
            document.documentElement.style.setProperty("--yourTurnImgWidth", size);
            document.documentElement.style.setProperty("--yourTurnImgHeight", size);

            this.initializeUI();

            Hooks.on("updateCombat", (combat, update, options, userId) => {
                if (!combat.started || !combat.active) {
                    this.cleanup();
                    return;
                }
                this._onUpdateCombat(combat, update, options, userId);
            });

            Hooks.on("deleteCombat", () => this.cleanup());
        });
    }

    // Builds the banner box and image once. Calling it again does nothing.
    static initializeUI() {
        if (this.container) return;

        this.container = document.createElement("div");
        this.container.id = "yourTurnContainer";

        const uiTOP = document.getElementById("ui-top");
        if (uiTOP) {
            uiTOP.appendChild(this.container);
        } else {
            // Fallback for UI modules that replace #ui-top.
            console.warn("your-turn | #ui-top not found; appending banner container to <body>.");
            document.body.appendChild(this.container);
        }

        // Adjusts placement for add-on modules that move the combat tracker.
        const compatModules = ["combat-carousel", "combat-tracker-dock"];
        if (compatModules.some((id) => game.modules.get(id)?.active)) {
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

    // Default display options. Other game systems can replace these.
    static config() {
        return {
            showNextUp: true,
            showTurnNumber: true,
            imageMarginTop: "",
            bannerMarginTop: "",
            skipNextCombatant: false,
            getCombatantDisplayNameFn: null,
        };
    }

    // Stops timers, removes the banner, and forgets the current turn.
    static cleanup() {
        if (this.myTimer) {
            clearTimeout(this.myTimer);
            this.myTimer = null;
        }
        if (this.banner) {
            this.banner.remove();
            this.banner = null;
        }
        if (this.currentImg) {
            this.currentImg.classList.remove("adding", "removing");
            this.currentImg.removeAttribute("src");
            this.currentImg.style.marginTop = "";
        }
        this.lastProcessedTurn = null;
        this.lastHiddenRound = null;
        this.lastCombatId = null;
    }

    // Called when combat changes. Starts fresh for a new combat, then updates.
    static _onUpdateCombat(combat, update, options, userId) {
        if (this.lastCombatId !== combat.id) {
            this.lastCombatId = combat.id;
            this.lastHiddenRound = null;
            this.lastProcessedTurn = null;
        }

        if (!update || (!("turn" in update) && !("round" in update))) return;

        this.updateForNewTurn(combat);
    }

    // Shows the banner/image for the current turn. Skips if the turn hasn't
    // really changed, so the banner stays hidden after fading.
    static updateForNewTurn(combat) {
        if (!combat?.turns || combat.turn == null) return;

        const combatant = combat.combatant;
        // Tracks turn by round and combatant, so reordering the list
        // doesn't count as a brand-new turn.
        const key = combatant
            ? `${combat.round}:${combatant.id}`
            : `${combat.round}:${combat.turn}`;

        if (key === this.lastProcessedTurn) return;
        this.lastProcessedTurn = key;

        if (!combatant) {
            this.hideBanner();
            return;
        }

        const config = this.config();

        if (combatant.defeated) {
            this.hideBanner();
            return;
        }

        const useTokens = Settings.getUseTokens();
        let currentSrc =
            useTokens && combatant.token?.texture?.src
                ? combatant.token.texture.src
                : combatant.actor?.img;
        currentSrc = currentSrc || "modules/your-turn/img/hidden.svg";

        const ytName = esc(this.getCombatantDisplayName(combatant, config));
        let ytText = "";

        if (combatant.isOwner && !game.user.isGM && combatant.hasPlayerOwner) {
            ytText = `${game.i18n.localize("YOUR-TURN.YourTurn")}, ${ytName}!`;
        } else if (combatant.hidden) {
            if (!game.user.isGM && !Settings.getHideNextUpHidden()) {
                // Shows a hidden character's turn at most once per round.
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
            ytText = Settings.getUsePossessive()
                ? `${ytName}'s ${localizedTurn}!`
                : `${ytName} ${localizedTurn}!`;
        }

        const nextCombatant = config.showNextUp
            ? this.getNextCombatant(combat, config)
            : null;

        if (!this.container || !this.currentImg) this.initializeUI();

        this.updateCurrentImage(currentSrc, config);
        this.updateBanner(combat, ytText, nextCombatant, config);
        this.startUnloadTimer();
    }

    // Swaps the image and restarts its entrance animation.
    static updateCurrentImage(src, config = this.config()) {
        if (!this.currentImg) return;
        this.currentImg.classList.remove("adding", "removing");
        this.currentImg.src = src;
        void this.currentImg.offsetWidth; // Forces the browser to redraw so the animation plays again.
        this.currentImg.classList.add("adding");
        if (config.imageMarginTop) {
            this.currentImg.style.marginTop = config.imageMarginTop;
        }
    }

    // Creates the banner and adds it to the page.
    static updateBanner(combat, ytText, nextCombatant, config = this.config()) {
        if (this.banner) {
            this.banner.remove();
            this.banner = null;
        }

        const bannerDiv = document.createElement("div");
        bannerDiv.id = "yourTurnBanner";
        bannerDiv.className = "yourTurnBanner";
        bannerDiv.style.height = `${Settings.getImgSize() + BANNER_PADDING_PX}px`;

        const baseTurn = this.computeCustomTurnNumber(combat);
        const turnNumber = Settings.getStartCounterAtOne()
            ? baseTurn
            : Math.max(0, baseTurn - 1);
        let subheadingHTML = `${game.i18n.localize("YOUR-TURN.Round")} #${combat.round}`;
        if (config.showTurnNumber) {
            subheadingHTML += ` ${game.i18n.localize("YOUR-TURN.Turn")} #${turnNumber}`;
        }

        const nextUpHTML = nextCombatant
            ? this.getNextTurnHtml(nextCombatant, config)
            : "";

        // The turn text is already safe; the rest comes from translation files.
        bannerDiv.innerHTML = `
            <p id="yourTurnText" class="yourTurnText">${ytText}</p>
            <div class="yourTurnSubheading">${subheadingHTML}</div>
            ${nextUpHTML}
            <div id="yourTurnBannerBackground" class="yourTurnBannerBackground"></div>
        `;

        // Uses the player's color when a player owns the turn; otherwise the GM's color.
        const root = document.documentElement;
        const player = combat.combatant?.players?.[0];
        const color =
            combat.combatant?.hasPlayerOwner && player?.active
                ? player.color
                : this._getActiveGMColor();
        root.style.setProperty("--yourTurnPlayerColor", color);
        root.style.setProperty("--yourTurnPlayerColorTransparent", withAlpha(color, "80"));

        if (config.bannerMarginTop) {
            bannerDiv.style.marginTop = config.bannerMarginTop;
        }

        this.container.appendChild(bannerDiv);
        this.banner = bannerDiv;
    }

    // Builds the "Next Up" line with a safely escaped name and image link.
    static getNextTurnHtml(nextCombatant, config = this.config()) {
        const name = esc(this.getCombatantDisplayName(nextCombatant, config));
        const useTokens = Settings.getUseTokens();
        const rawSrc =
            useTokens && nextCombatant.token?.texture?.src
                ? nextCombatant.token.texture.src
                : nextCombatant.actor?.img || "modules/your-turn/img/hidden.svg";
        const nextSrc = esc(rawSrc);

        return `
            <div class="yourTurnSubheading last">
                ${game.i18n.localize("YOUR-TURN.NextUp")}:
                <img class="yourTurnImg yourTurnSubheading" src="${nextSrc}" alt="">
                ${name}
            </div>`;
    }

    // Finds the next visible, undefeated combatant. Returns nothing if there isn't one.
    static getNextCombatant(combat, config = this.config()) {
        if (config.skipNextCombatant) return null;
        if (Settings.getHideNextUp()) return null;
        if (!combat?.turns?.length) return null;
        if (combat.turns.length <= 1) return null; // Don't show the current combatant as "next."
        if (combat.turn == null) return null;

        let j = 1;
        while (j < combat.turns.length) {
            const idx = (combat.turn + j) % combat.turns.length;
            const combatant = combat.turns[idx];
            if (!combatant.hidden && !combatant.defeated) return combatant;
            j++;
        }
        return null;
    }

    // Gets the name to display, using a system-specific name if one is set.
    static getCombatantDisplayName(combatant, config = this.config()) {
        const fn = config.getCombatantDisplayNameFn;
        return fn ? fn(combatant) : combatant.name;
    }

    // Counts how many turns have passed, ignoring defeated combatants.
    static computeCustomTurnNumber(combat) {
        if (!combat?.turns || combat.turn == null) return 0;
        let count = 0;
        for (let i = 0; i <= combat.turn; i++) {
            const c = combat.turns[i];
            if (c && !c.defeated) count++;
        }
        return count;
    }

    // Fades out and removes the banner, making sure not to remove a newer one.
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
        }, HIDE_ANIMATION_MS);
    }

    // Sets a timer to automatically hide the image and banner.
    static startUnloadTimer() {
        clearTimeout(this.myTimer);
        this.myTimer = setTimeout(() => this.unloadImage(), UNLOAD_TIMEOUT_MS);
    }

    // Fades out the image and banner.
    static unloadImage() {
        if (this.currentImg) this.currentImg.classList.add("removing");
        if (this.banner) {
            const bg = this.banner.querySelector("#yourTurnBannerBackground");
            if (bg) bg.classList.add("removing");
            this.banner.classList.add("removing");
        }
    }

    // Gets the active GM's color, or black if no GM is online.
    static _getActiveGMColor() {
        const gm = game.users.find((u) => u.isGM && u.active);
        return gm?.color ?? "#000000";
    }
}

TurnSubscriber.begin();