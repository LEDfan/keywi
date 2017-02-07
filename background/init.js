function init() {
    browser.storage.local.clear();
    var ss = new LocalSecureStorage();
    ss.set("test", "abc", function () {
        console.trace("set!!!!");
        console.log("Done, fetching...");
        ss.get("test", function (data) {
            console.log("Fetched " + data);
        });
    });

    // setTimeout(function () {
    //
    // }, 6000);


    // Keepass.associate(function () {});
}

init();
