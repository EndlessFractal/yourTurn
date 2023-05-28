const modName = 'your-turn';
const settings = {
    startCounterAtOne: {
        name: 'Start Round/Turn Counter at 1',
        hint: 'Toggle to start the round/turn counter at 1 instead of 0.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    },
    useTokens: {
        name: 'Use Tokens Instead of Artwork',
        hint: 'Toggle to use tokens for Your Turn instead of full actor artwork.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    },
};

export class Settings {
    static getStartCounterAtOne() {
        return game.settings.get(modName, 'startCounterAtOne');
    }

    static getUseTokens() {
        return game.settings.get(modName, 'useTokens');
    }

    static registerSettings() {
        for (const [name, setting] of Object.entries(settings)) {
            game.settings.register(modName, name, setting);
        }
    }
}