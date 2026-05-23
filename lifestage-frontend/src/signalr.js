// src/signalr.js
// SignalR connection manager for LifeStage real-time notifications

import * as signalR from "@microsoft/signalr";

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://lifestage-cbfgh8b6ercddmd6.canadacentral-01.azurewebsites.net";
const HUB_URL = `${BACKEND_URL}/hubs/notifications`;

// When using Azure SignalR Service, negotiate redirects the client to Azure's
// endpoint directly. LongPolling must be used so all traffic stays in-proxy.
// If NOT using Azure SignalR Service (self-hosted), remove this override.
const TRANSPORT = signalR.HttpTransportType.LongPolling;

let connection = null;

function buildConnection(token) {
  return new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => token,
      transport: TRANSPORT,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}

export async function startSignalR(token, onNotification, onStatusChange) {
  if (connection) await stopSignalR();

  connection = buildConnection(token);

  connection.on("ReceiveNotification", (payload) => {
    if (onNotification) onNotification(payload);
  });

  connection.onreconnecting(() => onStatusChange?.("reconnecting"));
  connection.onreconnected(() => onStatusChange?.("connected"));
  connection.onclose(() => onStatusChange?.("disconnected"));

  try {
    await connection.start();
    onStatusChange?.("connected");
    console.log("[SignalR] Connected ✓");
  } catch (err) {
    console.warn("[SignalR] Connection failed:", err.message);
    onStatusChange?.("disconnected");
  }
}

export async function stopSignalR() {
  if (connection) {
    try { await connection.stop(); } catch {}
    connection = null;
  }
}

export function getSignalRState() {
  if (!connection) return "disconnected";
  switch (connection.state) {
    case signalR.HubConnectionState.Connected:    return "connected";
    case signalR.HubConnectionState.Connecting:   return "connecting";
    case signalR.HubConnectionState.Reconnecting: return "reconnecting";
    default: return "disconnected";
  }
}
