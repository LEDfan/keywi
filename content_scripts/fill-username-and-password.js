/**
 * @copyright Tobia De Koninck
 * @copyright Robin Jadoul
 *
 * This file is part of Keywi.
 * Keywi is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Keywi is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with Keywi.  If not, see <http://www.gnu.org/licenses/>.
 */

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
        if (passwordField !== null) {
            return passwordField;
        }
        if (parent.tagName === "BODY" || parent.tagName === "FORM") {
            return null;
        }
    }
}

browser.runtime.onMessage.addListener(function _func(request, sender, sendResponse) {
    if (request.type === "username-and-password") {
        if (document.activeElement.tagName !== "INPUT") // Only useful for input elements
            return ;

        let usernameField = document.activeElement;
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

        let passwordField = searchForPasswordInput(usernameField);
        if (passwordField === null && !request.suppress_error_on_missing_pw_field) {
            browser.runtime.sendMessage({type:"no-password-field-found"});
        } else {
            passwordField.value = request.password;
            passwordField.dispatchEvent(event);
        }
    } else if (request.type === "username") {
        if (document.activeElement.tagName !== "INPUT") // Only useful for input elements
            return ;

        let event = new KeyboardEvent("keydown", {
            key: "ArrowLeft",
        });

        document.activeElement.value = request.username;
       	document.activeElement.dispatchEvent(event);
    } else if (request.type === "password") {
        if (document.activeElement.tagName !== "INPUT") // Only useful for input elements
            return ;

        let event = new KeyboardEvent("keydown", {
            key: "ArrowLeft",
        });
        if (document.activeElement.type !== "password") {
            if (confirm(browser.i18n.getMessage("confirmNotPassField"))) {
                document.activeElement.value = request.password;
            }
        } else {
            document.activeElement.value = request.password;
        }
       	document.activeElement.dispatchEvent(event);
    }
});

