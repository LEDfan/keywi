window.addEventListener("DOMContentLoaded", function(){
    var inputs = document.querySelectorAll("#options input");
    for (var input of inputs) {
        browser.storage.local.get(input.name).then(function(val){
            input.value = val[input.name] || "";
        });
        input.addEventListener("change", debounce(function() {
            var opt = {};
            opt[input.name] = input.value;
            browser.storage.local.set(opt);
        }, 1000));
    }

    readAndUpdateUserInfo();

    document.getElementById("btn-re-encrypt").addEventListener("click", function(){
        browser.runtime.sendMessage({"type": "re-encrypt_local_secure_storage"})
            .then(function() {
                readAndUpdateUserInfo();
            });
    });

    document.getElementById("btn-reset").addEventListener("click", function(){
        if (window.userInfoData !== null) {
            // when the secure storage is locked we can't show the id.
            alert("To completely disconnect keepass, you will have to remove the key with id \"" + window.userInfoData["Keepass database id"] + "\" in Keepass!");
        }
        browser.runtime.sendMessage({"type": "reset"})
            .then(function() {
                readAndUpdateUserInfo();
            });
    });
});

window.userInfoData = null;

function readAndUpdateUserInfo() {
    browser.runtime.sendMessage({
        "type": "options_user_info"
    }).then(function(data) {
        window.userInfoData = data;
        let table = document.getElementById("user_info");
        const length = table.rows.length;
        for (let i = 0; i < length; i++) {
            table.deleteRow(0);
        }
        for (let key of Object.keys(data)) {
            var row = table.insertRow(table.rows.length);
            row.insertCell(0).innerText = key;
            row.insertCell(1).innerText = data[key];
        }
    });

}
