## This is a modification of the original DX3RD system for FoundryVTT, including additional features (Effect uses & related mechanics), bugfixes, & more. Stability & compatibility with the original system is not guaranteed. 
Planned features:
- Better support for abilities that deal one-time damage/healing
- A full compendium of all abilities as listed in the original DX3RD and Infinity Code source books, fully automated when possible.

Implemented features:
- Syndrome checking functionality for abilities whose bonuses only apply to abilities of the same Syndrome (such as Balor's Dark Matter.)
- Misc. bugfixes
- Ability to add/subtract actor's HP at the end of turns (incl. dice values) - this is a provisional implementation, and will be revised upon the implementation of one-time damage/healing
- Dice support for attribute formulas. 
- DisableTiming: Turn, disables ability at the end of an actor's turn.
- Abilities now have the option to be given a set amount of uses, which auto-decrement upon their use (singular or in a combo). If an ability's uses drop to 0, that ability is disabled & cannot be used/will be not calculated into combos. An ability's uses can be refreshed by hitting the "refresh" button on the ability's page. There is also an additional field for inputting the formula the number of uses is based upon (such as 1/Scenario, LV/Round, etc.)
- Disabled abilities are visually indicated as such by having a darker background when listed. 
- Added "move" as a modifiable ability attribute 
- Implemented minimum-floor capping for several stats in order to prevent some edge cases with regards to certain statuses & ability effects. 
    - These two in conjunction mean that it is now possible to have a fully functioning Rigor bad status to a given target, 

# FVTT-DX3rd-System
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/ltaeng)

This is a Foundry VTT System of DX3rd Tabletop RPG.

Installation Instructions
-------------
To install the DX3rd system for Foundry Virtual Tabletop, simply paste the following URL into the Install System
dialog on the Setup menu of the application.

https://raw.githubusercontent.com/ksx0330/FVTT-DX3rd-System/main/system.json

Supported Langages
-------------
한국어(Korean), 日本語(Japanese)

Features
-------------
* Automatically calculates the character's ability value.
* By pressing Ctrl and clicking on the Skill, you can add additional values when rolling the dice.
* You can refer to the level of Effect by entering @level in the Attributes of Effect. ex) Concentrate -> -@level
* You can create a Rois by dragging another actor.

Image
-------------
![image](https://user-images.githubusercontent.com/15700174/174197688-ac4c54e5-eda1-4b60-baeb-c82122467fa1.png)

Legal
------------
本作は、「F.E.A.R」が権利を有する『ダブルクロス』の二次創作物です。
（C）F.E.A.R
