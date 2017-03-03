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

function LocalSecureStorage(unlock) {
    if (typeof unlock === 'undefined') {
        unlock = true;
    }
    let self = this;
    return new Promise(function(resolve, reject) {
        if (!unlock) {
            resolve(self);
        } else {
            self._unlockStorage().then(function() {
               resolve(self);
            }).catch(function(err) {
               console.log(err);
               reject(self);
            });
        }
    });
}

LocalSecureStorage.prototype = Object.create(SecureStorage.prototype);
LocalSecureStorage.prototype.constructor = LocalSecureStorage;
LocalSecureStorage.prototype._prefix = "local_secure_storage__";
LocalSecureStorage.prototype._dummyValueKey = "encryption_key_test";

LocalSecureStorage.prototype._encryptionkey = null;


LocalSecureStorage.prototype.ready = function() {
    return LocalSecureStorage.prototype._encryptionkey !== null;
};

/**
 * @brief re-initialize the Local Secure Storage. This can be used to unlock the storage when the e.g. the user canceled the popup.
 */
LocalSecureStorage.prototype.reInitialize = function() {
    return this._unlockStorage();
};



/**
 * @brief Checks if the SecureStorage already has an encryption key.
 * @returns {Promise}
 * @private
 */
LocalSecureStorage.prototype._hasEncryptionKey = function() {
    /**
     * We store some dummy data in the LocalSecureStorage to make the user already provided an encryption key.
     */
    let self = this;
    return new Promise(function(resolve, reject) {
        self.has(LocalSecureStorage.prototype._dummyValueKey).then(function () {
           resolve();
        }).catch(function (error) {
           reject(error);
        });
    });
};

/**
 * @brief Asks the user for a new password to the Secure storage.
 *  - will derive a key of this
 *  - save the dummy value
 *  - save the new encryption key in LocalSecureStorage.prototype._encryptionKey
 * @returns {Promise}
 * @private
 */
LocalSecureStorage.prototype._setupNewPassword = function() {
    return new Promise(function(resolve, reject) {
        LocalSecureStorage.prompts.setupNewPassword()
            .then(function(userKey) {
                Crypto.deriveKey(userKey, true).then(function (encryptionKey) {
                    var verifiers = Crypto.generateVerifier(encryptionKey);

                    var data = {};
                    data[LocalSecureStorage.prototype._prefix + LocalSecureStorage.prototype._dummyValueKey] = {
                        nonce: verifiers[0],
                        verifier: verifiers[1]
                    };

                    browser.storage.local.set(data);

                    LocalSecureStorage.prototype._encryptionkey = encryptionKey;
                    resolve();
                }).catch(function(err){
                    console.error(err);
                    reject(err);
                });
            }).catch(function(err){
                console.error(err);
                reject(err);
            });
    });
};

LocalSecureStorage.prototype._unlockExistingPassword = function() {
    return new Promise(function(resolve, reject) {
        LocalSecureStorage.prompts.unlock(function(userKey, accept, reject) {
            // This function works as a verifier which can be called by the unlock() prompt to verify the correctness of the key
            Crypto.deriveKey(userKey).then(function (encryptionKey) {
                browser.storage.local.get(LocalSecureStorage.prototype._prefix + LocalSecureStorage.prototype._dummyValueKey).then(function (data) {
                    var actualData = data[LocalSecureStorage.prototype._prefix + LocalSecureStorage.prototype._dummyValueKey];
                    var iv = actualData.nonce;
                    var verifier = actualData.verifier;

                    /**
                     * First verify that the provided key to the LocalSecureStorage is correct.
                     */
                    var checkIvStr = Crypto.decryptAsString(verifier, encryptionKey, iv);

                    if (checkIvStr !== iv) {
                        console.log("Error decrypting: key wrong!");
                        reject("Wrong  key provided by user!");
                    } else {
                        accept(encryptionKey);
                    }
                });
            });
        }).then(function(encryptionKey) {
            // the prompts.unlock will resolve the Promise when it's done cleaning up the prompt
            LocalSecureStorage.prototype._encryptionkey = encryptionKey;
            resolve();
        }).catch(function(err){
            reject(err);
        });
    });
};

LocalSecureStorage.prototype._unlockStorage = function() {
    let self = this;
    return new Promise(function (resolve, reject) {
        // first check if there is already an encryption key
        if (LocalSecureStorage.prototype._encryptionkey !== null) {
            resolve();
        } else {
            // check if the user has ever provided an encryption key
            self._hasEncryptionKey()
                .then(function(){
                    // we have an encryption key, ask the user to input this, and verify that this is the correct key and store it for later user
                    self._unlockExistingPassword().then(function() {
                        resolve();
                    }).catch(function(err){
                        console.error(err);
                        reject(err);
                    });
                })
                .catch(function (error) {
                    // we don't have an encryption key, create one, and store dummy data with it
                    self._setupNewPassword().then(function() {
                       resolve();
                    }).catch(function(err){
                        console.error(err);
                        reject(err);
                    });
                });
        }
    });
};

LocalSecureStorage.prototype.has = function(key) {
    return new Promise(function (resolve, reject) {
        browser.storage.local.get(LocalSecureStorage.prototype._prefix + key, function (data) {
            if (Object.keys(data).length === 0) {
                reject("No such key!");
            } else {
                resolve();
            }
        });
    });
};

