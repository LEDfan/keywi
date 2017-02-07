function confirmFromBg(msg, callback) {
    // var currentTab = browser.tabs.getCurrent();
    // browser.tabs.executeScript(currentTab.id, {
    //     "file" : "content_scripts/confirm.js"
    // });
    // browser.runtime.sendMessage({
    //     type: "confirm",
    //     msg: msg
    // }).then(function (response) {
    //     callback(response.userInput)
    // }, function () {
    //
    // });
    browser.tabs.create({
        url: browser.extension.getURL('dialog/user_input.html'),
        active: false
    }, function (tab) {
        // After the tab has been created, open a window to inject the tab
        browser.windows.create({
            tabId: tab.id,
            type: 'popup',
            // focused: true
            // incognito, top, left, ...
        }).then(function (newWindow) {
            browser.runtime.sendMessage({type: "user_input_msg", data: {msg: msg, window_id: newWindow.id}});
            // browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            //     if (request.type === "user_input_close_window") {
            //         browser.windows.remove(newWindow.id);
            //     }
            // });
        });
    });

    browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
        if (request.type === "user_input") {
            // browser.windows.remove(request.data.window_id);
            console.log("Will call callback!");
            callback(request.data.userInput);
            browser.runtime.onMessage.removeListener(_func);

        }
    });
}
