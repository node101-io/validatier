import winston from "winston";
import { listenForEvents } from "../listeners/listenForEvents.js";
import Chain, { ChainInterface } from "../models/Chain/Chain.js";
import { sendTelegramMessage } from "./sendTelegramMessage.js";

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.cli(),
  transports: [new winston.transports.Console()],
});

const MILISECONDS_TO_WAIT_FOR_RESTART = 1000 * 60 * 60 * 6;

export const processBlocks = (start: number, end: number, chain: ChainInterface) => {
  let bottom_block_height = start;
  const max_block_height = end;
  const interval = 100;

  const startTime = Date.now();

  function listenInterval (bottom_block_height: number, top_block_height: number) {
    if (bottom_block_height > max_block_height) {
      logger.info(`\n\nALL BLOCKES PROCESSED | ${(Date.now() - startTime) / 1000}s \n Restarting in ${MILISECONDS_TO_WAIT_FOR_RESTART / (1000 * 60 * 60)} hours`)
      
      return setTimeout(() => {
        Chain.findChainByIdentifier({ chain_identifier: chain.name }, (err, chain) => {
          if (err || !chain) throw new Error(`bad_request`);
          processBlocks(end, chain.last_available_block_height, chain);
        })
      }, MILISECONDS_TO_WAIT_FOR_RESTART);
    };

    const top = Math.min(top_block_height, max_block_height);

    logger.info(`${chain.name.toUpperCase()} | Processing blocks from ${bottom_block_height} to ${top}`);
    
    listenForEvents(bottom_block_height, top, chain, (err, result) => {
      if (err || !result.success) {
        const message = `Error: ${err} \nprocessing from block height ${bottom_block_height} to ${top} | ${chain.name}`;
        sendTelegramMessage(message, (err, success) => {
          return logger.error(message);
        })
      };

      const logMessages = [];

      if (result.inserted_validator_addresses && result.inserted_validator_addresses.length) 
        logMessages.push(`${chain.name.toUpperCase()} | CREATED | Validators with addresses: ${result.inserted_validator_addresses}`);
      if (result.updated_validator_addresses && result.updated_validator_addresses.length) 
        logMessages.push(`${chain.name.toUpperCase()} | UPDATED | Validators with addresses: ${result.updated_validator_addresses}`);
      if (result.saved_composite_event_block_heights && result.saved_composite_event_block_heights.length)
        logMessages.push(`${chain.name.toUpperCase()} | SAVED | Composite Event Blocks in these block heights: ${result.saved_composite_event_block_heights}`);
      if (result.saved_active_validators && result.saved_active_validators.active_validators.length)
        logMessages.push(`${chain.name.toUpperCase()} | SAVED | Active Validator set for ${result.saved_active_validators.month}/${result.saved_active_validators.year}: ${result.saved_active_validators.active_validators.length} currently in active list`);
      if (logMessages.length === 0) 
        logMessages.push("No data saved.");
      
      logger.info(logMessages.join('\n'));

      logger.info(`Finished processing blocks ${bottom_block_height}-${top}\n\n`);

      if (result.new_active_set_last_updated_block_time)
        chain.active_set_last_updated_block_time = result.new_active_set_last_updated_block_time;

      return listenInterval(bottom_block_height + interval, top_block_height + interval); 
    });
  }

  listenInterval(bottom_block_height, bottom_block_height + interval);
};