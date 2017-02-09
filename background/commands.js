browser.commands.onCommand.addListener((cmd) => {
    if (cmd === "fill-form") {
        browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
            browser.tabs.executeScript(tabs[0].id,
                {file: "content_scripts/fill-username-and-password.js"},
                (result) => {
                    Keepass.getLogins(tabs[0].url, (entries) => {
                        if (entries.length != 1) {
                            alert('Not 1 entry!');
                        }

                        browser.tabs.sendMessage(tabs[0].id, {
                            type: "username-and-password",
                            username: entries[0].Login,
                            password: entries[0].Password
                        });
                    });
                });
        }
        );
    }
});
