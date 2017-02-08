function LocalSecureStorage() {
}

LocalSecureStorage.prototype = new SecureStorage();

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
            confirmFromBg("Fill in the existing password for the secure storage.. (TODO)", function (encryptionKey) {
                browser.storage.local.get("local_secure_storage_encryption_key_test").then(function (data) {
                    var actualData = data["local_secure_storage_encryption_key_test"];
                    var iv = actualData.nonce;
                    var verifier = actualData.verifier;

                    /**
                     * First verify that the provided key to the LocalSecureStorage is correct.
                     */
                    var checkIv = slowAES.decrypt(
                        cryptoHelpers.convertStringToByteArray(atob(verifier)),
                        slowAES.modeOfOperation.CBC,
                        cryptoHelpers.convertStringToByteArray(atob(encryptionKey)),
                        cryptoHelpers.convertStringToByteArray(atob(iv))
                    );

                    var checkIvStr = cryptoHelpers.convertByteArrayToString(checkIv);

                    if (checkIvStr !== iv) {
                        console.log("Error decrypting: key wrong!");
                        onError("Wrong decryption key provided by user!");
                        return;
                    }

                    LocalSecureStorage.prototype._encryptionkey = encryptionKey;
                    onSuccess();
                });

            });
        }, function () {
            // we don't have an encryption key, create one, and store dummy data with it
            confirmFromBg("Fill in a new password for the secure storage.. (TODO)", function (encryptionKey) {
                var verifiers = Keepass.helpers.getVerifier(encryptionKey);

                var data = {};
                data["local_secure_storage_encryption_key_test"] = {
                    // data: Keepass.helpers.encrypt("DUMMY_DATA", encryptionKey, verifiers[0]),
                    nonce: verifiers[0],
                    verifier: verifiers[1]
                };

                browser.storage.local.set(data);

                LocalSecureStorage.prototype._encryptionkey = encryptionKey;
                onSuccess();
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
        var verifiers = Keepass.helpers.getVerifier(LocalSecureStorage.prototype._encryptionkey);

        var data = {};
        data[key] = {
            data: Keepass.helpers.encrypt(value, LocalSecureStorage.prototype._encryptionkey, verifiers[0]),
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
                var checkIv = slowAES.decrypt(
                    cryptoHelpers.convertStringToByteArray(atob(verifier)),
                    slowAES.modeOfOperation.CBC,
                    cryptoHelpers.convertStringToByteArray(atob(LocalSecureStorage.prototype._encryptionkey)),
                    cryptoHelpers.convertStringToByteArray(atob(iv))
                );

                var checkIvStr = cryptoHelpers.convertByteArrayToString(checkIv);

                if (checkIvStr !== iv) {
                    console.log("Error decrypting: key wrong!");
                    onError();
                    return;
                }

                /**
                 * Decrypt the data.
                 */
                var decryptedData = slowAES.decrypt(
                    cryptoHelpers.convertStringToByteArray(atob(actualData.data)),
                    slowAES.modeOfOperation.CBC,
                    cryptoHelpers.convertStringToByteArray(atob(LocalSecureStorage.prototype._encryptionkey)),
                    cryptoHelpers.convertStringToByteArray(atob(iv))
                );

                var decryptedDataStr = cryptoHelpers.convertByteArrayToString(decryptedData);

                onSuccess(decryptedDataStr);
            });

        }, function () {
            // TODO
        });
    }
};

LocalSecureStorage.prototype.delete = function (key) {

};
