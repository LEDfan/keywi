/**
 * Some websites use the <input type="email"> or <input type="tel"> as input field for the input/username. This isn't recognized
 * as contenteditable for the context menu. This script make all these input fields contentEditable.
 * @see background/contextmenu.js
 */
let inputEls = document.querySelectorAll("input[type=email], input[type=tel]");
for (let el of inputEls) {
    el.contentEditable = "true";
}
