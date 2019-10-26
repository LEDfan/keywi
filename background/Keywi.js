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
  }

  setBackend(backend) {
    console.log("Backend setup");
    this._backend = backend;
  }

  getLogins(url) {
    return this._backend.getLogins(url);
  }

  async getLoginsAndErrorHandler(url) {
    let credentials = await this.getLogins(url);
    console.log(credentials);
    if (credentials.code === "noLogins") {
      browser.notifications.create({
        'type': 'basic',
        'message': browser.i18n.getMessage('noPassFound'),
        'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
        'title': 'Keywi'
      });
      return false;
    } else if (credentials.code !== "ok") {
      browser.notifications.create({
        'type': 'basic',
        'message': browser.i18n.getMessage('cannotConnect'),
        'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
        'title': 'Keywi'
      });
      return false;
    } else {
      return credentials.credentials;
    }
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
    // Keywi.state.associated = false;
    // TODO
  }
  if (changes.hasOwnProperty('password-hash-rounds')) {
    // Keepass._ss.reencrypt();
    // TODO
  }
});
//
// browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//   if (request.type === 're-encrypt_local_secure_storage') {
//     // TODO
//     // Keepass._ss.reencrypt(function() {
//     //   sendResponse();
//     // });
//   } else if (request.type === 'reset') {
//     // TODO
//     // Keepass._ss.clear().then(function() {
//     //   return Keepass._ss.reInitialize();
//     // }).then(function() {
//     //   Keepass.associate(function() {
//     //     sendResponse();
//     //   });
//     // }).catch(function() {
//     //   sendResponse();
//     // });
//   } else if (request.type === 'options_user_info') {
//     let hash = null;
//     if (Keywi.ready()) {
//       // if Secure Storage is unlocked
//       Keywi._ss.get('database.hash').then(function(data) {
//         hash = data;
//         return Keywi._ss.get('database.id');
//       }).then(function(id) {
//         // if database id and hash are available we are associated with Keepass
//         const response = {'table': {}, 'associated': true};
//         response.table[browser.i18n.getMessage('statusSSunlocked')] = true;
//         response.table[browser.i18n.getMessage('statusDBassoc')] = true;
//         response.table[browser.i18n.getMessage('statusDBhash')] = hash;
//         response.table[browser.i18n.getMessage('statusDBid')] = id;
//         sendResponse(response);
//       }).catch(function() {
//         // database id or hash are not available we are not associated with Keepass
//         const response = {'table': {}, 'associated': false};
//         response.table[browser.i18n.getMessage('statusSSunlocked')] = true;
//         response.table[browser.i18n.getMessage('statusDBassoc')] = false;
//         sendResponse(response);
//       });
//     } else if (Keywi._ss !== null) {
//       // Secure Storage is locked so only check if hash and id are available
//       Keywi._ss.has('database.hash').then(function(data) {
//         hash = data;
//         return Keywi._ss.has('database.id');
//       }).then(function(id) {
//         // hash and id are available
//         const response = {'table': {}, 'associated': true};
//         response.table[browser.i18n.getMessage('statusSSunlocked')] = false;
//         response.table[browser.i18n.getMessage('statusDBassoc')] = true;
//         sendResponse(response);
//       }).catch(function() {
//         // hash or id are not available
//         const response = {'table': {}, 'associated': false};
//         response.table[browser.i18n.getMessage('statusSSunlocked')] = false;
//         response.table[browser.i18n.getMessage('statusDBassoc')] = false;
//         sendResponse(response);
//       });
//     }
//   } else if (request.type === 'associate') {
//     Keywi._backend.init().then(() => {
//       // TODO test
//       sendResponse();
//     });
//   }
//   return true; // http://stackoverflow.com/a/40773823
// });
