import WebSocket from "ws";

const WEBSOCKET_URL = "wss://cosmos-rpc.publicnode.com:443/websocket";

export const listenEvents = async function() {
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.on("open", () => {
        console.log("Connected to WebSocket");
        const subscribeMsg = {
            jsonrpc: "2.0",
            method: "subscribe",
            id: 0,
            params: { query: "tm.event='Tx'" }
        };
        ws.send(JSON.stringify(subscribeMsg));
    });

    ws.on("message", (data) => {
      const responseJson = JSON.parse(data.toString());
      console.log(responseJson)  
    });

    ws.on("error", (err) => {
        console.error("WebSocket error:", err);
    });

    ws.on("close", () => {
        console.log("WebSocket connection closed, reconnecting...");
        setTimeout(listenEvents, 5000);
    });
}
