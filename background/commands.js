browser.commands.onCommand.addListener((cmd) => {
    if (cmd === "fill-form") {
        browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
            Keepass.getLogins(tabs[0].url, (entries) => {
                browser.tabs.sendMessage(tabs[0].id, {
                    type: "username-and-password",
                    username: entries.Login,
                    password: entries.Password
                });
            });
        });
    }
});
