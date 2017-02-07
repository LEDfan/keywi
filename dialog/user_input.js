browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request);
    if (request.type === "user_input_msg") {
        console.log(request);
        document.getElementById("msg").innerText = request.data.msg;
        windowId = request.data.window_id;
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
    browser.windows.remove(windowId);
    // browser.runtime.sendMessage({
    //     type: "user_input_close_window"
    // });
};

