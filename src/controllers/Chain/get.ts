import { Request, Response } from 'express';
import Chain from "../../models/Chain/Chain.js"
 
const chainGetController = (req: Request, res: Response): void => {

  Chain.findChainByIdentifier({ chain_identifier: 'cosmoshub' }, (err, chain) => {
    if (err || !chain) return res.send({ success: false, err: err });
    return res.send({ 
      success: true,
      data: {
        chain_identifier: chain.name,
        initial_block_height: chain.first_available_block_height,
        last_visited_block_height: chain.last_visited_block,
        last_visited_block_time: chain.last_visited_block_time,
        final_block_height: chain.last_available_block_height,
      }
     })
  })
}


export default chainGetController;