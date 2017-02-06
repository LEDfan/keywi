browser.contextMenus.create({
    id: "username-and-password",
    title: "Fill username and password",
    contexts: ["editable"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId == "username-and-password") {
        chrome.tabs.executeScript(tab.id, {file: "content_scripts/fill-username-and-password.js"})
    }
});
