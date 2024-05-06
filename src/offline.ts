// Detects if the user is offline or cannot reach the server
export async function isOffline() {
  if(navigator.onLine === false) {
    return true;
  }
  // When the server is down fetch will throw an error
  // Otherwise we don't really care about the response
  // Note that this will not work for a reverse proxy that returns a 503 status code
  // You'll need to check for that specifically and decide if it means anything to you
  return fetch('/api/health', {method: 'GET'})
    .then(() => false)
    .catch(() => true);
}

export function onNetworkStatusChange(callback: (isOffline: boolean) => void) {
  let lastOfflineStatus = true;
  const cb = (isOffline: boolean) => {
    if(isOffline === lastOfflineStatus) {
      return;
    }
    lastOfflineStatus = isOffline;
    callback(isOffline);
  }
  const setOnline = () => cb(false);
  const setOffline = () => cb(true);
  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOffline);
  isOffline().then(cb);
  const interval = setInterval(() => isOffline().then(cb), 1000);
  return () => {
    clearInterval(interval);
    window.removeEventListener('online', setOnline);
    window.removeEventListener('offline', setOffline);
  };
}

