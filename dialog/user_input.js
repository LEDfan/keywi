browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === "user_input_msg") {
        document.getElementById("msg").innerText = request.data.msg;
        window.windowId = request.data.window_id;
    }

});

document.forms[0].onsubmit = function(e) {
    e.preventDefault(); // Prevent submission
    var password = document.getElementById('pass').value;

    browser.runtime.sendMessage({
        type: "user_input",
        data: {
            userInput: password
        }
    })
    browser.windows.remove(window.windowId);
};

