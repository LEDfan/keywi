/**
 * Abstract base class for implementing a dialog.
 * Use this class by extending it and overwriting the necessary methods.
 * @method resolve Resolves the promise returned by open
 * @method reject Rejects the promise returned by open
 */
class Dialog {

  /**
   * Constructs the dialog, but doesn't open it yet.
   * Note that normal classes probably will open the dialog in the constructor.
   * @param url Location of the html file of the dialog
   */
  constructor(url) {
    this.url = browser.extension.getURL(url);
    this.window = null;
    this.resolve = null;
    this.reject = null;
    this.messageHandlers = {};
  }

  /**
   * Opens the dialog and returns a promise which should resolve when the dialog is processed by the user and rejected
   * if the dialog is cancelled by the user.
   *
   * When the dialog is opened {@see onOpen} will be called.
   * When the dialog is closed {@see onClosed} will be called.
   * @param data The initial data to send to the just opened dialog
   * @returns {Promise<any>}
   */
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

  /**
   * Automatically called when the dialog is opened.
   */
  onOpen() {
  }

  /**
   * Automatically called when the dialog is closed.
   */
  onClosed() {

  }

  /**
   * Called when a message is received from the dialog
   * `this` refers to the current instance of this class.
   * Can be overwritten in the extending class,
   * but preferred way is to use registerMessageHandler.
   * @see browser.runtime.onMessage.addListener()
   */
  onMessage(request, sender, sendResponse) {
    return this.messageHandlers[request.type](request, sender, sendResponse);
  }

  registerMessageHandler(type, method) {
    this.messageHandlers[type] = method.bind(this);
  }

  /**
   * Closes and cleanups the dialog.
   */
  close() {
    browser.runtime.onMessage.removeListener(this.onMessage);
    browser.windows.onRemoved.removeListener(this.onClosed);
    browser.windows.remove(this.window.id);
  }

}
