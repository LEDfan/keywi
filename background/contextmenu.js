browser.contextMenus.create({
    id: "username-and-password",
    title: "Fill username and password",
    contexts: ["editable"]
});

activeGetLogins = [];

browser.runtime.onMessage.addListener((request, sender, sendresponse) => {
    if (request.type == "no-password-field-found") {
        browser.notifications.create({
            type: "basic",
            message: "No password field found, filling only username.",
            iconUrl: browser.extension.getURL("icons/keepass-96.png"),
            title: "{Keepass}"
        });
    }
})

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId == "username-and-password") {
        if (activeGetLogins.indexOf(tab.id) === -1) {
            // prevent from simultaneous filling in the credentials
            activeGetLogins.push(tab.id);
            browser.tabs.executeScript(tab.id, {file: "content_scripts/fill-username-and-password.js"}, function(result) {
                console.log("Done, now send user and password!");
                Keepass.getLogins(tab.url, function(entry) {
                    browser.tabs.sendMessage(tab.id, {
                        type: "username-and-password",
                        username: entry.Login,
                        password: entry.Password
                    });
                    activeGetLogins.splice(activeGetLogins.indexOf(tab.id), 1);
                });
            });
        }
    }
});
