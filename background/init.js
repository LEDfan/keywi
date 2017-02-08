function init() {
    // browser.storage.local.clear(); // uncomment this to test the mechanism to ask the user for a new key
    new LocalSecureStorage().then(function(ss) {
        Keepass.setSecureStorage(ss);
        console.log(ss);
        Keepass.associate(function() {
            console.log("Associated!");
        });
    });
    // Keepass.reCheckAssociated().then(function(associated) {
    //     if (!associated) {
        // }
    // });
}

// setTimeout(init, 1000);
init();
