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

