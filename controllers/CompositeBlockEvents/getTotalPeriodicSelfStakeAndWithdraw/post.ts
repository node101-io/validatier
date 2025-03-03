
import { Request, Response } from 'express';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';

export default (req: Request, res: Response) => {

  const { operator_address, bottom_block_height, top_block_height, bottom_timestamp, top_timestamp, search_by } = req.body;

  CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw(
    {
      operator_address: operator_address.toLowerCase().trim(),
      bottomBlockHeight: bottom_block_height,
      topBlockHeight: top_block_height,
      bottomTimestamp: bottom_timestamp,
      topTimestamp: top_timestamp,
      searchBy: search_by 
    },
    (err, totalPeriodicSelfStakeAndWithdraw) => {
      if (err) return res.json({ success: false, err: err });
      return res.json({ success: true, data: totalPeriodicSelfStakeAndWithdraw });
    }
  )
}
