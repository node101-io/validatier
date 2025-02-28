import WebSocket from "ws";
import async from "async";
import axios from "axios";
import StakeRecordEvent from "../models/StakeRecord/StakeRecord.js";
import WithdrawRecordEvent from "../models/WithdrawRecord/WithdrawRecord.js";
import { convertOperationAddressToBech32 } from "./convertOperationAddressToBech32.js";
import { getOnlyNativeTokenValueFromCommissionOrRewardEvent } from "./getRewardOrCommissionArraysFromEvent.js";
import { getSpecificAttributeOfAnEventFromTxEventsArray } from "./getSpecificAttributeOfAnEventFromTxEventsArray.js";

const WEBSOCKET_URL = "wss://cosmoshub.tendermintrpc.lava.build/websocket";

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
        console.log("📩 Subscribed to events:\n - MsgDelegate \n - MsgWithdrawDelegatorRewards \n - MsgWithdrawValidatorCommission");
    });

    ws.on("message", async (data) => {
        const events = JSON.parse(data.toString()).result.events;
        if (events && events["message.module"] && events["message.action"]) {
            if (events["tx.hash"][0]) {

                const txRawResult = await getTransactionInfo(events["tx.hash"][0])
                if (!txRawResult) return;
                const txResult = txRawResult.tx.body;
                
                if (txResult && txResult.messages) {
                    for (let i = 0; i < txResult.messages.length; i++) {
                        const eachMessage = txResult.messages[i];

                        convertOperationAddressToBech32(eachMessage["validator_address"], (err, bech32ValidatorAddress) => {
                            if (err) return;

                            const events = txRawResult.tx_response.events;

                            if (eachMessage["@type"] == "/cosmos.staking.v1beta1.MsgDelegate" && eachMessage["validator_address"] && eachMessage["delegator_address"] == bech32ValidatorAddress) {
                                StakeRecordEvent.saveStakeRecordEvent({
                                    operator_address: eachMessage["validator_address"],
                                    denom: eachMessage["amount"]["denom"],
                                    amount: eachMessage["amount"]["amount"],
                                    txHash: events["tx.hash"][0]
                                }, (err, newStakeRecordEvent) => {
                                    if (err) return console.log(err + " | " + new Date());
                                    console.log("Stake event saved for validator: " + newStakeRecordEvent.operator_address + " | " + new Date());
                                    return;
                                })
                            }
                            
                            else if (eachMessage["@type"] == "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission") {

                                getSpecificAttributeOfAnEventFromTxEventsArray(events, "withdraw_commission", "amount", (err, specificAttributeValue) => {
                                    if (err || !specificAttributeValue) return console.log(err + " | " + new Date());

                                    getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, (err, nativeRewardOrCommissionValue) => {
                                        if (err || !nativeRewardOrCommissionValue) return console.log(err + " | " + new Date())
                                        WithdrawRecordEvent.saveWithdrawRecordEvent({
                                            operator_address: eachMessage["validator_address"],
                                            withdrawType: "commission",
                                            denom: "uatom",
                                            amount: nativeRewardOrCommissionValue,
                                            txHash: events["tx.hash"][0]
                                        }, (err, newWithdrawRecordEvent) => {
                                            if (err) return console.log(err + " | " + new Date());
                                            console.log("Commission withdraw event saved for validator: " + newWithdrawRecordEvent.operator_address + " | " + new Date());
                                            return;
                                        })
                                    })
                                })
                                
                            }
                            
                            else if (eachMessage["@type"] == "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward" && eachMessage["delegator_address"] == bech32ValidatorAddress) {
                                
                                getSpecificAttributeOfAnEventFromTxEventsArray(events, "withdraw_rewards", "amount", (err, specificAttributeValue) => {
                                    if (err || !specificAttributeValue) return console.log(err + " | " + new Date());

                                    getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, (err, nativeRewardOrCommissionValue) => {
                                        if (err || !nativeRewardOrCommissionValue) return console.log(err + " | " + new Date());

                                        WithdrawRecordEvent.saveWithdrawRecordEvent({
                                            operator_address: eachMessage["validator_address"],
                                            withdrawType: "reward",
                                            denom: "uatom",
                                            amount: nativeRewardOrCommissionValue,
                                            txHash: events["tx.hash"][0]
                                        }, (err, newWithdrawRecordEvent) => {
                                            if (err) return console.log(err + " | " + new Date());
                                            console.log("Reward withdraw event saved for validator: " + newWithdrawRecordEvent.operator_address + " | " + new Date());
                                            return;
                                        })
                                    })
                                })
                                
                            } else return;
                        })
                    }
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
