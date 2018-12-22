let browserName = null;

function isChrome() {
  return browserName === "Chrome";
}

function isFirefox() {
  return browserName === "Firefox";
}

async function _determineBrowser() {

  if (typeof browser.runtime.getBrowserInfo === 'undefined') {
    browserName = "Chrome";
  }

  let info = await browser.runtime.getBrowserInfo();
  browserName = info.name;

  return browserName;
}
