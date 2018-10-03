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

const Keepass = {};

Keepass._ss = null;

Keepass.settings = {};

Keepass.state = {'associated': false};

Keepass.helpers = {};

Keepass.helpers.verifyResponse = function (response, key) {
  const self = this;
  return new Promise(function (resolve, reject) {
    if (!response.Success) {
      reject();
      return;
    }

    const iv = response.Nonce;
    const value = Crypto.decryptAsString(response.Verifier, key, iv);

    if (value !== iv) {
      Keepass.state.associated = false;
      reject();
      return;
    }

    Keepass._ss.get('database.id').then(function (data) {
      if (response.Id !== data) {
        Keepass.state.associated = false;
        reject();
      }
    }).
      then(function () {
        Keepass._ss.get('database.hash').then(function (data) {
          if (response.Hash !== data) {
            Keepass.state.associated = false;
            reject();
          }
        });
      });

    resolve();

  });
};

Keepass.helpers.decryptEntry = function (entry, iv) {
  const self = this;
  return new Promise(function (resolve, reject) {
    Keepass._ss.get('database.key').then(function (key) {
      const decryptedEntry = {};
      decryptedEntry.Uuid = Crypto.decryptAsString(entry.Uuid, key, iv);
      decryptedEntry.Name = UTF8.decode(Crypto.decryptAsString(entry.Name, key, iv));
      decryptedEntry.Login = UTF8.decode(Crypto.decryptAsString(entry.Login, key, iv));
      decryptedEntry.Password = UTF8.decode(Crypto.decryptAsString(entry.Password, key, iv));

      if (entry.StringFields) {
        for (let i = 0; i < entry.StringFields.length; i++) {
          decryptedEntry.StringFields[i].Key = UTF8.decode(Crypto.decryptAsString(entry.StringFields[i].Key, key, iv));
          decryptedEntry.StringFields[i].Value = UTF8.decode(Crypto.decryptAsString(entry.StringFields[i].Value, key, iv));
        }
      }

      resolve(decryptedEntry);
    });
  });
};

Keepass.prompts = {};

class SelectCredentialsDialog extends Dialog {

  constructor(possibleCredentials) {
    super('/dialog/select_multiple_passwords.html');
    this.possibleCredentials = possibleCredentials;
    return this.open({'type': 'select_mul_pass_data', 'data': {'possibleCredentials': possibleCredentials}});
  }

  onMessage(request, sender) {
    this.close();
    if (request.type === 'select_mul_pass_user_input') {
      this.resolve(this.possibleCredentials[request.data.selected]);
    } else if (request.type === 'select_mul_pass_cancel') {
      this.reject();
    }
  }
}

/**
 * @brief Shows a prompt to the user to select one of multiple credentials.
 * @param possibleCredentials
 * @private
 */
Keepass.prompts._selectCredentials = function (possibleCredentials) {
  return new SelectCredentialsDialog(possibleCredentials);
};

Keepass.ready = function () {
  return Keepass.state.associated && Keepass._ss.ready();
};

Keepass.setSecureStorage = function (ss) {
  Keepass._ss = ss;
};

Keepass.reCheckAssociated = function () {
  return new Promise(function (resolve, reject) {
    Keepass._ss.get('database.key').then(function (key) {
      Keepass._ss.get('database.id').then(function (id) {
        const verifiers = Crypto.generateVerifier(key);

        const req = {
          'RequestType': 'test-associate',
          'Key': key,
          'Nonce': verifiers[0],
          'Verifier': verifiers[1],
          'Id': id
        };

        browser.storage.local.get('keepass-server-url').then(function (pref) {
          request(req).then(function (resp) {
            Keepass.state.associated = Boolean(resp.Success);
            resolve(resp.Success);
          });
        });
      }).
        catch(function () {
          Keepass.state.associated = false;
          resolve(false);
        });
    }).
      catch(function () {
        Keepass.state.associated = false;
        resolve(false);
      });
  });
};

Keepass.getLogins = function(url) {
  if (!this.ready()) {
    return Keepass.associate().then(() => Keepass.getLogins(url));
  }

  return new Promise(function (resolve, reject) {

    let key;
    let resp;
    const decryptedEntries = [];
    Keepass._ss.get('database.key').then(function (keyParam) {
      key = keyParam;
      return Keepass._ss.get('database.id');
    }).
      then(function (id) {
        const verifiers = Crypto.generateVerifier(key);

        const req = {
          'RequestType': 'get-logins',
          'SortSelection': true,
          'TriggerUnlock': false,
          'Nonce': verifiers[0],
          'Verifier': verifiers[1],
          'Id': id,
          'Url': Crypto.encrypt(url, key, verifiers[0]),
          'SubmitUrl': null
        };

        return request(req);
      }).
      then(function (respParam) {
        resp = respParam;
        return Keepass.helpers.verifyResponse(resp, key);
      }, function() {
        reject({'code': 'cannotConnect'});
      }).
      then(function () {
        const rIv = resp.Nonce;
        let promiseChain = Promise.resolve();
        for (let i = 0; i < resp.Entries.length; i++) {
          promiseChain = promiseChain.then(function() {
            return Keepass.helpers.decryptEntry(resp.Entries[i], rIv).then(decryptedEntry => decryptedEntries.push(decryptedEntry));
          });
        }
        return promiseChain;
      }).
      then(function () {
        resolve(decryptedEntries);
      }).
      catch(function () {
        console.log(`RetrieveCredentials for ${url} failed`);

        reject({'code': 'noLogins'});
      });
  });
};

