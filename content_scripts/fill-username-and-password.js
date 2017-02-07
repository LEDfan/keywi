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


/**
 * Shows a notification to the user in the right top corner. Will be removed after 3 seconds.
 * @todo animations
 * @param id the html id, is automatically prefixed with "keepass_msg_".
 * @param msg the message to show to the user
 */
function showMessage(id, msg) {
    document.body.insertAdjacentHTML('afterbegin', `
<style>
.keepass_title {

}

.keepass_msg_text {

}

.keepass_message-container {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    height: 100px;
    background-color: #FFFFFF;
    z-index: 1000;
    
    border: 1px solid #636363;
    border-radius: 4px;
    box-shadow: 0 1px 1px rgba(0,0,0,.05);
}

.keepass_message-heading {
    color: #333;
    background-color: #ddd;
    padding: 10px 15px;
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    border-bottom: 1px solid #636363;
}

.keepass_message-body {
    padding: 15px;
}

</style>
<div id="keepass_msg_` + id + `" class="keepass_message-container">
    <div class="keepass_message-heading">
        <span class="keepass_title">Keepass</span>
    </div>
    <div class="keepass_message-body">
        <p class="keepass_msg_text">` + msg  + `</p>
    </div>
</div>
`);

    var element = document.getElementById("keepass_msg_" + id);
    setInterval(function () {
        element.parentElement.removeChild(element);
    }, 3000);
}

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var usernameField = document.activeElement;
    usernameField.value = request.username;
    var passwordField = searchForPasswordInput(usernameField);
    if (passwordField === null) {
        showMessage("no-password", "No password field found, only filling username.");
    } else {
        passwordField.value = request.password;
    }
});

