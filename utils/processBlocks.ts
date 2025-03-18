import { listenForEvents } from "../listeners/listenForEvents.js";

export const processBlocks = async (start: number, end: number, chain_identifier: string) => {
  let bottom_block_height = start;
  const max_block_height = end;
  const interval = 64;

  const startTime = Date.now();

  while (bottom_block_height < max_block_height) {
    const top_block_height = Math.min(bottom_block_height + interval, max_block_height);

    console.log(`Processing blocks from ${bottom_block_height} to ${top_block_height}`);

    await new Promise<void>((resolve) => {
      listenForEvents(bottom_block_height, top_block_height, chain_identifier, (err, success) => {
        if (err) {
          console.error(`Error processing blocks ${bottom_block_height}-${top_block_height}:`, err);
        } else {
          console.log(`Finished processing blocks ${bottom_block_height}-${top_block_height}`);
        }
        resolve();
      });
    });

    bottom_block_height += interval;
  }

  console.log(`ALL BLOCKES PROCESSED | ${(Date.now() - startTime) / 1000}s`);
};