Keepass.getLoginsAndErrorHandler = function (url) {
  return new Promise(function(resolve, reject) {
    Keepass.getLogins(url).then(function(credentials) {
      if (credentials.length === 0) {
        browser.notifications.create({
          'type': 'basic',
          'message': browser.i18n.getMessage('noPassFound'),
          'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
          'title': 'Keywi'
        });
        reject({'code': 'noPassFound'});
      } else {
        resolve(credentials);
      }
    }, function(data) {
      if (data.code === 'cannotConnect') {
        browser.notifications.create({
          'type': 'basic',
          'message': browser.i18n.getMessage('cannotConnect'),
          'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
          'title': 'Keywi'
        });
        reject();
      } else if (data.code === 'noLogins') {
        browser.notifications.create({
          'type': 'basic',
          'message': browser.i18n.getMessage('noLogins'),
          'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
          'title': 'Keywi'
        });
        reject();
      }
    });

  });
};

Keepass.getGUILogins = function(url) {
  return Keepass.getLoginsAndErrorHandler(url).then(credentials => {
    if (credentials.length === 1) {
      return credentials[0];
    }
    return Keepass.prompts._selectCredentials(credentials);

  });
};

Keepass.deassociate = function () {
  return Keepass._ss.delete('database.id').then(function () {
    return Keepass._ss.delete('database.key');
  }).
    then(function () {
      return Keepass._ss.delete('database.hash');
    }).
    then(function () {
      Keepass._encryptionkey = null;
      Keepass.state.associated = false;
    });
};

Keepass.associate = function () {

  if (!Keepass._ss.ready()) {

    /*
     * if the secure storage isn't ready yet, first re initialize it
     * before associating the keepass database
     * If it was done the other way around, then if setting up the secure storage would fail
     * the association request would still be done, but the result couldn't be saved
     */
    return Keepass._ss.reInitialize().then(Keepass.associate.bind(Keepass));
  }

  // test if we are already associated and it's working
  return this.reCheckAssociated().then(function (associated) {
    return new Promise(function (resolve, reject) {
      if (associated) {
        // callback();
        resolve();
      } else {
        const rawKey = cryptoHelpers.generateSharedKey(Crypto.keySize * 2);
        const key = btoa(cryptoHelpers.convertByteArrayToString(rawKey));
        const verifiers = Crypto.generateVerifier(key);

        const req = {
          'RequestType': 'associate',
          'Key': key,
          'Nonce': verifiers[0],
          'Verifier': verifiers[1]
        };
        request(req).then(function (resp) {
          if (resp.Success) {
            Keepass._ss.set('database.id', resp.Id).
              then(function () {
                return Keepass._ss.set('database.key', key);
              }).
              then(function () {
                return Keepass._ss.set('database.hash', resp.Hash);
              }).
              then(function () {
                Keepass.state.associated = true;
                // callback();
                resolve();
              });
          } else {
            browser.notifications.create({
              'type': 'basic',
              'message': browser.i18n.getMessage('assocFailed'),
              'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
              'title': 'Keywi'
            });
          }
        }).
          catch(function () {
            browser.notifications.create({
              'type': 'basic',
              'message': browser.i18n.getMessage('cannotConnect'),
              'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
              'title': 'Keywi'
            });
          });
      }
    });
  });
};

browser.storage.onChanged.addListener(function (changes, areaName) {
  if (changes.hasOwnProperty('keepass-server-url')) {
    Keepass.state.associated = false;
  }
  if (changes.hasOwnProperty('password-hash-rounds')) {
    Keepass._ss.reencrypt();
  }
});

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 're-encrypt_local_secure_storage') {
    Keepass._ss.reencrypt(function () {
      sendResponse();
    });
  } else if (request.type === 'reset') {
    Keepass._ss.clear().then(function () {
      return Keepass._ss.reInitialize();
    }).
      then(function () {
        Keepass.associate(function () {
          sendResponse();
        });
      }).
      catch(function () {
        sendResponse();
      });
  } else if (request.type === 'options_user_info') {
    let hash = null;
    if (Keepass._ss.ready()) {
      // if Secure Storage is unlocked
      Keepass._ss.get('database.hash').then(function (data) {
        hash = data;
        return Keepass._ss.get('database.id');
      }).
        then(function (id) {
          // if database id and hash are available we are associated with Keepass
          const response = {'table': {}, 'associated': true};
          response.table[browser.i18n.getMessage('statusSSunlocked')] = true;
          response.table[browser.i18n.getMessage('statusDBassoc')] = true;
          response.table[browser.i18n.getMessage('statusDBhash')] = hash;
          response.table[browser.i18n.getMessage('statusDBid')] = id;
          sendResponse(response);
        }).
        catch(function () {
          // database id or hash are not available we are not associated with Keepass
          const response = {'table': {}, 'associated': false};
          response.table[browser.i18n.getMessage('statusSSunlocked')] = true;
          response.table[browser.i18n.getMessage('statusDBassoc')] = false;
          sendResponse(response);
        });
    } else {
      // Secure Storage is locked so only check if hash and id are available
      Keepass._ss.has('database.hash').then(function (data) {
        hash = data;
        return Keepass._ss.has('database.id');
      }).
        then(function (id) {
          // hash and id are available
          const response = {'table': {}, 'associated': true};
          response.table[browser.i18n.getMessage('statusSSunlocked')] = false;
          response.table[browser.i18n.getMessage('statusDBassoc')] = true;
          sendResponse(response);
        }).
        catch(function () {
          // hash or id are not available
          const response = {'table': {}, 'associated': false};
          response.table[browser.i18n.getMessage('statusSSunlocked')] = false;
          response.table[browser.i18n.getMessage('statusDBassoc')] = false;
          sendResponse(response);
        });
    }
  } else if (request.type === 'associate') {
    Keepass.associate(function () {
      sendResponse();
    });
  }
  return true; // http://stackoverflow.com/a/40773823
});
