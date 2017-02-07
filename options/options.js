window.addEventListener("load", function(){
    var inputs = document.querySelectorAll("#options input");
    for (var input of inputs) {
        storage.local.get(input.name).then(function(val){
            input.value = val;
        });
        input.addEventListener("input", function() {
            var opt = {};
            opt[input.name] = input.value;
            storage.local.set(opt);
            console.log(opt.toSource());
        });
    }
});
