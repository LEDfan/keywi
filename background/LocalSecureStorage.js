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
                nonce: verifiers[0]
            };

            browser.storage.local.set(data);

            done();
        });
    });


};

LocalSecureStorage.prototype.get = function (key, done) {
    confirmFromBg("Fill in the existing password for the secure storage.. (TODO)", function (keyToStorage) {
        browser.storage.local.get(key).then(function(data) {
            var actualData = data[key];
            var output = slowAES.decrypt(
                cryptoHelpers.convertStringToByteArray(atob(actualData.data)),
                slowAES.modeOfOperation.CBC,
                cryptoHelpers.convertStringToByteArray(atob(keyToStorage)),
                cryptoHelpers.convertStringToByteArray(atob(actualData.nonce))
            );
            var res = cryptoHelpers.convertByteArrayToString(output);
            done(res);
        });

    });
};

LocalSecureStorage.prototype.delete = function (key) {

};
