import WebSocket from "ws";
import async from "async";
import { convertOperationAddressToBech32 } from "./convertOperationAddressToBech32.js";

const WEBSOCKET_URL = "wss://cosmoshub.tendermintrpc.lava.build/websocket";

import axios from "axios";
import StakeRecordEvent from "../models/StakeRecord/StakeRecord.js";

interface GetTransactionInfoInterface {
    tx: {
        body: any,
        auth: any,
        signatures: string[]
    },
    tx_response: any
}

async function getTransactionInfo(txHash: string) {
    try {
        const tendermintRpcUrl = "https://rest.cosmos.directory/cosmoshub/cosmos/tx/v1beta1/txs/";

        const response = await axios.get(`${tendermintRpcUrl}/${txHash}`);
        const data: GetTransactionInfoInterface = response.data;

        return data;
    } catch (error) {}
}

export const listenEvents = () => {
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.on("open", () => {
        console.log("✅ Connected to WebSocket!");

        const subscribeMsg = {
            jsonrpc: "2.0",
            id: 1,
            method: "subscribe",
            params: {
                query: "tm.event='Tx'"
            }
        };
        ws.send(JSON.stringify(subscribeMsg));
        console.log("📩 Subscribed to new blocks");
    });

    ws.on("message", async (data) => {
        const events = JSON.parse(data.toString()).result.events;
        if (events && events["message.module"] && events["message.action"]) {
            if (events["tx.hash"][0]) {

                const txRawResult = await getTransactionInfo(events["tx.hash"][0])
                if (!txRawResult) return;
                const txResult = txRawResult.tx.body;
                
                if (txResult && txResult.messages) {
                    async.timesSeries(txResult.messages.length, (i, next) => {
                        const eachMessage = txResult.messages[i];
                        convertOperationAddressToBech32(eachMessage["validator_address"], (err, bech32ValidatorAddress) => {
                            if (err) return next();

                            if (eachMessage["@type"] == "/cosmos.staking.v1beta1.MsgDelegate" && eachMessage["validator_address"]) {

                                if (eachMessage["delegator_address"] == bech32ValidatorAddress) {
                                    StakeRecordEvent.saveStakeRecordEvent({
                                        operator_address: eachMessage["validator_address"],
                                        denom: eachMessage["amount"]["denom"],
                                        amount: eachMessage["amount"]["amount"],
                                    }, (err, newStakeRecordEvent) => {
                                        if (err) return console.log(err + " | " + new Date());
                                        return next();
                                    })
                                }
                            } else if (eachMessage["@type"] == "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission") {
                                
                                console.log(eachMessage)
                            }
                            next();
                        })
                    })
                }
            }
        }
    });

    ws.on("error", (err) => {
        console.error("⚠️ WebSocket error:", err);
    });

    ws.on("close", () => {
        console.warn("❌ WebSocket closed. Reconnecting...");
        setTimeout(listenEvents, 5000);
    });
};

