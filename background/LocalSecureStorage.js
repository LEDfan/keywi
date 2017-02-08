function LocalSecureStorage() {
}

LocalSecureStorage.prototype = new SecureStorage();

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
    this.has(key, function(value) {
        // TODO
    }, function() {
        confirmFromBg("Fill in a new password for the secure storage.. (TODO)", function (keyToStorage) {
            SecureStorage.prototype._setCache(key, value);
            var verifiers = Keepass.helpers.getVerifier(keyToStorage);

            var data = {};
            data[key] = {
                data: Keepass.helpers.encrypt(value, keyToStorage, verifiers[0]),
                nonce: verifiers[0],
                verifier: verifiers[1]
            };

            browser.storage.local.set(data);

            done();
        });
    });


};

LocalSecureStorage.prototype.get = function (key, onSuccess, onError) {
    confirmFromBg("Fill in the existing password for the secure storage.. (TODO)", function (keyToStorage) {
        browser.storage.local.get(key).then(function(data) {
            var actualData = data[key];
            var iv = actualData.nonce;
            var verifier = actualData.verifier;

            /**
             * First verify that the provided key to the LocalSecureStorage is correct.
             */
            var checkIv = slowAES.decrypt(
                cryptoHelpers.convertStringToByteArray(atob(verifier)),
                slowAES.modeOfOperation.CBC,
                cryptoHelpers.convertStringToByteArray(atob(keyToStorage)),
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
                cryptoHelpers.convertStringToByteArray(atob(keyToStorage)),
                cryptoHelpers.convertStringToByteArray(atob(iv))
            );

            var decryptedDataStr = cryptoHelpers.convertByteArrayToString(decryptedData);

            onSuccess(decryptedDataStr);
        });

    });
};

LocalSecureStorage.prototype.delete = function (key) {

};
