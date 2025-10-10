self.addEventListener('push', event => {
  if(!event.data){ return; }
  const data = event.data.json();
  const title = data.title || 'SapHari Alert';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.svg',
    badge: '/icons/badge-72.svg',
    tag: data.tag || 'saphari-alert',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window'}).then(winList=>{
    for(const c of winList){
      if('focus' in c){ c.focus(); return; }
    }
    if(clients.openWindow){ return clients.openWindow('/'); }
  }));
});
