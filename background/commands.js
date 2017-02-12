browser.commands.onCommand.addListener((cmd) => {
    var type;
    if (cmd === "fill-form") {
        type = "username-and-password";
    } else if (cmd === "fill-password") {
        type = "password";
    } else {
        return;
    }
    browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
        Keepass.getLogins(tabs[0].url, (entries) => {
            browser.tabs.sendMessage(tabs[0].id, {
                type: type,
                suppress_error_on_missing_pw_field: true,
                username: entries.Login,
                password: entries.Password
            });
        });
    });
});
