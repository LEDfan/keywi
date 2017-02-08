function promptFromBg(msg) {
    return new Promise(function (resolve, reject) {
        browser.tabs.create({
            url: browser.extension.getURL('dialog/user_input.html'),
            active: false
        }, function (tab) {
            // After the tab has been created, open a window to inject the tab
            browser.windows.create({
                tabId: tab.id,
                type: 'popup',
            }).then(function (newWindow) {
                browser.runtime.sendMessage({type: "user_input_msg", data: {msg: msg, window_id: newWindow.id}});
            });
        });

        browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
            if (request.type === "user_input") {
                resolve(request.data.userInput);
                browser.runtime.onMessage.removeListener(_func);
            }
        });
    });
}
