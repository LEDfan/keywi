class Dialog {

  constructor(url) {
    this.url = browser.extension.getURL(url);
    this.window = null;
    this.resolve = null;
    this.reject = null;
  }

  open(data = null) {
    const self = this;

    return new Promise((resolve, reject) => {
      self.resolve = resolve;
      self.reject = reject;

      browser.windows.create({
        'type': 'panel',
        'width': 400,
        'height': 600,
        'url': this.url,
        'incognito': true
      }).then(function(newWindow) {
        self.window = newWindow;
        self.onOpen();
        browser.runtime.onMessage.addListener(self.onMessage.bind(self));
        browser.windows.onRemoved.addListener(removedWindowId => {
          if (self.window.id === removedWindowId) {
            self.onClosed();
          }
        });

        // send data if needed
        if (data !== null) {
          browser.tabs.query({'windowId': self.window.id}).then(tabs => {
            const openedTabId = tabs[0].id;
            browser.tabs.onUpdated.addListener(function _updateFunc(tabId, changeInfo, tabInfo) {
              if (tabId === openedTabId && tabInfo.status === 'complete') {
                setTimeout(function() {
                  browser.tabs.sendMessage(openedTabId, data);
                  browser.tabs.onUpdated.removeListener(_updateFunc);
                }, 300);
              }
            });
          });
        }
      });
    });
  }

  onOpen() {
  }

  onClosed() {

  }

  onClosedByUser() {

  }

  onMessage(request, sender, sendResponse) {
  }

  close() {
    browser.runtime.onMessage.removeListener(this.onMessage);
    browser.windows.onRemoved.removeListener(this.onClosed);
    browser.windows.remove(this.window.id);
  }

}
