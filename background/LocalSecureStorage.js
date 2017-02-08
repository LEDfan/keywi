function LocalSecureStorage() {
}

LocalSecureStorage.prototype = Object.create(SecureStorage.prototype);
LocalSecureStorage.prototype.constructor = LocalSecureStorage;

LocalSecureStorage.prototype._encryptionkey = null;

LocalSecureStorage.prototype._hasEncryptionKey = function (onHas, onHasNot) {
    /**
     * We store some dummy data in the LocalSecureStorage to make the user already provided an encryption key.
     */
    this.has("local_secure_storage_encryption_key_test", onHas, onHasNot);
};

LocalSecureStorage.prototype._unlockStorage = function (onSuccess, onError) {
    // first check if there is already an encryption key
    if (LocalSecureStorage.prototype._encryptionkey !== null) {
        onSuccess();
    } else {
        // check if the user has ever provided an encryption key
        this._hasEncryptionKey(function () {
            // we have an encryption key, ask the user to input this, and verify that this is the correct key and store it for later user
            confirmFromBg("Fill in the existing password for the secure storage.. (TODO)", function (userKey) {
                Crypto.deriveKey(userKey).then(function (encryptionKey) {
                    // console.log("Using exisiting " + new TextDecoder("utf-8").decode(encryptionKey));
                    // encryptionKey = btoa(new TextDecoder("utf-8").decode(encryptionKey));
                    // encryptionKey = cryptoHelpers.convertByteArrayToString(encryptionKey);
                    var u8 = new Uint8Array(encryptionKey);
                    encryptionKey = btoa(String.fromCharCode.apply(null, u8));
                    // console.log("Decryption: ");
                    // console.log(encryptionKey);
                    browser.storage.local.get("local_secure_storage_encryption_key_test").then(function (data) {
                        var actualData = data["local_secure_storage_encryption_key_test"];
                        var iv = actualData.nonce;
                        var verifier = actualData.verifier;

                        // console.log(iv);
                        // console.log(verifier);

                        /**
                         * First verify that the provided key to the LocalSecureStorage is correct.
                         */
                        var checkIvStr = Crypto.decryptAsString(verifier, encryptionKey, iv);

                        // console.log(iv);
                        // console.log(checkIvStr);
                        if (checkIvStr !== iv) {
                            console.log("Error decrypting: key wrong!");
                            onError("Wrong decryption key provided by user!");
                            return;
                        }

                        LocalSecureStorage.prototype._encryptionkey = encryptionKey;
                        onSuccess();
                    });
                }).catch(function(err){
                    console.error(err);
                    // alert(err);
                });
            });
        }, function () {
            // we don't have an encryption key, create one, and store dummy data with it
            confirmFromBg("Fill in a new password for the secure storage.. (TODO)", function (userKey) {
                console.log("User key " + userKey);
                Crypto.deriveKey(userKey).then(function (encryptionKey) {
                    // console.log("Using new " + new TextDecoder("utf-8").decode(encryptionKey));
                    // encryptionKey = btoa(new TextDecoder("utf-8").decode(encryptionKey));
                    // var u8 = new Uint8Array(encryptionKey);
                    // var b64encoded = btoa(String.fromCharCode.apply(null, u8));
                    var u8 = new Uint8Array(encryptionKey);
                    encryptionKey = btoa(String.fromCharCode.apply(null, u8));
                    // console.log("Encryption: ");
                    // console.log(encryptionKey);
                    // console.log("Decryption: ");
                    // console.log(b64encoded);
                    // encryptionKey =  btoa(cryptoHelpers.convertByteArrayToString(encryptionKey));
                    // console.log("Encryption: ");
                    // console.log(encryptionKey);
                    var verifiers = Crypto.generateVerifier(encryptionKey);

                    // console.log(verifiers);
                    var data = {};
                    data["local_secure_storage_encryption_key_test"] = {
                        nonce: verifiers[0],
                        verifier: verifiers[1]
                    };

                    browser.storage.local.set(data);

                    LocalSecureStorage.prototype._encryptionkey = encryptionKey;
                    onSuccess();
                }).catch(function(err){
                    console.error(err);
                    // alert(err);
                });
            });
        });
    }

};

LocalSecureStorage.prototype.has = function(key, onHas, onNotHas) {
    browser.storage.local.get(key, function (data) {
        if (Object.keys(data).length === 0) {
            onNotHas();
        } else {
            onHas();
        }
    });
};

LocalSecureStorage.prototype.set = function(key, value, done) {
    this._unlockStorage(function () {
        SecureStorage.prototype._setCache(key, value);
        var verifiers = Crypto.generateVerifier(LocalSecureStorage.prototype._encryptionkey);

        var data = {};
        data[key] = {
            data: Crypto.encrypt(value, LocalSecureStorage.prototype._encryptionkey, verifiers[0]),
            nonce: verifiers[0],
            verifier: verifiers[1]
        };

        browser.storage.local.set(data);

        done();
    }, function () {
        // TODO
    });
};

LocalSecureStorage.prototype.get = function (key, onSuccess, onError) {
    if (SecureStorage.prototype._hasCache(key)) {
        onSuccess(SecureStorage.prototype._getCache(key));
    } else {
        this._unlockStorage(function () {
            browser.storage.local.get(key).then(function (data) {
                var actualData = data[key];
                var iv = actualData.nonce;
                var verifier = actualData.verifier;

                /**
                 * First verify that the data is encrypted with the key stored in this._encryptionKey.
                 */
                var checkIvStr = Crypto.decryptAsString(verifier, LocalSecureStorage.prototype._encryptionkey, iv);

                if (checkIvStr !== iv) {
                    console.log("Error decrypting: key wrong!");
                    onError();
                    return;
                }

                /**
                 * Decrypt the data.
                 */
                var decryptedDataStr = Crypto.decryptAsString(actualData.data, LocalSecureStorage.prototype._encryptionkey, iv);

                onSuccess(decryptedDataStr);
            });

        }, function () {
            // TODO
        });
    }
};

LocalSecureStorage.prototype.delete = function (key) {

};
