document.forms[0].onsubmit = function(e) {
    e.preventDefault(); // Prevent submission
    let password1 = document.getElementById('pass1').value;
    let password2 = document.getElementById('pass2').value;
    if (password1 !== password2) {
        alert("Passwords must be equal!"); // TODO
    } else {
        browser.runtime.sendMessage({
            type: "ss_setup_password_user_input",
            data: {
                password: password1
            }
        });
        // browser.windows.remove(window.windowId);
    }
};

document.getElementById("cancel").onclick = function() {
    browser.runtime.sendMessage({
        type: "ss_setup_password_cancel",
        data: {}
    });
};
