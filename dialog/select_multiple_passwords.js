window.addEventListener("DOMContentLoaded", function(){
    browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.type === "select_mul_pass_data") {
            const length = request.data.possibleCredentials.length;
            let html = "";

            for (let i = 0; i < length; i++) {
                html += generateButtonRow(i, request.data.possibleCredentials[i].Name, request.data.possibleCredentials[i].Login);
            }

            document.getElementById("passwords").innerHTML = html;
            let els = document.getElementsByClassName("password-choose-btn");

            for (let el of els) {
                el.addEventListener("click", function() {
                    browser.runtime.sendMessage({
                        type: "select_mul_pass_user_input",
                        data: {
                            selected: this.dataset.index
                        }
                    });
                }, false);
            }
        }
    });
});

let generateButtonRow =  function(index, name, login) {
    return `
    <div class="password-container">
            <button data-index="${index}" class="password-choose-btn">${login} (${name})</button>
         </div>
    </div>
`;
};

document.getElementById("cancel").onclick = function() {
    browser.runtime.sendMessage({
        type: "select_mul_pass_cancel",
        data: {}
    });
};
