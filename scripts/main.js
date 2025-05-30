// Importing the Settings module from "./settings.js"
import { Settings } from "./settings.js";
// Hook that runs once when the Foundry VTT initializes
Hooks.once('init', () => {
    // Registering the settings
    Settings.registerSettings();
});
// Exporting the TurnSubscriber class as the default export of the module
export default class TurnSubscriber {
    // Static properties of the TurnSubscriber class
    static gmColor;
    static myTimer;
    static lastCombatant;
    static imgCount = 1;
    static currentImgID = null;
    static nextImgID;
    static expectedNext;
    static lastHiddenCombatId = null;
    static lastHiddenRound = null;
    // Static method that starts the turn tracking
    static begin() {
        Hooks.on("ready", () => {
            // Wait for the GM to be available
            this.waitForGM().then((gm) => {
                // Store the GM color
                this.gmColor = gm.color;
                // Hook that triggers when the combat is updated
                Hooks.on("updateCombat", (combat, update, options, userId) => {
                    this._onUpdateCombat(combat, update, options, userId);
                });
            });
        });
    }
    // Static method that waits for the GM to be available
    static async waitForGM() {
        const gm = game.users.find((u) => u.isGM && u.active);
        if (gm) {
            return gm;
        } else {
            // Wait until the GM becomes active
            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    const gm = game.users.find((u) => u.isGM && u.active);
                    if (gm) {
                        clearInterval(interval);
                        resolve(gm);
                    }
                }, 1000);
            });
        }
    }
    // Static method that handles the updateCombat hook
    static _onUpdateCombat(combat, update, options, userId) {
        // Reset hidden tracking if new combat started
        if (this.lastHiddenCombatId !== combat.id) {
            this.lastHiddenCombatId = combat.id;
            this.lastHiddenRound = null;
        }
        // Check if the turn or round has changed
        if (!update["turn"] && !update["round"]) return;
        // Check if the combat has started
        if (!combat.started) return;
        // Check if the current combatant has already been processed
        if (combat.combatant === this.lastCombatant) return;
        // Update the lastCombatant property to the current combatant
        this.lastCombatant = combat.combatant;
        // Store “next” for later comparison
        this.expectedNext = combat.nextCombatant;
        // Get the image of the current combatant (token if desired, else actor)
        this.image = Settings.getUseTokens() ? (combat.combatant.token?.texture?.src ?? combat.combatant.actor.img) : combat.combatant.actor.img;
        // Get the name of the current combatant
        let ytName = combat.combatant.name;
        // Initialize the ytText and ytImgClass variables
        let ytText = "";
        const ytImgClass = ["adding"];
        // Check if the Combat Utility Belt module is active
        if (game.modules.get("combat-utility-belt")?.active) {
            // Check if the combatant's name should be replaced
            if (game.cub.hideNames.shouldReplaceName(combat.combatant.actor)) {
                ytName = game.cub.hideNames.getReplacementName(combat.combatant.actor);
            }
        }
        // Check if the combatant is defeated
        if (combat.combatant.defeated) {
            // Hide the banner for defeated enemies
            this.hideBanner();
            return;
        }
        // Determine the text to be displayed based on the current combatant
        if (combat.combatant) {
            if (combat.combatant.isOwner && !game.user.isGM && combat.combatant.players[0]?.active) {
                ytText = `${game.i18n.localize("YOUR-TURN.YourTurn")}, ${ytName}!`;
            } else if (combat.combatant.hidden) {
                if (!game.user.isGM && !Settings.getHideNextUpHidden()) {
                    // Only show if not shown in this round yet
                    if (this.lastHiddenRound !== combat.round) {
                        ytText = game.i18n.localize("YOUR-TURN.SomethingHappens");
                        this.showHidden();
                        this.lastHiddenRound = combat.round; // Update tracking
                    } else {
                        this.hideBanner();
                        return;
                    }
                } else {
                    this.hideBanner();
                    return;
                }
            } else {
                ytText = `${ytName}'s ${game.i18n.localize("YOUR-TURN.Turn")}!`;
            }
        }
        // Get the next combatant
        const nextCombatant = this.getNextCombatant(combat);
        const expectedNext = this.expectedNext;
        // Get or create the container element for the turn display
        let container = document.getElementById("yourTurnContainer");
        if (!container) {
            const containerDiv = document.createElement("div");
            const uiTOP = document.getElementById("ui-top");
            containerDiv.id = "yourTurnContainer";
            uiTOP.appendChild(containerDiv);
        }
        // Check and delete the current and next turn images
        this.checkAndDelete(this.currentImgID);
        this.checkAndDelete("yourTurnBanner");
        const nextImg = document.getElementById(this.nextImgID);
        if (nextImg) {
            if (combat.combatant !== expectedNext) {
                nextImg.remove();
                this.currentImgID = null;
            } else {
                this.currentImgID = this.nextImgID;
            }
        }
        // Increment the image count and generate the ID for the next image
        this.imgCount += 1;
        this.nextImgID = `yourTurnImg${this.imgCount}`;
        // Check if tokens should be used for the next combatant
        let imageHTML;
        if (Settings.getUseTokens() && nextCombatant?.token) {
            imageHTML = nextCombatant.token.texture?.src || nextCombatant.actor.img;
        } else {
            imageHTML = nextCombatant?.actor?.img;
        }
        // Create the HTML element for the next image
        const imgHTML = document.createElement("img");
        imgHTML.id = this.nextImgID;
        imgHTML.className = "yourTurnImg";
        imgHTML.src = imageHTML;
        if (this.currentImgID === null) {
            // If there is no current image, create it
            this.currentImgID = `yourTurnImg${this.imgCount - 1}`;
            const currentImgHTML = document.createElement("img");
            currentImgHTML.id = this.currentImgID;
            currentImgHTML.className = "yourTurnImg";
            currentImgHTML.src = this.image;
            container.append(currentImgHTML);
        }
        // Create the banner HTML element
        const bannerDiv = document.createElement("div");
        const baseTurnNumber = this.computeCustomTurnNumber(combat);
        const turnNumber = Settings.getStartCounterAtOne() ? baseTurnNumber : baseTurnNumber - 1;
        bannerDiv.id = "yourTurnBanner";
        bannerDiv.className = "yourTurnBanner";
        bannerDiv.style.height = "150px";
        bannerDiv.innerHTML = `
            <p id="yourTurnText" class="yourTurnText">${ytText}</p>
            <div class="yourTurnSubheading">
            ${game.i18n.localize("YOUR-TURN.Round")} #${combat.round}
            ${game.i18n.localize("YOUR-TURN.Turn")} #${turnNumber}
            </div>
            ${this.getNextTurnHtml(nextCombatant)}
            <div id="yourTurnBannerBackground" class="yourTurnBannerBackground" height="150"></div>
        `;
        // Set the CSS variables for player and GM colors
        const r = document.querySelector(":root");
        if (combat.combatant.hasPlayerOwner && combat.combatant.players[0].active) {
            const ytPlayerColor = combat.combatant.players[0].color;
            r.style.setProperty("--yourTurnPlayerColor", ytPlayerColor);
            r.style.setProperty("--yourTurnPlayerColorTransparent", ytPlayerColor + "80");
        } else {
            r.style.setProperty("--yourTurnPlayerColor", this.gmColor);
            r.style.setProperty("--yourTurnPlayerColorTransparent", this.gmColor + "80");
        }
        // Add classes to the current image HTML element
        const currentImgHTML = document.getElementById(this.currentImgID);
        ytImgClass.forEach((className) => {
            currentImgHTML.classList.add(className);
        });
        // Append the image and banner elements to the container
        container.append(imgHTML);
        container.append(bannerDiv);
        // Clear the timer and start a new one to unload the image
        clearInterval(this.myTimer);
        this.myTimer = setInterval(() => {
            this.unloadImage();
        }, 4000);
    }
    // Calculate custom turn number treating hidden creatures as one turn
    static computeCustomTurnNumber(combat) {
        if (!combat || !combat.turns || combat.turn === null) {
            return 0;
        }
        let visibleTurns = 0;
        let hasHidden = false;
        for (let i = 0; i <= combat.turn; i++) {
            const combatant = combat.turns[i];
            // Skip defeated combatants
            if (combatant.defeated) {
                continue;
            }
            if (combatant.hidden) {
                hasHidden = true;
            } else {
                visibleTurns++;
            }
        }
        return visibleTurns + (hasHidden ? 1 : 0);
    }
    static showHidden() {
        const container = document.getElementById("yourTurnContainer");
        // Check if the container exists
        if (!container) {
            return;
        }
        // Check and delete the current image
        this.checkAndDelete(this.currentImgID);
        const imgHTML = document.createElement("img");
        imgHTML.id = this.nextImgID;
        imgHTML.src = "modules/your-turn/img/hidden.svg";
        imgHTML.className = "yourTurnImg";
        container.append(imgHTML);
    }
    static hideBanner() {
        const bannerDiv = document.getElementById("yourTurnBanner");
        if (bannerDiv) {
            bannerDiv.innerHTML = '';
        }
    }
    // Static method that unloads the current image
    static unloadImage() {
        clearInterval(this.myTimer);
        if (!this.currentImgID) {
            return;
        }
        const addRemovingClass = (elementId) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.add("removing");
            }
        };
        addRemovingClass("yourTurnBannerBackground");
        addRemovingClass("yourTurnBanner");
        addRemovingClass(this.currentImgID);
    }
    // Static method that retrieves the next combatant
    static getNextCombatant(combat) {
        if (!combat || !combat.turns) return null;
        let j = 1;
        let combatant = combat.turns[(combat.turn + j) % combat.turns.length];
        while ((combatant.hidden || combatant.defeated) && j < combat.turns.length) {
            j++;
            combatant = combat.turns[(combat.turn + j) % combat.turns.length];
        }
        return combatant;
    }
    // Static method that generates the HTML for the next turn
    static getNextTurnHtml(combatant) {
        const hideNextUp = Settings.getHideNextUp();
        if (!hideNextUp) {
            let name = combatant.name;
            let imgClass = "yourTurnImg yourTurnSubheading";
            if (game.modules.get("combat-utility-belt")?.active) {
                if (game.cub.hideNames.shouldReplaceName(combatant?.actor)) {
                    name = game.cub.hideNames.getReplacementName(combatant?.actor);
                    this.showHidden();
                }
            }
            const rv = `<div class="yourTurnSubheading last">${game.i18n.localize("YOUR-TURN.NextUp")}:  <img class="${imgClass}" src="${combatant.actor.img}"></img>${name}</div>`;
            return rv;
        } else {
            return "";
        }
    }
    // Static method that checks and deletes an element by ID
    static checkAndDelete(elementID) {
        const prevImg = document.getElementById(elementID);
        if (prevImg !== null) {
            prevImg.remove();
        }
    }
}
// Call the begin() method of TurnSubscriber to start the turn tracking
TurnSubscriber.begin();
