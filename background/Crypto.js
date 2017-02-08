var Crypto = {};

Crypto.keySize = 8;

Crypto.encrypt = function (input, key, iv) {
    return btoa(cryptoHelpers.convertByteArrayToString(
        slowAES.encrypt(
            cryptoHelpers.convertStringToByteArray(input),
            slowAES.modeOfOperation.CBC,
            cryptoHelpers.convertStringToByteArray(atob(key)),
            cryptoHelpers.convertStringToByteArray(atob(iv)
            )
        )));
};

Crypto.decryptAsString = function (input, key, iv) {
    var output = slowAES.decrypt(
        cryptoHelpers.convertStringToByteArray(atob(input)),
        slowAES.modeOfOperation.CBC,
        cryptoHelpers.convertStringToByteArray(atob(key)),
        cryptoHelpers.convertStringToByteArray(atob(iv))
    );
    return cryptoHelpers.convertByteArrayToString(output);
};

Crypto.generateVerifier = function (inputKey) {
    var iv = cryptoHelpers.generateSharedKey(Crypto.keySize);
    var nonce = btoa(cryptoHelpers.convertByteArrayToString(iv));

    var verifier = this.encrypt(nonce, inputKey, nonce);

    return [nonce, verifier];
};
