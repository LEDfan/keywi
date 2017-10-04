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
 * Some websites use the <input type="email"> or <input type="tel"> as input field for the input/username. This isn't recognized
 * as contenteditable for the context menu. This script make all these input fields contentEditable.
 * @see background/contextmenu.js
 */
function fixContentEditable() {
  const inputEls = document.querySelectorAll('input[type=email], input[type=tel]');
  for (const el of inputEls) {
    el.contentEditable = 'true';
  }
}

fixContentEditable();

/**
 * Some websites dynamically add elements to the DOM.
 */
document.addEventListener("contextmenu", fixContentEditable, true);


/**
 * Some websites are using a custom placeholder instead of the HTML5 placeholder attribute. They dot his by creating a
 * overlapping div on the input field. To fix this we remove the click events from the overlapping input fields.
 */
(function() {
  let inputElements = document.getElementsByTagName('INPUT');
  for (let inputEl of inputElements) {
    if (inputEl.type !== "hidden" && inputEl.type !== "submit" && inputEl.type !== "button") {
      let pos = inputEl.getBoundingClientRect();
      // noticed that sometimes the overlapping element is a little below the actual input field
      // so make sure we are actually above an overlapping element
      let posX = pos.x + pos.width / 2;
      let posY = pos.y + pos.height / 2;
      let topElUnderInput = document.elementFromPoint(posX, posY);
      if (topElUnderInput.tagName !== 'INPUT') {
        // the top most element at the position of the input field isn't the input field itself ...
        while (topElUnderInput.tagName !== 'INPUT') {
          // ... remove click events from it and continue until we reached the input event
          // by setting pointer-events to none, the elementFromPoint call which change to the next underlying element
          // see https://stackoverflow.com/questions/14176988/why-is-document-elementfrompoint-affected-by-pointer-events-none
          topElUnderInput.style['pointer-events'] = "none";
          topElUnderInput = document.elementFromPoint(posX, posY);
        }
      }
    }
  }
}());
