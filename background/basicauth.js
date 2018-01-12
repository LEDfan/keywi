browser.webRequest.onAuthRequired.addListener(function(details) {
  if (details.isProxy) {
    // Don't do proxy's, at least for now
    return;
  }
  // TODO: confirm dialog with
  //   - details.realm if available
  //   - details.host or details.url
  //  This will also prevent invalid password infinite loops, since the user gets queried every time
  return new Promise(function(resolve, reject) {
    Keepass.getLogins(details.url, function(entry) {
      resolve({'authCredentials': {'username': entry.Login, 'password': entry.Password}});
    }, function() {
      resolve({});
    });
  });
}, {'urls': ['<all_urls>']}, ['blocking']);
