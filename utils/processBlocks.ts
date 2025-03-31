import { listenForEvents } from "../listeners/listenForEvents.js";

export const processBlocks = (start: number, end: number, chain_identifier: string) => {
  let bottom_block_height = start;
  const max_block_height = end;
  const interval = 100;

  const startTime = Date.now();

  function listenInterval (bottom_block_height: number, top_block_height: number) {
    if (bottom_block_height > max_block_height) return console.log(`ALL BLOCKES PROCESSED | ${(Date.now() - startTime) / 1000}s \n`);

    const top = Math.min(top_block_height, max_block_height);

    console.log(`Processing blocks from ${bottom_block_height} to ${top} | ${chain_identifier.toUpperCase()}`);
    
    listenForEvents(bottom_block_height, top, chain_identifier, (err, success) => {
      if (err || !success) throw new Error(`Error processing blocks ${bottom_block_height}-${top}: ${err}`);
      
      console.log(`Finished processing blocks ${bottom_block_height}-${top}`);
      return listenInterval(bottom_block_height + interval, top_block_height + interval); 
    });
  }

  listenInterval(bottom_block_height, bottom_block_height + interval);
};