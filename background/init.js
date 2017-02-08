function init() {
    browser.storage.local.clear();
    var ss = new LocalSecureStorage();
    ss.set("test", "abc", function () {
        console.log("Stored abc")
        ss.get("test", function (data) {
            console.log("Fetched " + data);
        }, function () {
            console.log("Couldn't fetch data with key test...");
        });
    });

    // Keepass.associate(function () {});
}

init();
