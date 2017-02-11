browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(request);
    if (request.type === "select_mul_pass_data") {
        let passwordsField = document.getElementById("passwords");
        const length = request.data.possibleCredentials.length;
        for (let i = 0; i < length; i++) {
            passwordsField.options.add(new Option(request.data.possibleCredentials[i].Login, i, false, false));
        }
    }
});

let submit = function() {
    let passwordsField = document.getElementById("passwords");
    let selected = passwordsField.selectedIndex;
    if (selected === -1) {
        alert("Please select a credential");
    } else {
        browser.runtime.sendMessage({
            type: "select_mul_pass_user_input",
            data: {
                selected: selected
            }
        });
    }
}

document.forms[0].onsubmit = function(e) {
    e.preventDefault(); // Prevent submission
    submit();
};

document.getElementById('passwords').ondblclick = function(){
    submit();
};

document.getElementById("cancel").onclick = function() {
    browser.runtime.sendMessage({
        type: "select_mul_pass_cancel",
        data: {}
    });
};
