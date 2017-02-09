function LocalSecureStorage() {
    let self = this;
    return new Promise(function(resolve, reject) {
        self._unlockStorage().then(function() {
           resolve(self);
        });
    });
}

LocalSecureStorage.prototype = Object.create(SecureStorage.prototype);
LocalSecureStorage.prototype.constructor = LocalSecureStorage;
LocalSecureStorage.prototype._prefix = "local_secure_storage__";
LocalSecureStorage.prototype._dummyValueKey = "encryption_key_test";

LocalSecureStorage.prototype._encryptionkey = null;

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
                    promptFromBg("Fill in the existing password for the secure storage.. (TODO)")
                        .then(function (userKey) {
                            Crypto.deriveKey(userKey).then(function (encryptionKey) {
                                browser.storage.local.get(LocalSecureStorage.prototype._prefix + LocalSecureStorage.prototype._dummyValueKey).then(function (data) {
                                    var actualData = data[LocalSecureStorage.prototype._prefix + LocalSecureStorage.prototype._dummyValueKey];
                                    var iv = actualData.nonce;
                                    var verifier = actualData.verifier;

                                    /**
                                     * First verify that the provided key to the LocalSecureStorage is correct.
                                     */
                                    console.log(verifier);
                                    var checkIvStr = Crypto.decryptAsString(verifier, encryptionKey, iv);
                                    console.log(iv);
                                    console.log(checkIvStr);

                                    if (checkIvStr !== iv) {
                                        console.log("Error decrypting: key wrong!");
                                        reject("Wrong decryption key provided by user!");
                                        return;
                                    }

                                    LocalSecureStorage.prototype._encryptionkey = encryptionKey;
                                    resolve();
                                });
                            }).catch(function(err){
                                console.error(err);
                                reject(err);
                            });
                        });
                })
                .catch(function (error) {
                    // we don't have an encryption key, create one, and store dummy data with it
                    promptFromBg("Fill in a new password for the secure storage.. (TODO)")
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
                        var actualData = data[LocalSecureStorage.prototype._prefix + key];
                        var iv = actualData.nonce;
                        var verifier = actualData.verifier;

                        /**
                         * First verify that the data is encrypted with the key stored in this._encryptionKey.
                         */
                        var checkIvStr = Crypto.decryptAsString(verifier, LocalSecureStorage.prototype._encryptionkey, iv);

                        if (checkIvStr !== iv) {
                            console.log("Error decrypting: key wrong!");
                            reject("Error decrypting: key wrong!");
                            return;
                        }

                        /**
                         * Decrypt the data.
                         */
                        var decryptedDataStr = Crypto.decryptAsString(actualData.data, LocalSecureStorage.prototype._encryptionkey, iv);

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

LocalSecureStorage.prototype.delete = function (key) {

};

LocalSecureStorage.prototype.clear = function () {
    let self = this;
    browser.storage.local.get().then(function(data) {
        console.log(data)
        Object.keys(data).forEach(function(key) {
            let prefixLength = LocalSecureStorage.prototype._prefix.length;
            if (key.substr(0, prefixLength) === LocalSecureStorage.prototype._prefix) {
                let userKey  = key.substr(prefixLength, key.length - prefixLength);
                self._removeCache(userKey);

                console.log(key.substr(prefixLength, key.length - prefixLength));
                browser.storage.local.remove(key);
            }

        });

    });

};

LocalSecureStorage.prototype.invalidateKey = function() {
    LocalSecureStorage.prototype._encryptionkey = null;
    this.clear();

};

