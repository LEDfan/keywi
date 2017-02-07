window.addEventListener("load", function(){
    var inputs = document.querySelectorAll("#options input");
    for (var input of inputs) {
        browser.storage.local.get(input.name).then(function(val){
            input.value = val[input.name] || "";
        });
        input.addEventListener("change", function() {
            var opt = {};
            opt[input.name] = input.value;
            browser.storage.local.set(opt);
        });
    }
});
