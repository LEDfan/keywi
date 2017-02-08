function init() {
    // browser.storage.local.clear(); // uncomment this to test the mechanism to ask the user for a new key
    var ss = new LocalSecureStorage();
    ss.set("test", "abc", function () {
        console.log("Stored abc");
        // the following shouldn't ask for a new or existing key
        ss.get("test", function (data) {
            console.log("Fetched " + data);
        }, function () {
            console.log("Couldn't fetch data with key test...");
        });
        ss.get("test", function (data) {
            console.log("Fetched second time " + data);
        }, function () {
            console.log("Couldn't fetch data with key test...");
        });
    });

    // Keepass.associate(function () {});
}

init();
