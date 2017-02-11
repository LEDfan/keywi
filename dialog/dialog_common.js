document.addEventListener("keyup", function(ev) {
    if (ev.key == "Escape" || ev.key == "Cancel") {
        document.getElementById("cancel").click();
    }
});
