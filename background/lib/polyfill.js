window.browserName = null;
window.firefoxVersion = null;

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

async function getFirefoxVersion() {
  if (window.firefoxVersion == null) {
    let info = await browser.runtime.getBrowserInfo();
    window.firefoxVersion = Number.parseInt(info.version.split('.')[0], 10);
  }
  return window.firefoxVersion;
}

async function addOnAuthRequiredListener(outerCb) {
  if (typeof browser.webRequest.onAuthRequired == 'undefined') {
    return;
  }

  if (await isChrome()) {

    browser.webRequest.onAuthRequired.addListener(function(details, innerCb) {
      outerCb(details).then(innerCb);
    }, {'urls': ['<all_urls>']}, ['asyncBlocking']);

  } else if (await isFirefox()) {

    browser.webRequest.onAuthRequired.addListener(function(details) {
      return outerCb(details);
    }, {'urls': ['<all_urls>']}, ['blocking']);

  }
}

