![Logo](icons/keywi-256.png)

Keywi
===

Minimalistic Keepass plugin using Web Extensions and KeepassHTTP.

## Goals
 - Minimalistic password integration in Firefox
 - Fill username and password in login form, using context menu and keyboard shortcut
 - Use [Keepass HTTP](https://github.com/pfn/keepasshttp)
 - No editing of the Keepass database
 - Using the Firefox web extensions API, to support Electrolysis
 - Support Keepass, later maybe [Pass](https://www.passwordstore.org/)
 - Minimal amount of libraries (aes, cryptoheplers and reqwest)
 - no automatic form filling, i.e. only when the user wants to. This is very important, because sometimes the credentials are filled in the wrong site (e.g. a DNS spoofing) or it's filled in the register for, sometimes you just don't want to log in etc
 - no injecting of buttons or icons into forms

## Alternatives
### [Passifox](https://github.com/pfn/passifox)
 - some forms can't be filled (e.g. openmediavault has some problems with it)
 - doesn't uses web extensions, thus not compatible with Electrolysis
 - automatic form filling

 
### [Keefox](http://keefox.org/)
 - doesn't uses web extensions, thus not compatible with Electrolysis
 - very feature rich, almost a password manager on it's own
 - automatic form filling
 
 
## Authors
 - @LEDfan Tobia De Koninck
 - @RobinJadoul Robin Jadoul
 
## License
Keywi is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Keywi is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Keywi.  If not, see <http://www.gnu.org/licenses/>.
 
 
## Used libraries
This project uses the following libraries which are all found under the `vendor` directory:
 - `aes.js` from slowAES https://code.google.com/archive/p/slowaes licensed under Apache License 2.0
 - `cryptoHelpers.js` from slowAES https://code.google.com/archive/p/slowaes licensed under Apache License 2.0
 - `debounce.js` part of Underscoe.js http://underscorejs.org/ licensed under the MIT license
 - `reqwest.min.js` from reqwest https://github.com/ded/reqwest licensed under the MIT license
 - `utf8.js` part of the passifox project https://github.com/pfn/passifox/blob/master/chromeipass/background/utf8.js licensed under GPL v3
 - Please note that some functions of the `background/keepass.js` file are based on functions of the passifox project https://github.com/pfn/passifox licensed under the GPL v3
