import { createServerFn } from "@tanstack/react-start";
import {
  fetchMeta,
  fetchSummary,
  fetchValidators,
  fetchValidatorSummary,
  fetchValidatorSeries,
} from "@/server/api";
import type { RangeSearch } from "@/types/range";

export const getMeta = createServerFn().handler(() => fetchMeta());

export const getSummary = createServerFn()
  .validator((range?: RangeSearch) => range)
  .handler(({ data }) => fetchSummary(data));

export const getValidators = createServerFn()
  .validator((range?: RangeSearch) => range)
  .handler(({ data }) => fetchValidators(data));

// Split in two so the route can await the cheap identity/rank slice (needed
// to decide 404 before the response starts streaming) while deferring the
// graph series (see routes/validator.$operatorAddress.tsx).
export const getValidatorSummary = createServerFn()
  .validator((data: { operatorAddress: string; range?: RangeSearch }) => data)
  .handler(({ data }) => fetchValidatorSummary(data.operatorAddress, data.range));

export const getValidatorSeries = createServerFn()
  .validator((data: { operatorAddress: string; range?: RangeSearch }) => data)
  .handler(({ data }) => fetchValidatorSeries(data.operatorAddress, data.range));
