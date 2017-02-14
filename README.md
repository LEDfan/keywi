![Logo](icons/keywi-256.png)

Keywi
===

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
 
 
 
