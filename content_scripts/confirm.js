browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type == "confirm") {
        var userInput = confirm(request.msg);
        sendResponse({userInput: userInput});
    }
});

