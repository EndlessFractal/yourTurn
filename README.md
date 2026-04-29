# Your Turn! - FoundryVTT Module

![Module Demo](https://i.imgur.com/IGbA0jO.gif)

Enhance your Foundry VTT sessions with smooth, animated turn notifications. This module displays a customizable banner and character portrait whenever the combat turn changes, keeping everyone focused on the action.

## Features

- **Clear Visual Turn Indicator**
  - An animated banner and character image appear when a new turn begins, then fade out automatically.

- **Customization Options**
  - Start turn counter at 1 or 0
  - Use token artwork instead of actor portraits
  - Hide the "Next Up" combatant information
  - Adjust the size of the displayed image (280–400 px)

- **Hidden Enemies Handling**
  - Option to hide the banner entirely for hidden combatants
  - Alternative: display a generic "Something happens…" message (once per round) with a mystery icon – only visible to players

- **Improved Performance & Compatibility**
  - Reuses elements instead of creating new ones each turn
  - Compatibility with the **Carousel Combat Tracker** module
  - Cleanup when combat ends

- **Multilingual Support**
  English, German, French, and Simplified Chinese.

## Installation

1. In Foundry VTT, go to **Add-on Modules**
2. Click **Install Module**
3. Paste this manifest URL:
   > `https://github.com/EndlessFractal/yourTurn/releases/download/latest/module.json`
4. Click **Install**
5. Activate the module in your world's module settings

## Configuration

After activation, you can adjust settings under **Game Settings → Module Settings → Your Turn!**.

| Setting | Description |
|---------|-------------|
| Start Turn Counter at 1 | When enabled, the displayed turn number begins at 1 instead of 0. |
| Use Tokens Instead of Artwork | Show token images instead of the actor's default portrait. |
| Hide Banner for Hidden Combatants | Completely hides the banner for hidden enemies. |
| Hide "Next Up" | Remove the line that shows who acts next. |
| Use Possessive "s" | Toggle to include the apostrophe-s (e.g., "Name\'s Turn") or use a space (e.g., "Name Turn"). Disable for languages that do not use the possessive form. |
| Turn Banner Image Size (px) | Width and height of the character image (280–400 px). **Reload the page (F5) after changing.** |

## Usage

- Works automatically with any combat encounter that uses Foundry's built-in combat tracker.
- When a combatant is hidden and the setting *Hide Banner for Hidden Combatants* is **off**, players see a generic "Something happens…" message with a hidden icon, once per round.
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
