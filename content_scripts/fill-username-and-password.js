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
        if (parent.tagName === "BODY" || parent.tagName === "FORM") {
            console.log("No password field found!");
            return null;
        }

        let passwordField = parent.querySelector("input[type='password']");
        console.log(passwordField);
        if (passwordField != null) {
            console.log("Found password field:");
            console.log(passwordField);
            return passwordField;
        }
    }
}

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var usernameField = document.activeElement;
    var passwordField = searchForPasswordInput(usernameField);
    usernameField.value = request.username;
    passwordField.value = request.password;
});

