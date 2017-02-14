function init() {
    // browser.storage.local.clear(); // uncomment this to test the mechanism to ask the user for a new key
    new LocalSecureStorage().then(function(ss) {
        Keepass.setSecureStorage(ss);
        console.log("Initialized the Secure Storage, associating with keepass now.");
        Keepass.reCheckAssociated().then(function(associated) {
            if (!associated) {
                Keepass._ss.has("database.key").then(function(key) {
                    browser.notifications.create({
                        type: "basic",
                        message: "Keywi is already associated with a database, but another database is open.",
                        iconUrl: browser.extension.getURL("icons/keywi-96.png"),
                        title: "Keywi"
                    });
                }).catch(function() {
                    Keepass.associate(function() {
                        console.log("Associated! 1");
                    });
                });
            } else {
                console.log("Associated! 2");
            }
        });
    }).catch(function(ss) {
        console.log("Failed to initialize Secure Storage, not associating with keepass!");
        Keepass.setSecureStorage(ss);
    });
    // Keepass.reCheckAssociated().then(function(associated) {
    //     if (!associated) {
        // }
    // });
}

setTimeout(init, 1000);
// init();