LocalSecureStorage.prototype.set = function(key, value) {
    let self = this;
    return new Promise(function (resolve, reject) {
        self._unlockStorage().then(function() {
            SecureStorage.prototype._setCache(key, value);
            var verifiers = Crypto.generateVerifier(LocalSecureStorage.prototype._encryptionkey);

            var data = {};
            data[LocalSecureStorage.prototype._prefix + key] = {
                data: Crypto.encrypt(value, LocalSecureStorage.prototype._encryptionkey, verifiers[0]),
                nonce: verifiers[0],
                verifier: verifiers[1]
            };

            browser.storage.local.set(data);

            resolve();
        }).catch(function(err) {
            console.error(err);
            reject(err);
        });
    });
};

LocalSecureStorage.prototype.get = function (key) {
    let self = this;
    return new Promise(function (resolve, reject) {
        if (SecureStorage.prototype._hasCache(key)) {
            resolve(SecureStorage.prototype._getCache(key));
        } else {
            self._unlockStorage().then(function() {
                browser.storage.local.get(LocalSecureStorage.prototype._prefix + key).then(function (data) {
                    if (Object.keys(data).length === 0) {
                        reject("Not found (" + key + ")");
                    } else {
                        let decryptedDataStr = self._decrypt(data[LocalSecureStorage.prototype._prefix + key]);
                        resolve(decryptedDataStr);
                    }
                });

            }).catch(function (err) {
                console.error(err);
                reject(err);
            });
        }
    });
};

/**
 * @brief Decrypts and verifies a data object using the LocalSecureStorage.prototype._encryptionKey as key.
 * @pre assumes the database is unlocked!
 * @param data, object must have the data, nonce and verifier values. Data is the encrypted data,
 * nonce is a one-time used random value and verifier is the encrypted nonce.
 */
LocalSecureStorage.prototype._decrypt = function (data) {
    let iv = data.nonce;
    let verifier = data.verifier;

    /**
     * First verify that the data is encrypted with the key stored in this._encryptionKey.
     */
    let checkIvStr = Crypto.decryptAsString(verifier, LocalSecureStorage.prototype._encryptionkey, iv);

    if (checkIvStr !== iv) {
        console.log("Error decrypting: key wrong!");
        throw "Error decrypting: key wrong!";
        // return null;
    }

    /**
     * Decrypt the data.
     */
    let decryptedDataStr = Crypto.decryptAsString(data.data, LocalSecureStorage.prototype._encryptionkey, iv);

    return decryptedDataStr;
};

LocalSecureStorage.prototype.delete = function (key) {
    this._removeCache(key);
    return browser.storage.local.remove(LocalSecureStorage.prototype._prefix + key);
};

LocalSecureStorage.prototype.clear = function() {
    let self = this;
    return browser.storage.local.get().then(function(data) {

        let prefixLength = LocalSecureStorage.prototype._prefix.length;

        let promiseChain = Promise.resolve();

        for (const key of Object.keys(data)) {
            if (key.substr(0, prefixLength) === LocalSecureStorage.prototype._prefix) {
                promiseChain = promiseChain.then(function() {
                    let userKey = key.substr(prefixLength, key.length - prefixLength);
                    console.log(userKey);
                    return self.delete(userKey)
                });
            }
        }

        LocalSecureStorage.prototype._encryptionkey = null;
        Keepass.state.associated = false;

        return promiseChain;

    });
};

/**
 * @brief re-encrypts the SecureStorage by asking the user for a new password.
 *  - This will automatically generate a new salt.
 *  - This can be used when you have changed the e.g. hashing rounds count
 *  @todo use promises (currently this is not done because of the setTimeOut)
 */
LocalSecureStorage.prototype.reencrypt = function(callback) {
    var self = this;
    browser.storage.local.get().then(function(data) {
        self._unlockStorage().then(function() {
            // first fetch all old data and decrypt it
            let dataToSave = {};

            let prefixLength = LocalSecureStorage.prototype._prefix.length;
            /**
             * Keep track if we have were associated before, if so and we reach the encrypt code, it should be associated again.
             * If we don't reach the encrypt code i.e. the user canceled something, we are not associated.
             * @type {boolean}
             */
            let originalAssociated = Keepass.state.associated;

            for (const key of Object.keys(data)) {
                if (key.substr(0, prefixLength) === LocalSecureStorage.prototype._prefix) {
                    // only re-encrypt encrypted keys
                    // and do not ree-ncrypt the dummy value
                    let userKey = key.substr(prefixLength, key.length - prefixLength);
                    console.log(userKey);
                    if (userKey !== LocalSecureStorage.prototype._dummyValueKey) {
                        dataToSave[userKey] = self._decrypt(data[key]);
                    }
                    self.delete(userKey); // remove from the Secure Storage
                    Keepass.state.associated = false;
                }
            }

            setTimeout(function() {
                /// we have to wait a bit Firefox doesn't like if we open too many windows in a short time (too many = 2)
                LocalSecureStorage.prototype._encryptionkey = null;
                self._setupNewPassword().then(function() {
                    // ask the user to enter a new password and setup the database to use it
                    for (const ikey of Object.keys(dataToSave)) {
                        let idata = dataToSave[ikey];
                        self.set(ikey, idata); // will automatically use the new key
                    }
                    Keepass.state.associated = originalAssociated;
                    callback();
                }).catch(function(err) {
                    console.log(err);
                    // TODO
                    callback();
                });
            }, 1000);
        }).catch(function(err) {
            console.log(err);
            callback();
            // TODO
        });

    });
};

