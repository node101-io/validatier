import { ValidatorWithMetricsInterface } from '../Validator.js';
import { CacheInterface } from '../../Cache/Cache.js';

export interface FormattedValidatorPageMetric {
  id: string;
  color: string;
  title: string;
  valueNative: number;
  percentageChange?: string;
}

export interface FormattedValidatorPageData {
  validator: ValidatorWithMetricsInterface;
  metrics: FormattedValidatorPageMetric[];
  validatorGraphData: {
    total_stake: number[];
    total_sold: number[];
  };
  priceData: number[];
  ranks: {
    selfStakeRank: number;
    percentageSoldRank: number;
    totalValidators: number;
  };
}

const average = (array: number[]) => array.reduce((a, b) => a + b) / array.length

export function getFormattedValidatorPageData(
  validator: ValidatorWithMetricsInterface,
  validatorGraphData: { timestamps: number[]; total_stake: number[]; total_sold: number[] },
  priceData: number[],
  cacheValidators: CacheInterface['validators'],
  cummulativeActiveSet: Set<string>
): FormattedValidatorPageData {
  // 1. Calculate metrics
  const averageDelegation = average(validatorGraphData.total_stake) ?? 0;

  const totalSoldAmount = validator.sold ?? 0;
  const averagePrice =
    priceData.reduce((acc, each) => acc + each, 0) / (priceData.length || 1);

  // 2. Filter validators by cummulativeActiveSet
  const activeValidators = cacheValidators.filter((v) => cummulativeActiveSet.has(v.pubkey));

  // 3. Calculate ranks based on active validators only
  const selfStake = (validator.self_stake ?? 0) + (validator.initial_self_stake_prefix_sum ?? 0);
  const selfStakeRank =
    1 + activeValidators.filter((v) => ((v.self_stake ?? 0) + (v.initial_self_stake_prefix_sum ?? 0)) > selfStake).length;

  const myPct = validator.percentage_sold ?? Number.POSITIVE_INFINITY;
  const percentageSoldRank =
    1 +
    activeValidators.filter(
      (v) => (v.percentage_sold ?? Number.POSITIVE_INFINITY) < myPct
    ).length;

  const totalValidators = activeValidators.length;

  // 4. Build metrics
  const metrics: FormattedValidatorPageMetric[] = [
    {
      id: 'total_stake_sum',
      color: '#FF9404',
      title: 'Average Delegation',
      valueNative: averageDelegation * 1_000_000,
    },
    {
      id: 'total_sold',
      color: '#5856D7',
      title: 'Total Sold Amount',
      valueNative: totalSoldAmount,
    },
    {
      id: 'price',
      color: '#31ADE6',
      title: 'Average ATOM Price',
      valueNative: averagePrice,
    },
  ];

  return {
    validator,
    metrics,
    validatorGraphData: {
      total_stake: validatorGraphData.total_stake,
      total_sold: validatorGraphData.total_sold,
    },
    priceData,
    ranks: {
      selfStakeRank,
      percentageSoldRank,
      totalValidators,
    },
  };
}
