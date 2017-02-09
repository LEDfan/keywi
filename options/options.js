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
    document.getElementById("btn-re-encrypt").addEventListener("click", function(){
        browser.runtime.sendMessage({"type": "re-encrypt_local_secure_storage"});
    });
});

