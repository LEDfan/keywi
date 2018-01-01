# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.2.0] [01/01/2018]
### Fixed
 - Fix websites using old version of jQuery validation plugin [#101](https://github.com/LEDfan/keywi/issues/101) & [#102](https://github.com/LEDfan/keywi/pull/102)

## [1.2.0rc1] [11/12/2017]
### Fixed
 - Enable context menu hack on `login.microsoftonline.com` [#96](https://github.com/LEDfan/keywi/issues/96) & [#99](https://github.com/LEDfan/keywi/pull/99)
 - Fix bug with contextmenu not working after that filling credentials failed [#100](https://github.com/LEDfan/keywi/pull/100)


### Changed
 - Popup windows are now opened in incognito mode to remove them from Firefox history and recently closed [#92](https://github.com/LEDfan/keywi/pull/92)
 - Use <kb>Ctlr</kb> instead of <kb>Command</kb> on Mac to prevent shortcut collisions [#93](https://github.com/LEDfan/keywi/issues/93) & [#94](https://github.com/LEDfan/keywi/pull/94)
 - Move site-specific hacks to a dedicated file [#98](https://github.com/LEDfan/keywi/pull/98)


## [1.1.0] [09/11/2017]
### Fixed
 - Use other solution for [#80](https://github.com/LEDfan/keywi/issues/80) implemented in [#85](https://github.com/LEDfan/keywi/issues/85)
 - Workaround for empty window in >= FF 57 [#86](https://github.com/LEDfan/keywi/pull/86)

## [1.1.0rc1] [04/10/2017]
### Fixed
 - Fix missing context menu with bad placeholders (e.g. MicroSoft's implementation) [#80](https://github.com/LEDfan/keywi/issues/80) & [#81](https://github.com/LEDfan/keywi/issues/81)
 - Fix missing context menu with dynamically generated html [#78](https://github.com/LEDfan/keywi/issues/78) & [79](https://github.com/LEDfan/keywi/issues/79)

## [1.0.0] [19/09/2017]
### Added
 - Button to options page to associate when not already associated [#77](https://github.com/LEDfan/keywi/pull/77)
### Changed
 - Replace usage of `innerHTML` by `innerText` [#73](https://github.com/LEDfan/keywi/pull/73)

### Fixed
 - Send input event after filling a input field to fix filling passwords in SPA frameworks [#75](https://github.com/LEDfan/keywi/pull/75)
 - Regression which prevents the SecureStorage to be unlocked when filling in credentials when it was previous canceled [#76](https://github.com/LEDfan/keywi/pull/76)
 - Fix inaccurate data in options page [#77](https://github.com/LEDfan/keywi/pull/77)


## [1.0.0-rc1] [05/09/2017]
### Added
 - Support internationalization [#62](https://github.com/LEDfan/keywi/pull/62)
 - Helper script to synchronise translations [#72](https://github.com/LEDfan/keywi/pull/72)
 - Chinese internationalization [#71](https://github.com/LEDfan/keywi/pull/71)
 - Dutch internationalization [#62](https://github.com/LEDfan/keywi/pull/62)
### Changed
 - Improve code style and remove debug messages [#70](https://github.com/LEDfan/keywi/pull/70)
 - Replace reqwest library by native browser api [#69](https://github.com/LEDfan/keywi/pull/69)
### Fixed
 - Let the footer of dialogs fill up all remaining space [#68](https://github.com/LEDfan/keywi/pull/68)

## [0.1.0-beta4] [18/05/2017]
### Changed
 - Replaced `reqwest.min.js` by `reqwest.js` for easier AMO reviews.

## [0.1.0-beta3] [03/03/2017]
### Added
 - Option to not unlock secure storage at startup

## [0.1.0-beta2] [17/02/2017]
### Added
 - Rebranded to "Keywi"
 - Include license
 - Add more info to README.me

### Fixed
 - Fix password and username fill in (https://github.com/LEDfan/keywi/commit/09be81ceefede23f2b8d57d5725a278a3c39c891)

