import { Server } from "socket.io"
import CompositeEventBlock from "../../../models/CompositeEventBlock/CompositeEventBlock.js"

export const handleSocketIoConnection = (io: Server) => {

  io.on('connection', socket => {
    socket.on('getTotalPeriodicSelfStakeAndWithdraw', (data) => {
      
      const { operator_address, bottom_timestamp, top_timestamp, decimals } = data;

      if (typeof bottom_timestamp != 'number' || typeof top_timestamp != 'number' || typeof operator_address != 'string') return socket.emit('error', { err: 'format_error', success: false });

      const operatorAddress: string = operator_address;
      const bottomTimestamp: number = bottom_timestamp;
      const topTimestamp: number = top_timestamp;

      CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw({
        operator_address: operatorAddress,
        bottomTimestamp: bottomTimestamp,
        topTimestamp: topTimestamp,
        searchBy: 'timestamp'
      }, (err, totalPeriodicSelfStakeAndWithdraw) => {
        if (err || !totalPeriodicSelfStakeAndWithdraw) return socket.emit('error', { err: 'bad_request', success: false });
        
        const ratio = (totalPeriodicSelfStakeAndWithdraw?.self_stake ? (totalPeriodicSelfStakeAndWithdraw?.self_stake) : 0) / (totalPeriodicSelfStakeAndWithdraw?.withdraw ? totalPeriodicSelfStakeAndWithdraw?.withdraw : (10 ** decimals));
        const sold = (totalPeriodicSelfStakeAndWithdraw?.withdraw ? totalPeriodicSelfStakeAndWithdraw?.withdraw : 0) - (totalPeriodicSelfStakeAndWithdraw?.self_stake ? totalPeriodicSelfStakeAndWithdraw?.self_stake : 0);

        return socket.emit('response', { success: true, data: {
          self_stake: totalPeriodicSelfStakeAndWithdraw.self_stake,
          withdraw: totalPeriodicSelfStakeAndWithdraw.withdraw,
          ratio: ratio,
          sold: sold,
          timestamp: topTimestamp
        } });
      })
    })
  })
}