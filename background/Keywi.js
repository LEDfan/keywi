/**
 * @copyright (C) 2017-2018 Tobia De Koninck
 * @copyright (C) 2017-2018 Robin Jadoul
 *
 * This file is part of Keywi.
 * Keywi is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Keywi is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Keywi.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * This file holds the main API to the Keepass Database
 */

class Keywi_ {

  constructor() {
    this._ss = null;
    this._backend = null;
  }

  ready() {
    // TODO check if backend is ready
    if (this._ss === null) {
      return false;
    }
    return this._ss.ready();
  }

  setSecureStorage(ss) {
    this._ss = ss;
    console.log("SS setup!");
  }

  setBackend(backend) {
    console.log("Backend setup");
    this._backend = backend;
  }

  async getLogins(url) {
    await this._ss._unlockStorage();
    return this._backend.getLogins(url);
  }

  async getLoginsAndErrorHandler(url) {
    const credentials = await this.getLogins(url);
    if (credentials.code === 'noLogins') {
      browser.notifications.create({
        'type': 'basic',
        'message': browser.i18n.getMessage('noPassFound'),
        'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
        'title': 'Keywi'
      });
      return false;
    } else if (credentials.code !== 'ok') {
      browser.notifications.create({
        'type': 'basic',
        'message': browser.i18n.getMessage('cannotConnect'),
        'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
        'title': 'Keywi'
      });
      return false;
    } 
    return credentials.credentials;
    
  }

  getGUILogins(url) {
    return this.getLoginsAndErrorHandler(url).then(credentials => {
      if (!credentials) return false;
      if (credentials.length === 1) {
        return credentials[0];
      }
      return new SelectCredentialsDialog(credentials);
    });
  }
}

window.Keywi = new Keywi_();

browser.storage.onChanged.addListener(function(changes, areaName) {
  if (changes.hasOwnProperty('keepass-server-url')) {
    Keywi._backend.reAssociate();
  }
  if (changes.hasOwnProperty('password-hash-rounds')) {
    Keywi._ss.reencrypt();
  }
});

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 're-encrypt_local_secure_storage') {
      Keywi._ss.reencrypt()
        .then(() => sendResponse());
    } else if (request.type === 'reset') {
      Keywi._ss.clear()
        .then(() => init())
        .then(() => sendResponse())
        .catch(() => sendResponse())
    } else if (request.type === 'options_user_info') {
      if (Keywi.ready()) {
        (async function() {
          let associated = !!await Keywi._backend._testAssociation();
          if (!associated) {
            const response = {'table': {}, 'associated': false, 'ssUnlocked': true};
            response.table[browser.i18n.getMessage('statusSSunlocked')] = true;
            response.table[browser.i18n.getMessage('statusDBassoc')] = false;
            sendResponse(response);
            return;
          }

          let hash = await Keywi._backend._getDatabaseHash();
          const response = {'table': {}, 'associated': true, 'ssUnlocked': true};
          response.table[browser.i18n.getMessage('statusSSunlocked')] = true;
          response.table[browser.i18n.getMessage('statusDBassoc')] = true;
          response.table[browser.i18n.getMessage('statusDBhash')] = hash;
          sendResponse(response);
        })();
      } else {
        const response = {'table': {}, 'associated': false, 'ssUnlocked': false};
        response.table[browser.i18n.getMessage('statusSSunlocked')] = false;
        sendResponse(response);
      }
    } else if (request.type === 'associate') {
      init()
        .then(() => sendResponse())
        .catch(() => sendResponse())
    }
    return true; // http://stackoverflow.com/a/40773823
  }
);
