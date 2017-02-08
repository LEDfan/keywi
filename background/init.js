function init() {
    // browser.storage.local.clear(); // uncomment this to test the mechanism to ask the user for a new key
    // var ss = new LocalSecureStorage();
    // ss.set("test", "abc").then(function() {
    //     console.log("Stored key test");
    //     // the following shouldn't ask for a new or existing key
    //     return ss.get("test");
    // }).then(function (data) {
    //     console.log("Fetched key (1) test");
    //     console.log(data);
    //     return ss.get("test");
    // }).then(function (data) {
    //     console.log("Fetched key (2) test");
    //     console.log(data);
    // });
    //
    Keepass.associate(function () {});
}

init();
