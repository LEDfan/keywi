window.browserName = null;

async function _setBrowserName() {
  if (typeof browser.runtime.getBrowserInfo === 'undefined') {
    window.browserName = "Chrome";
  } else {
    let info = await browser.runtime.getBrowserInfo();
    window.browserName = info.name;
  }
}

async function isChrome() {
  if (window.browserName == null) {
    await _setBrowserName();
  }
  return window.browserName === "Chrome";
}

async function isFirefox() {
  if (window.browserName == null) {
    await _setBrowserName();
  }
  return window.browserName === "Firefox";
}

