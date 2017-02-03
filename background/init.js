function init() {
    Keepass.associate(function () {
        Keepass.getLogins("http://keepass.info");
    });
}

init();
