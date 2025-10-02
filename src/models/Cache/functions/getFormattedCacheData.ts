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

export function getFormattedCacheData(
  cacheData: CacheInterface,
  bottomTimestamp: number,
  topTimestamp: number
): FormattedCacheData {
  // 1. cummulativeActiveListData - convert to Set
  const cummulativeActiveSet = new Set<string>();
  const daysDiff = Math.abs(topTimestamp - bottomTimestamp) / 86400000;
  const threshold = daysDiff / 90;

  for (const each of cacheData.cummulative_active_list) {
    if (threshold <= each.count) {
      cummulativeActiveSet.add(each._id);
    }
  }

  // 2. Calculate averageDelegation with weighted sum
  const { weightedSum, length } = cacheData.summary_graph.reduce(
    (acc, each, idx, arr) => {
      const weight = arr.length - idx;
      acc.weightedSum += each.total_stake_sum * weight;
      acc.length = arr.length;
      return acc;
    },
    { weightedSum: 0, length: 0 }
  );

  const averageDelegation =
    cacheData.summary_data.initial_total_stake_sum + 
    (length > 0 ? weightedSum / length : 0);

  // 3. Calculate totalSoldAmount
  const totalSoldAmount = cacheData.summary_graph.reduce(
    (acc, each) => acc + each.total_sold,
    0
  );

  // 4. Calculate averagePrice
  const averagePrice =
    cacheData.price_graph.length > 0
      ? cacheData.price_graph.reduce((acc, each) => acc + each, 0) /
        cacheData.price_graph.length
      : 0;

  // 5. Build soldData (cumulative)
  const soldData: number[] = [];
  for (let i = 0; i < cacheData.summary_graph.length; i++) {
    soldData.push(
      cacheData.summary_graph[i].total_sold / 1_000_000 +
        (soldData[i - 1] ?? 0)
    );
  }

  // 6. Build delegationData (cumulative)
  const delegationData: number[] = [
    cacheData.summary_data.initial_total_stake_sum / 1_000_000,
  ];
  for (let i = 0; i < cacheData.summary_graph.length; i++) {
    delegationData.push(
      cacheData.summary_graph[i].total_stake_sum / 1_000_000 +
        delegationData[i]
    );
  }

  // 7. Build smallSelfStakeAmountGraphData (cumulative)
  const smallSelfStakeAmountGraphData = [
    cacheData.small_graph[0]?.self_stake_sum ?? 0,
  ];
  for (let i = 1; i < cacheData.small_graph.length; i++) {
    smallSelfStakeAmountGraphData.push(
      cacheData.small_graph[i].self_stake_sum +
        smallSelfStakeAmountGraphData[i - 1]
    );
  }

  // 8. Build smallSelfStakeRatioGraphData
  const smallSelfStakeRatioGraphData = cacheData.small_graph.map((each) =>
    each.average_self_stake_ratio < 0 ? 0 : each.average_self_stake_ratio
  );

  // 9. Format validators and filter by cummulativeActiveSet
  const validators: FormattedValidator[] = cacheData.validators
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
    priceData: cacheData.price_graph,
    smallSelfStakeAmountGraphData,
    smallSelfStakeRatioGraphData,
    cummulativeActiveSet,
  };
}
