// TODO reduce amount of console.log

/**
 * @brief Determines the password field belonging to a username field
 *
 * @param userInput
 * @returns the DOM element which is the password input field | null when no element is found
 * @todo write basic tests
 */
function searchForPasswordInput(userInput) {
    let parent = userInput;
    while (true) {
        parent = parent.parentElement;

        let passwordField = parent.querySelector("input[type='password']");
        console.log(passwordField);
        if (passwordField != null) {
            console.log("Found password field:");
            console.log(passwordField);
            return passwordField;
        }

        if (parent.tagName === "BODY" || parent.tagName === "FORM") {
            console.log("No password field found!");
            return null;
        }
    }
}

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type == "username-and-password") {
        var usernameField = document.activeElement;
        usernameField.value = request.username;

        /**
         * Some website use a custom made placeholder using <label>'s. This placeholder is removed by JS when the user
         * enters something in the input field. However since we change the value of the input field using JS this event
         * isn't triggered. Therefore we simulate a key press.
         * See e.g. dropbox.com
         */
        let event = new KeyboardEvent("keydown", {
            key: "ArrowLeft",
        });
        usernameField.dispatchEvent(event);

        var passwordField = searchForPasswordInput(usernameField);
        if (passwordField === null) {
            browser.runtime.sendMessage({type:"no-password-field-found"});
        } else {
            passwordField.value = request.password;
            passwordField.dispatchEvent(event);
        }
    }
});

