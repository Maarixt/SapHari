import { useEffect, useState } from "react";
import mqtt, { MqttClient } from "mqtt";

interface Alert {
  label: string;
  addr: string;
  pin: number;
  trigger: number; // 1 = HIGH, 0 = LOW
  message: string;
  email?: string;
}

interface Device {
  id: string;
  key: string;
  name: string;
  widgets: {
    alerts: Alert[];
  };
  state: { online: boolean };
  messages: string[];
}

const defaultBroker = {
  url: "wss://broker.emqx.io:8084/mqtt",
  user: "",
  pass: "",
};

const Dashboard = () => {
  const [broker] = useState(() => {
    const stored = localStorage.getItem("sh_broker");
    return stored ? JSON.parse(stored) : defaultBroker;
  });
  const [devices, setDevices] = useState<Device[]>(() =>
    JSON.parse(localStorage.getItem("sh_devices") || "[]").map((d: any) => ({
      ...d,
      widgets: {
        alerts: d.widgets?.alerts || [],
      },
      messages: d.messages || [],
    }))
  );
  const [current, setCurrent] = useState<number | null>(null);
  const [conn, setConn] = useState("disconnected");
  const [client, setClient] = useState<MqttClient | null>(null);

  useEffect(() => {
    const c = mqtt.connect(broker.url, {
      username: broker.user || undefined,
      password: broker.pass || undefined,
      reconnectPeriod: 2000,
    });
    setClient(c);
    c.on("connect", () => {
      setConn("connected");
      c.subscribe("saphari/+/sensor/#");
      c.subscribe("saphari/+/status/#");
      c.subscribe("saphari/+/alert/#");
    });
    c.on("reconnect", () => setConn("reconnecting"));
    c.on("close", () => setConn("disconnected"));
    c.on("error", () => setConn("error"));
    c.on("message", handleMessage);
    return () => {
      c.end(true);
    };
  }, [broker]);

  function save(devs: Device[]) {
    setDevices(devs);
    localStorage.setItem("sh_devices", JSON.stringify(devs));
  }

  function addDevice() {
    const id = prompt("Device ID:");
    if (!id) return;
    const key = prompt("Device Key:") || "";
    const name = prompt("Device name:", id) || id;
    const dev: Device = {
      id,
      key,
      name,
      widgets: { alerts: [] },
      state: { online: false },
      messages: [],
    };
    const devs = [...devices, dev];
    save(devs);
  }

  function openDevice(i: number) {
    setCurrent(i);
  }

  function closeDevice() {
    setCurrent(null);
  }

  function addAlert(devIdx: number) {
    const pin = parseInt(prompt("Enter GPIO pin for this alert:") || "0");
    if (!pin) return;
    const trigger = prompt("Trigger condition? (HIGH/LOW)", "HIGH");
    if (!trigger) return;
    const message = prompt("What should the message say?", "Alert!") || "Alert!";
    const email = prompt("Send alert to email (leave blank to use account email):", "") || "";
    const devs = [...devices];
    const dev = devs[devIdx];
    const addr = "A" + (dev.widgets.alerts.length + 1);
    dev.widgets.alerts.push({
      label: "Alert",
      addr,
      pin,
      trigger: trigger.toUpperCase() === "HIGH" ? 1 : 0,
      message,
      email,
    });
    save(devs);
  }

  function delAlert(devIdx: number, aIdx: number) {
    const devs = [...devices];
    devs[devIdx].widgets.alerts.splice(aIdx, 1);
    save(devs);
  }

  function handleMessage(topic: string, payload: Buffer) {
    const msg = payload.toString();
    const parts = topic.split("/");
    if (parts.length < 4) return;
    const devId = parts[1];
    const cat = parts[2];
    const devIdx = devices.findIndex((d) => d.id === devId);
    if (devIdx === -1) return;
    const dev = devices[devIdx];
    if (cat === "sensor") {
      dev.widgets.alerts.forEach((a) => {
        if (String(a.trigger) === msg) {
          triggerAlert(devIdx, a, msg);
        }
      });
    } else if (cat === "alert") {
      dev.messages.unshift(msg);
      dev.messages = dev.messages.slice(0, 20);
    } else if (cat === "status" && parts[3] === "online") {
      dev.state.online = msg === "1";
    }
    const newDevs = [...devices];
    newDevs[devIdx] = { ...dev };
    save(newDevs);
  }

  function triggerAlert(devIdx: number, alert: Alert, value: string) {
    alertFn(`📢 [${devices[devIdx].name}] ${alert.message}`);
    const recipient = alert.email || "user@example.com";
    console.log(`Sending email to ${recipient}: ${alert.message}`);
    const devs = [...devices];
    devs[devIdx].messages.unshift(alert.message);
    devs[devIdx].messages = devs[devIdx].messages.slice(0, 20);
    save(devs);
  }

  function alertFn(msg: string) {
    window.alert(msg);
  }

  return (
    <>
      <style>{`
        .wrap{padding:16px}
        .flex{display:flex;gap:8px;align-items:center}
        .between{justify-content:space-between}
        .btn{background:#2563eb;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
        .btn.secondary{background:#374151}
        .btn.danger{background:#dc2626}
        .list{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
        .card{background:#161a22;border:1px solid #242a36;border-radius:12px;padding:14px;min-width:240px}
        .tag{display:inline-block;background:#1f2533;border:1px solid #2f394d;padding:2px 6px;border-radius:999px;font-size:12px;margin-right:6px}
        .small{font-size:12px}
        .muted{color:#9aa4b2}
        .grid{display:flex;flex-wrap:wrap;gap:12px}
        header{padding:16px 20px;border-bottom:1px solid #222;display:flex;justify-content:space-between;align-items:center}
        body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#0f1115;color:#eaeef2;margin:0}
      `}</style>
      <div className="wrap">
      <header className="flex between" style={{ marginBottom: 16 }}>
        <h1>SapHari MQTT Dashboard</h1>
        <span className="tag">MQTT: {conn}</span>
      </header>
      {current === null ? (
        <div>
          <button className="btn" onClick={addDevice} style={{ marginBottom: 16 }}>
            ➕ Add Device
          </button>
          <div className="list">
            {devices.map((d, i) => (
              <div className="card" key={d.id}>
                <div className="flex between">
                  <div>
                    <div>
                      <b>{d.name}</b>
                    </div>
                    <div className="small muted">{d.id}</div>
                  </div>
                  <button className="btn" onClick={() => openDevice(i)}>
                    Open
                  </button>
                </div>
                <div className="row small">
                  <span className="tag">alerts: {d.widgets.alerts.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex between" style={{ marginBottom: 16 }}>
            <div className="flex" style={{ gap: 12, alignItems: "baseline" }}>
              <button className="btn secondary" onClick={closeDevice}>
                &larr; Back
              </button>
              <h2>{devices[current].name}</h2>
              <span className="tag">{devices[current].state.online ? "online" : "offline"}</span>
            </div>
            <div className="flex" style={{ gap: 8 }}>
              <button className="btn" onClick={() => addAlert(current!)}>
                ➕ Alert
              </button>
            </div>
          </div>
          <div className="grid" style={{ gap: 12 }}>
            {devices[current].widgets.alerts.map((a, idx) => (
              <div className="card" key={a.addr}>
                <div className="flex between">
                  <b>{a.label}</b>
                  <span className="tag">
                    {a.addr} · GPIO {a.pin} · {a.trigger ? "HIGH" : "LOW"}
                  </span>
                </div>
                <div className="small muted">Msg: {a.message}</div>
                <div className="flex" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn danger" onClick={() => delAlert(current!, idx)}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {devices[current].messages.length > 0 && (
              <div className="card" style={{ maxWidth: 300 }}>
                <div className="flex between">
                  <b>Messages</b>
                  <button
                    className="btn danger"
                    onClick={() => {
                      const devs = [...devices];
                      devs[current!].messages = [];
                      save(devs);
                    }}
                  >
                    Clear
                  </button>
                </div>
                <div className="small" style={{ maxHeight: 200, overflow: "auto" }}>
                  {devices[current].messages.map((m, i) => (
                    <div key={i}>{m}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Dashboard;
