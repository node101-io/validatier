import { CacheInterface } from '../Cache.js';

export interface FormattedValidator {
  id: number;
  moniker: string;
  temporary_image_uri: string;
  operator_address: string;
  pubkey: string;
  percentage_sold?: number;
  sold?: number;
  average_total_stake?: number;
  self_stake?: number;
  initial_self_stake_prefix_sum?: number;
  commission: number;
  total_withdraw?: number;
}

export interface FormattedMetric {
  id: string;
  color: string;
  title: string;
  valueNative: number;
  valueUsd?: number;
}

export interface FormattedCacheData {
  validators: FormattedValidator[];
  summaryData: CacheInterface['summary_data'];
  metrics: FormattedMetric[];
  delegationData: number[];
  soldData: number[];
  priceData: number[];
  smallSelfStakeAmountGraphData: number[];
  smallSelfStakeRatioGraphData: number[];
  cummulativeActiveSet: Set<string>;
}

export const genesisDate = new Date("2021-02-18");

export function getFormattedCacheData(
  cacheData: CacheInterface,
  bottomTimestamp: number,
  topTimestamp: number
): FormattedCacheData {
  // 1. cummulativeActiveListData - convert to Set
  const cummulativeActiveSet = new Set<string>();
  const daysDiff = Math.abs(topTimestamp - bottomTimestamp) / 86400000;
  const threshold = daysDiff / 90;

  const cummulativeActiveList = Array.isArray(cacheData.cummulative_active_list)
    ? cacheData.cummulative_active_list
    : [];
  for (const each of cummulativeActiveList) {
    if (threshold <= each.count) {
      cummulativeActiveSet.add(each._id);
    }
  }

  // 2. Calculate averageDelegation (shift by initial to get absolute values)
  const summaryGraph = Array.isArray(cacheData.summary_graph)
    ? cacheData.summary_graph
    : [];

  const initialTotalStakeSum =
    bottomTimestamp <= genesisDate.getTime() + 24 * 60 * 60 * 1000
      ? 0
      : Number(cacheData?.summary_data?.initial_total_stake_sum) || 0;

  // Weighted average: more recent values have higher weight
  const { weightedSum, totalWeight } = summaryGraph.reduce(
    (acc, each, idx, arr) => {
      const weight = arr.length - idx; // More weight for recent data
      const totalStakeDelta = Number(each?.total_stake_sum) || 0;
      const totalStakeAbsolute = initialTotalStakeSum + totalStakeDelta;
      acc.weightedSum += totalStakeAbsolute * weight;
      acc.totalWeight += weight;
      return acc;
    },
    { weightedSum: 0, totalWeight: 0 }
  );

  const averageDelegation = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // 3. Calculate totalSoldAmount (use summary_data which comes from rankValidators - it's correct)
  const totalSoldAmount = cacheData.summary_data.total_sold || 0;

  // 4. Calculate averagePrice
  const priceGraph = Array.isArray(cacheData.price_graph)
    ? cacheData.price_graph
    : [];
  const averagePrice = priceGraph.length > 0
    ? priceGraph.reduce((acc, each) => acc + (Number(each) || 0), 0) / priceGraph.length
    : 0;

  // 5. Build soldData (direct values from backend, no cumulative sum needed)
  const soldData: number[] = [];
  for (let i = 0; i < summaryGraph.length; i++) {
    soldData.push((Number(summaryGraph[i]?.total_sold) || 0) / 1_000_000);
  }

  // 6. Build delegationData (shift series by initial to get absolute values)
  const delegationData: number[] = [];
  for (let i = 0; i < summaryGraph.length; i++) {
    const delta = Number(summaryGraph[i]?.total_stake_sum) || 0;
    const absolute = initialTotalStakeSum + delta;
    delegationData.push(absolute / 1_000_000);
  }

  // 7. Build smallSelfStakeAmountGraphData (cumulative)
  const smallGraph = Array.isArray(cacheData.small_graph)
    ? cacheData.small_graph
    : [];
  const smallSelfStakeAmountGraphData = smallGraph.length > 0
    ? [Math.max(Number(smallGraph[0]?.self_stake_sum) || 0, 0)]
    : [0];
  for (let i = 1; i < smallGraph.length; i++) {
    const val = (Number(smallGraph[i]?.self_stake_sum) || 0) + (smallSelfStakeAmountGraphData[i - 1] || 0);
    smallSelfStakeAmountGraphData.push(val < 0 ? 0 : val);
  }

  // 8. Build smallSelfStakeRatioGraphData (cap at 100)
  const smallSelfStakeRatioGraphData = smallGraph.map((each) => {
    const ratio = Number(each?.average_self_stake_ratio) || 0;
    return ratio < 0 ? 0 : Math.min(ratio, 100);
  });

  // 9. Format validators and filter by cummulativeActiveSet
  const validatorsArray = Array.isArray(cacheData.validators)
    ? cacheData.validators
    : [];
  const validators: FormattedValidator[] = validatorsArray
    .filter((v) => cummulativeActiveSet.has(v.pubkey))
    .map((v, index) => ({
      id: index,
      moniker: v.moniker,
      temporary_image_uri:
        v.temporary_image_uri ?? "/res/images/default_validator_photo.svg",
      operator_address: v.operator_address,
      pubkey: v.pubkey,
      percentage_sold: v.percentage_sold,
      sold: v.sold,
      average_total_stake: v.average_total_stake,
      self_stake: v.self_stake,
      initial_self_stake_prefix_sum: v.initial_self_stake_prefix_sum,
      commission: Number(v.commission_rate) * 100,
      total_withdraw: v.total_withdraw,
    }));

  // 10. Build metrics (raw numbers, frontend will format)
  const metrics: FormattedMetric[] = [
    {
      id: "total_stake_sum",
      color: "#FF9404",
      title: "Average Delegation",
      valueNative: averageDelegation,
    },
    {
      id: "total_sold",
      color: "#5856D7",
      title: "Total Sold Amount",
      valueNative: totalSoldAmount,
    },
    {
      id: "price",
      color: "#31ADE6",
      title: "Average ATOM Price",
      valueNative: averagePrice,
    },
  ];

  return {
    validators,
    summaryData: cacheData.summary_data,
    metrics,
    delegationData,
    soldData,
    priceData: priceGraph,
    smallSelfStakeAmountGraphData,
    smallSelfStakeRatioGraphData,
    cummulativeActiveSet,
  };
}
