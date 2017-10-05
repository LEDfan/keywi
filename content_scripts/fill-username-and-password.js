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
function searchForPasswordInput (userInput) {
  let parent = userInput;
  while (true) {
    parent = parent.parentElement;

    const passwordField = parent.querySelector('input[type=\'password\']');
    if (passwordField !== null) {
      return passwordField;
    }
    if (parent.tagName === 'BODY' || parent.tagName === 'FORM') {
      return null;
    }
  }
}

function searchForActiveInput () {
  if (document.activeElement.tagName === 'INPUT') {
    return document.activeElement;
  }

  let elementsUnderMouse = document.elementsFromPoint(window.right_click_pos_x, window.right_click_pos_y);

  for (let el of elementsUnderMouse) {
    if (el.tagName === 'INPUT') {
      return el;
    }
  }

  return null;
}

function saveRightClickLocation(event) {
  window.right_click_pos_x = event.clientX;
  window.right_click_pos_y = event.clientY;
}

document.addEventListener("contextmenu", saveRightClickLocation, true);

function writeValueToInputElement(element, value) {
  element.value = value;

  /**
   * Some website use a custom made placeholder using <label>'s. This placeholder is removed by JS when the user
   * enters something in the input field. However since we change the value of the input field using JS this event
   * isn't triggered. Therefore we simulate a key press.
   * See e.g. dropbox.com
   */
  const event = new KeyboardEvent('keydown', {'key': 'ArrowLeft'});

  /**
   * Some websites use a JS framework like React which interact with the input field in a different matter than plain
   * HTML. Therefore after filling we send the 'input' event to the input field so these frameworks now the contents
   * of the input field has changed.
   */
  const inputEvent = new Event('input', {
    'bubbles': true,
    'cancelable': true
  });
  element.dispatchEvent(event);
  element.dispatchEvent(inputEvent);
}

browser.runtime.onMessage.addListener(function _func (request, sender, sendResponse) {
  const activeField = searchForActiveInput();
  if (activeField === null) {
    browser.runtime.sendMessage({'type': 'no-username-field-found'});
    return;
  }
  const passwordField = searchForPasswordInput(activeField);

  if (request.type === 'username-and-password') {
    writeValueToInputElement(activeField, request.username);

    if (passwordField === null && !request.suppress_error_on_missing_pw_field) {
      browser.runtime.sendMessage({'type': 'no-password-field-found'});
    } else if (passwordField !== null) {
      writeValueToInputElement(passwordField, request.password);
    }
  } else if (request.type === 'username') {
    writeValueToInputElement(activeField, request.username);
  } else if (request.type === 'password') {
    if (activeField.type !== 'password') {
      if (confirm(browser.i18n.getMessage('confirmNotPassField'))) {
        writeValueToInputElement(activeField, request.password);
      }
    } else {
      writeValueToInputElement(activeField, request.password);
    }
  }
});

