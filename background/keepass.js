/**
 * @copyright Tobia De Koninck
 * @copyright Robin Jadoul
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

Keepass.prompts._selectCredentials = function (possibleCredentials) {
  return new Promise(function (resolve, reject) {
    const url = browser.extension.getURL('dialog/select_multiple_passwords.html');
    browser.windows.create({
      // tabId: tab.id,
      'type': 'panel',
      'width': 400,
      'height': 600,
      'incognito': false,
      'url': url
    }).then(function (newWindow) {
      const openedWindowId = newWindow.id;
      const onRemoved = function (removedWindowId) {
        if (openedWindowId === removedWindowId) {
          reject();
        }
      };

      browser.tabs.query({'windowId': openedWindowId}).then(function (tabs) {
        const openedTabId = tabs[0].id;

        browser.tabs.onUpdated.addListener(function _updateFunc (tabId, changeInfo, tabInfo) {
          if (tabId === openedTabId) {
            if (tabInfo.status === 'complete') {
              setTimeout(function () {
                browser.tabs.sendMessage(openedTabId, {
                  'type': 'select_mul_pass_data',
                  'data': {'possibleCredentials': possibleCredentials}
                });
                browser.tabs.onUpdated.removeListener(_updateFunc);
              }, 300);
            }
          }
        });
        browser.runtime.onMessage.addListener(function _func (request, sender, sendResponse) {
          if (request.type === 'select_mul_pass_user_input') {
            const selCred = possibleCredentials[request.data.selected];
            browser.runtime.onMessage.removeListener(_func);
            browser.windows.onRemoved.removeListener(onRemoved);
            browser.windows.remove(newWindow.id);
            resolve(selCred);
          } else if (request.type === 'select_mul_pass_cancel') {
            browser.runtime.onMessage.removeListener(_func);
            browser.windows.onRemoved.removeListener(onRemoved);
            browser.windows.remove(newWindow.id);
            onRemoved(openedWindowId);
            reject();
          }
        });
        browser.windows.onRemoved.addListener(onRemoved);
      });
    });
  });
};

Keepass.ready = function () {
  return Keepass.state.associated && Keepass._ss.ready();
};

Keepass.setSecureStorage = function (ss) {
  Keepass._ss = ss;
};

// Keepass.isAssociated = function() {
//     return Keepass.state.associated;
// };

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
          reqwest({
            'url': pref['keepass-server-url'] || 'http://localhost:19455',
            'type': 'json',
            'method': 'post',
            'data': JSON.stringify(req),
            'contentType': 'application/json',
            'error': function () {
              // TODO resolve(false)
            },
            'success': function (resp) {
              if (resp.Success) {
                Keepass.state.associated = true;
              } else {
                Keepass.state.associated = false;
              }
              resolve(resp.Success);
            }
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

Keepass.getLogins = function (url, callback) {
  if (!this.ready()) {
    Keepass.associate(function () {
      Keepass.getLogins(url, callback);
    });
    return;
  }

  const self = this;

  Keepass._ss.get('database.key').then(function (key) {
    Keepass._ss.get('database.id').then(function (id) {
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

      browser.storage.local.get('keepass-server-url').then(function (pref) {
        reqwest({
          'url': pref['keepass-server-url'] || 'http://localhost:19455',
          'type': 'json',
          'method': 'post',
          'data': JSON.stringify(req),
          'contentType': 'application/json',
          'error': function () {
            browser.notifications.create({
              'type': 'basic',
              'message': browser.i18n.getMessage("cannotConnect"),
              'iconUrl': browser.extension.getURL('icons/keepass-96.png'),
              'title': 'Keywi'
            });
          },
          'success': function (resp) {
            Keepass.helpers.verifyResponse(resp, key).then(function () {
              const rIv = resp.Nonce;
              const decryptedEntries = [];
              let promiseChain = Promise.resolve();
              for (let i = 0; i < resp.Entries.length; i++) {
                promiseChain = promiseChain.then(function () {
                  return Keepass.helpers.decryptEntry(resp.Entries[i], rIv).then(function (decryptedEntry) {
                    // callback([decryptedEntry]);
                    decryptedEntries.push(decryptedEntry);
                  });
                });
              }
              promiseChain.then(function () {
                // decrypted all entries
                if (decryptedEntries.length === 0) {
                  browser.notifications.create({
                    'type': 'basic',
                    'message': browser.i18n.getMessage("noPassFound"),
                    'iconUrl': browser.extension.getURL('icons/keepass-96.png'),
                    'title': 'Keywi'
                  }); // TODO replace by injected message
                } else if (decryptedEntries.length === 1) {
                  callback(decryptedEntries[0]);
                } else {
                  self.prompts._selectCredentials(decryptedEntries).then(function (selectedCredential) {
                    callback(selectedCredential);
                  });

                }
              });
            }).
              catch(function () {
                browser.notifications.create({
                  'type': 'basic',
                  'message': browser.i18n.getMessage("noLogins"),
                  'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
                  'title': 'Keywi'
                });
              });
          }
        });
      });
    });
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

Keepass.associate = function (callback) {

  if (!Keepass._ss.ready()) {
    // if the secure storage isn't ready yet, first re initialize it
    // before associating the keepass database
    // If it was done the other way around, then if setting up the secure storage would fail
    // the association request would still be done, but the result couldn't be saved
    Keepass._ss.reInitialize().then(function () {
      Keepass.associate(callback);
    });
    return;
  }

  // test if we are already associated and it's working
  this.reCheckAssociated().then(function (associated) {
    if (associated) {
      callback();
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
      browser.storage.local.get('keepass-server-url').then(function (pref) {
        reqwest({
          'url': pref['keepass-server-url'] || 'http://localhost:19455',
          'type': 'json',
          'method': 'post',
          'data': JSON.stringify(req),
          'contentType': 'application/json',
          'error': function () {
            browser.notifications.create({
              'type': 'basic',
              'message': browser.i18n.getMessage("cannotConnect"),
              'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
              'title': 'Keywi'
            });
          },
          'success': function (resp) {
            if (resp.Success) {
              Keepass._ss.set('database.id', resp.Id).then(function () {
                return Keepass._ss.set('database.key', key);
              }).
                then(function () {
                  return Keepass._ss.set('database.hash', resp.Hash);
                }).
                then(function () {
                  Keepass.state.associated = true;
                  callback();
                });
            } else {
              browser.notifications.create({
                'type': 'basic',
                'message': browser.i18n.getMessage("assocFailed"),
                'iconUrl': browser.extension.getURL('icons/keywi-96.png'),
                'title': 'Keywi'
              });
            }
          }
        });
      });
    }
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
    return true;
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
    return true;
  } else if (request.type === 'options_user_info') {
    let hash = null;
    if (Keepass.ready()) {
      Keepass._ss.get('database.hash').then(function (data) {
        hash = data;
        Keepass._ss.get('database.id').then(function (id) {
          let response = {};
          response[browser.i18n.getMessage("statusSSunlocked")] = Keepass._ss.ready();
          response[browser.i18n.getMessage("statusDBassoc")] = Keepass.ready();
          response[browser.i18n.getMessage("statusDBhash")] = hash;
          response[browser.i18n.getMessage("statusDBid")] = id;
          sendResponse(response);
        });
      }).
        catch(function () {
          let response = {};
          response[browser.i18n.getMessage("statusSSunlocked")] = Keepass._ss.ready();
          response[browser.i18n.getMessage("statusDBassoc")] = Keepass.ready();
          sendResponse(response);
        });
    } else {
      let response = {}
      response[browser.i18n.getMessage("statusSSunlocked")] = Keepass._ss.ready();
      response[browser.i18n.getMessage("statusDBassoc")] = Keepass.ready();
      sendResponse(response);
    }
    return true; // http://stackoverflow.com/a/40773823
  }
});
