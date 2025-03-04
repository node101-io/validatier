
import fetch from 'node-fetch';

export const getKeybasePicture = (keybase_id: string, callback: (err: string | null, res: any) => any) =>  {
  if (keybase_id == 'N/A') return callback(null, 'validator_placeholder.png');
  fetch(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${keybase_id}`)
    .then(res => res.json())
    .then((res: any) => {
      if (!res) return callback('document_not_found', null);
      const url = res.them[0].pictures.primary.url;
      return callback(null, url);
    })
    .catch(err => {
      return callback('network_error', null);
    });
};