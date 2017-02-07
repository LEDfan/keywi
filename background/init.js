function init() {
    browser.storage.local.clear();
    var ss = new LocalSecureStorage();
    ss.set("test", "abc", function () {
    });

    setTimeout(function () {

        console.log("Done, fetching...");
        ss.get("test", function (data) {
            console.log("Fetched " + data);
        });
    }, 6000);


    // Keepass.associate(function () {});
}

init();
