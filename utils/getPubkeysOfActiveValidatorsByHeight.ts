
import { request } from 'undici';

async function fetchActiveValidatorsRecursive(
  base_url: string,
  block_height: number,
  page: number,
  allValidators: string[] = []
): Promise<string[]> {
  
  return request(`${base_url}/validators?height=${block_height}&page=${page}&per_page=100`)
    .then(response => response.body.json())
    .then((response: any) => {
      const validators = response?.result.validators?.map((v: any) => v.pub_key.value) || [];
      allValidators.push(...validators);

      if (validators.length == 100) {
        return fetchActiveValidatorsRecursive(base_url, block_height, page + 1, allValidators);
      } else {
        return allValidators;
      }
    })
    .catch(err => allValidators);
}

export const getPubkeysOfActiveValidatorsByHeight = (
  base_url: string,
  block_height: number,
  callback: (err: string | null, pubkeysOfActiveValidators: string[] | null) => void
) => {
  fetchActiveValidatorsRecursive(base_url, block_height, 1)
    .then(pubkeys => callback(null, pubkeys))
    .catch(err => callback(err.message, null));
};
