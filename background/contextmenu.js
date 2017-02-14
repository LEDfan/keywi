browser.contextMenus.create({
    id: "username-and-password",
    title: "Fill username and password",
    contexts: ["editable"]
});
browser.contextMenus.create({
    id: "username",
    title: "Fill username",
    contexts: ["editable"]
});
browser.runtime.getBrowserInfo().then((info) => {
    var ctx;
    if (Number.parseInt(info.version.split(".")[0]) >= 53) {
        ctx = "password";
    } else {
        ctx = "editable";
    }
    browser.contextMenus.create({
        id: "password",
        title: "Fill password",
        contexts: [ctx]
    });
});

activeGetLogins = [];

browser.runtime.onMessage.addListener((request, sender, sendresponse) => {
    if (request.type == "no-password-field-found") {
        browser.notifications.create({
            type: "basic",
            message: "No password field found, filling only username.",
            iconUrl: browser.extension.getURL("icons/keywi-96.png"),
            title: "Keywi"
        });
    }
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    var type;
    if (info.menuItemId === "username-and-password" || info.menuItemId === "username" || info.menuItemId === "password") {
        type = info.menuItemId;
    } else {
        return;
    }
    if (activeGetLogins.indexOf(tab.id) === -1) {
        // prevent from simultaneous filling in the credentials
        activeGetLogins.push(tab.id);
        Keepass.getLogins(tab.url, function(entry) {
            browser.tabs.sendMessage(tab.id, {
                type: type,
                username: entry.Login,
                password: entry.Password
            });
            activeGetLogins.splice(activeGetLogins.indexOf(tab.id), 1);
        });
    }
});
