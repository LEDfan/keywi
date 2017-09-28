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
