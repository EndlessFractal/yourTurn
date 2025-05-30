const modName = 'your-turn';
const settings = {
    startCounterAtOne: {
        name: 'Start Turn Counter at 1',
        hint: 'Toggle to start the turn counter at 1 instead of 0. Default is True.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    },
    useTokens: {
        name: 'Use Tokens Instead of Artwork',
        hint: 'Toggle to use tokens instead of full actor artwork. Default is False',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    },
    hideNextUpHidden: {
        name: 'Hide Banner for Hidden Combatants',
        hint: 'Toogle to hide all turn details for hidden combatants. When disabled, shows a generic \'Something happens\' message once per round for hidden combatants. Default is True.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    },
    hideNextUp: {
        name: 'Hide "Next Up"',
        hint: 'Toggle to hide the "Next Up" combatant information. Default is False.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    },
};
export class Settings {
    static getStartCounterAtOne() {
        return game.settings.get(modName, 'startCounterAtOne');
    }
    static getUseTokens() {
        return game.settings.get(modName, 'useTokens');
    }
    static getHideNextUpHidden() {
        return game.settings.get(modName, 'hideNextUpHidden');
    }
    static getHideNextUp() {
        return game.settings.get(modName, 'hideNextUp');
    }
    static registerSettings() {
        for (const [name, setting] of Object.entries(settings)) {
            game.settings.register(modName, name, setting);
        }
    }
}