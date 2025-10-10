export async function notifyBrowser(title: string, body: string){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'granted'){
    new Notification(title, { body });
    return;
  }
  if(Notification.permission === 'default'){
    const res = await Notification.requestPermission();
    if(res==='granted') new Notification(title, { body });
  }
}
