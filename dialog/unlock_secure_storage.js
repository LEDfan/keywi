document.forms[0].onsubmit = function(e) {
    e.preventDefault(); // Prevent submission
    let password = document.getElementById('pass').value;
        browser.runtime.sendMessage({
            type: "ss_unlock_user_input",
            data: {
                password: password
            }
        });
        // browser.windows.remove(window.windowId);
};

// browser.tabs.sendMessage(tab.id, {type: "ss_unlock_wrong_key", msg: msg});
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "ss_unlock_reject") {
        alert(request.msg);
    }
});
