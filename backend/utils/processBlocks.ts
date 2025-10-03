import winston from "winston";
import { listenForEvents } from "../listeners/listenForEvents.js";
import Chain, { ChainInterface } from "../models/Chain/Chain.js";
import { sendTelegramMessage } from "./sendTelegramMessage.js";
import { clearChainData } from "./levelDb.js";

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.cli(),
  transports: [new winston.transports.Console()],
});

const INTERVAL = 100;
const MILISECONDS_TO_WAIT_FOR_RESTART = 1000 * 60 * 60 * 6;

export const processBlocks = (start: number, end: number, chain: ChainInterface) => {
  let bottom_block_height = start;
  const max_block_height = end;

  const startTime = Date.now();

  function listenInterval (bottom_block_height: number, top_block_height: number, chain: ChainInterface) {
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
    
    listenForEvents({
      bottom_block_height: bottom_block_height,
      top_block_height: top,
      chain: chain
    }, (err, result) => {
      if (err || !result.success) {
        const message = `Error: ${err} \nprocessing from block height ${bottom_block_height} to ${top} | Stopped processing ${chain.name.toUpperCase()}`;
        return sendTelegramMessage(message, (err, success) => logger.error(message));
      };

      if (result.inserted_validator_addresses && result.inserted_validator_addresses.length) 
        logger.info(`${chain.name.toUpperCase()} | CREATED | Validators with addresses: ${result.inserted_validator_addresses.join('    ')}`);

      if (result.new_active_set_last_updated_block_time) {
        return clearChainData(chain.name, (err, success) => {
          if (err || !success) return sendTelegramMessage(`clear_chain_data_failed: ${err}`, (err, success) => logger.error(`clear_chain_data_failed: ${err}`));

          return Chain.findChainByIdentifier({ chain_identifier: chain.name }, (err, updatedChain) => {
            if (err || !updatedChain) throw new Error(`bad_request`);
            
            if (result.saved_active_validators && result.saved_active_validators.active_validators.length) {
              logger.info(`${chain.name.toUpperCase()} | SAVED | Active Validator set for ${result.saved_active_validators.month}/${result.saved_active_validators.year}: ${result.saved_active_validators.active_validators.length} currently in active list`);
              logger.info(`${chain.name.toUpperCase()} | SAVED | CompositeEventBlocks | for ${result.saved_composite_events_operator_addresses?.join('    ')}`);
              logger.info(`${chain.name.toUpperCase()} | Continuing from: ${bottom_block_height + INTERVAL}`);
            }
            
            return listenInterval(bottom_block_height + INTERVAL, top_block_height + INTERVAL, updatedChain); 
          })
        })
      }

      return listenInterval(bottom_block_height + INTERVAL, top_block_height + INTERVAL, chain); 
    });
  }

  listenInterval(bottom_block_height, bottom_block_height + INTERVAL, chain);
  logger.info(`${chain.name.toUpperCase()} | Started fetching from block_height: ${bottom_block_height}`);
};