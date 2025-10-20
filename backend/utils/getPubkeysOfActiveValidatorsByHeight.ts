import fetch from 'node-fetch';

async function fetchActiveValidatorsRecursive(
  base_url: string,
  block_height: number,
  page: number,
  allValidators: string[] = [],
  total?: number
): Promise<string[]> {

  return fetch(`${base_url}/validators?height=${block_height}&page=${page}&per_page=100`)
    .then(response => response.json())
    .then((response: any) => {
      const validators = response?.result.validators?.map((v: any) => v.pub_key.value) || [];
      allValidators.push(...validators);

      if (total == undefined) total = response?.result.total ?? validators.length;

      if (allValidators.length < (total ? total : 0)) return fetchActiveValidatorsRecursive(base_url, block_height, page + 1, allValidators, total)
      return allValidators;
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
