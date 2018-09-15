class Dialog {

  constructor(url) {
    this.url = browser.extension.getURL(url);
    this.window = null;
  }

  open() {
    let self = this;
    this.resolve = null;
    this.reject = null;

    return new Promise((resolve, reject) => {
      self.resolve = resolve;
      self.reject = reject;

      browser.windows.create({
        'type': 'panel',
        'width': 400,
        'height': 600,
        'url': this.url,
        // 'incognito': true
      }).then(function(newWindow) {
        self.window = newWindow;
        self.onOpen();
        browser.runtime.onMessage.addListener(self.onMessage.bind(self));
        browser.windows.onRemoved.addListener(removedWindowId => {
          if (self.window.id === removedWindowId) {
            self.onClosed();
          }
        });
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
