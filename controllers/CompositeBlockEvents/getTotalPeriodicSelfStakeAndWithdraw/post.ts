
import { Request, Response } from 'express';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';

export default (req: Request, res: Response) => {

  const { operator_address, bottom_block_height, top_block_height } = req.body;

  CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw(
    {
      operator_address: operator_address.toLowerCase().trim(),
      bottomBlockHeight: bottom_block_height,
      topBlockHeight: top_block_height
    },
    (err, totalPeriodicSelfStakeAndWithdraw) => {
      if (err) return res.json({ success: false, err: err });
      return res.json({ success: true, data: totalPeriodicSelfStakeAndWithdraw });
    }
  )
}
