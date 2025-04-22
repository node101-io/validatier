import { Level } from 'level';

const db = new Level<string, string>('db', { valueEncoding: 'utf8' });

interface CompositeEventDataInterface {
  chain_identifier: string;
  block_height: number;
  operator_address: string;
  denom: string;
  self_stake: number;
  reward: number;
  commission: number;
  total_stake: number;
  total_withdraw: number;
  timestamp: number;
}

export function initDB(callback: (err: string | null) => void) {
  db.open()
    .then(() => {
      callback(null);
    })
    .catch((err) => {
      callback(err);
    });
}
export function updateChainKeys(
  body: {
    chain_identifier: string,
    new_operator_address: string,
  },
  callback: (err: string | null, success: boolean) => void
) {
  const { chain_identifier, new_operator_address } = body;
  
  db.get(chain_identifier)
    .then((currentKeys) => {
      const currentKeysJSON = currentKeys ? JSON.parse(currentKeys) : [];

      if (!currentKeysJSON.includes(new_operator_address)) {
        currentKeysJSON.push(new_operator_address);
      }

      return db.put(chain_identifier, JSON.stringify(currentKeysJSON));
    })
    .then(() => callback(null, true))
    .catch((err) => callback(`Error: ${err.message}`, false));
}

export function bulkSave(
  body: {
    chain_identifier: string,
    saveMapping: Record<string, CompositeEventDataInterface>
  },
  callback: (err: string | null, success: boolean) => void
) {

  const { chain_identifier, saveMapping } = body;

  const batch = db.batch();
  const operatorAddresses = Object.keys(saveMapping);

  let counter = 0;
  function processNext() {
    if (counter >= operatorAddresses.length) {
      batch.write()
        .then(() => callback(null, true))
        .catch((err) => callback('bulk_save_failed', false));
      return;
    }

    const eachOperatorAddress = operatorAddresses[counter];
    const compositeEventData = saveMapping[eachOperatorAddress];

    db.get(eachOperatorAddress)
      .then((currentRecord) => {
        if (!currentRecord) {
          batch.put(eachOperatorAddress, JSON.stringify(compositeEventData));
          return updateChainKeys({
            chain_identifier: chain_identifier,
            new_operator_address: eachOperatorAddress
          }, (err, success) => {
            if (!success) return callback('bad_request', false);
            counter++;
            processNext();
          });
        }

        const currentRecordJSON = JSON.parse(currentRecord);
        currentRecordJSON.self_stake = parseInt(currentRecordJSON.self_stake) + (compositeEventData.self_stake || 0);
        currentRecordJSON.commission = parseInt(currentRecordJSON.commission) + (compositeEventData.commission || 0);
        currentRecordJSON.reward = parseInt(currentRecordJSON.reward) + (compositeEventData.reward || 0);
        currentRecordJSON.total_stake = parseInt(currentRecordJSON.total_stake) + (compositeEventData.total_stake || 0);
        currentRecordJSON.total_withdraw = parseInt(currentRecordJSON.total_withdraw) + (compositeEventData.total_withdraw || 0);

        batch.put(eachOperatorAddress, JSON.stringify(currentRecordJSON));
        counter++;
        processNext();
      })
      .catch((err) => callback('bad_request', false));
  }

  processNext();
}

export function getBatchData(
  chain_identifier: string,
  callback: (err: string | null, data: Record<string, any> | null) => void
) {
  db.get(chain_identifier)
    .then((keys) => {
      const keysJSON = JSON.parse(keys);
      const mapping: Record<string, any> = {};

      let counter = 0;

      function processNext() {
        if (counter >= keysJSON.length) {
          callback(null, mapping);
          return;
        }

        const eachOperatorAddress = keysJSON[counter];
        db.get(eachOperatorAddress)
          .then((data) => {
            mapping[eachOperatorAddress] = JSON.parse(data);
            counter++;
            processNext();
          })
          .catch((err) => callback(err.message, null));
      }

      processNext();
    })
    .catch((err) => callback(err.message, null));
}

export function clearChainData (
  chain_identifier: string,
  callback: (err: string | null, success: Boolean) => any
) {
  const batch = db.batch();

  db.get(chain_identifier)
    .then((data) => {
      if (!data) return callback(null, true);
      const operatorAddresses = JSON.parse(data);
      if (!operatorAddresses || operatorAddresses.length <= 0) return callback(null, true);
      operatorAddresses.forEach((eachOperatorAddress: string) => batch.put(eachOperatorAddress, ''));

      batch.put(chain_identifier, JSON.stringify([]));

      batch.write()
        .then(() => callback(null, true))
        .catch((err) => callback('bulk_delete_failed', false));
    })
}
