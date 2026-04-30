# Your Turn! - FoundryVTT Module

![Module Demo](https://i.imgur.com/IGbA0jO.gif)

Enhance your Foundry VTT sessions with smooth, animated turn notifications. This module displays a customizable banner and character portrait whenever the combat turn changes, keeping everyone focused on the action.

## Features

- **Clear Visual Turn Indicator**
  - An animated banner and character image appear when a new turn begins, then fade out automatically after 4 seconds.

- **Customization Options**
  - Start turn counter at 1 or 0 (the counter skips defeated combatants).
  - Toggle to use either token artwork or actor portraits.
  - Hide the "Next Up" combatant information entirely.
  - Control how hidden enemies are displayed (see below).
  - Toggle possessive "'s" for languages that do not use the possessive form.
  - Adjust the size of the displayed character image (280-400 px).

- **Hidden Enemies Handling**
  - You can configure the banner to either:
    - **Hide it entirely** for hidden combatants (default).
    - Once per round, when the first hidden combatant's turn begins, show a *"Something happens..."* message with a mystery icon (visible **only to players**).

- **Performance & Compatibility**
  - Compatibility with **Exalted Essence**'s "popcorn initiative".
  - Compatibility with **PF2e**'s name hiding (token name privacy).
  - Compatibility with the **Carousel Combat Tracker** module.
  - Reuses the main container and image elements instead of recreating them each turn; the banner is efficiently refreshed only when needed.
  - Automatically cleans up when combat ends or is deleted.

- **Multilingual Support**
  - English, German, French, and Simplified Chinese.

## Installation

1. In Foundry VTT, go to **Add-on Modules**
2. Click **Install Module**
3. Paste this manifest URL:
   > `https://github.com/EndlessFractal/yourTurn/releases/download/latest/module.json`
4. Click **Install**
5. Activate the module in your world's module settings

## Configuration

After activation, adjust settings under **Game Settings → Module Settings → Your Turn!**.

| Setting | Description |
|---------|-------------|
| Start Turn Counter at 1 | When enabled, the displayed turn number begins at 1 instead of 0. Only **non-defeated** combatants are counted, so defeated creatures are skipped. |
| Use Tokens Instead of Artwork | Show token images instead of the actor's default portrait. |
| Hide Banner for Hidden Combatants | Completely hides the banner for hidden enemies. When disabled, players see a *"Something happens..."* message once per round (GMs still see nothing). |
| Hide "Next Up" | Remove the line that shows who acts next. |
| Use Possessive "s" | Toggle to include the apostrophe-s (e.g., "Name's Turn") or use a space (e.g., "Name Turn"). Disable for languages that do not use the possessive form. |
| Turn Banner Image Size (px) | Width and height of the character image (280-400 px). **Reload the page (F5) after changing.** |

## Usage

- Works automatically with any combat encounter that uses Foundry's built-in combat tracker.
- When a combatant is hidden and the setting **Hide Banner for Hidden Combatants** is **off**, players see a generic *"Something happens..."* message with a hidden icon, once per round. GMs see no banner at all for hidden combatants.
- The banner and image fade out after 4 seconds.

## Support & Contribution

### Reporting Issues
Please report bugs or feature requests via [GitHub Issues](https://github.com/EndlessFractal/yourTurn/issues).
When reporting, include:
- Foundry version and game system
- Any error messages from the console (F12)
- Steps to reproduce the issue

### Contributing
Contributions are welcome! Feel free to:
- Submit pull requests
- Help with localization
- Test and report compatibility with other modules

## Credits

- **Original author:** [Autmor](https://github.com/Autmor)
- **Current maintainer:** [EndlessFractal](https://github.com/EndlessFractal)
- **Hidden actor icon:** [Game-Icons.net](https://game-icons.net/1x1/lorc/hidden.html)
