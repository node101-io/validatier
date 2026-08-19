import { createServerFn } from "@tanstack/react-start";
import {
  fetchMeta,
  fetchSummary,
  fetchValidators,
  fetchValidatorSummary,
  fetchValidatorSeries,
} from "@/server/api";

export const getMeta = createServerFn().handler(() => fetchMeta());
export const getSummary = createServerFn().handler(() => fetchSummary());
export const getValidators = createServerFn().handler(() => fetchValidators());

// Split in two so the route can await the cheap identity/rank slice (needed
// to decide 404 before the response starts streaming) while deferring the
// graph series (see routes/validator.$operatorAddress.tsx).
export const getValidatorSummary = createServerFn()
  .validator((operatorAddress: string) => operatorAddress)
  .handler(({ data }) => fetchValidatorSummary(data));

export const getValidatorSeries = createServerFn()
  .validator((operatorAddress: string) => operatorAddress)
  .handler(({ data }) => fetchValidatorSeries(data));
