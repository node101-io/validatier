import { createServerFn } from "@tanstack/react-start";
import { readMeta, readSummary, readValidatorDetail, readValidators } from "@/lib/data.server";

export const getMeta = createServerFn().handler(() => readMeta());
export const getSummary = createServerFn().handler(() => readSummary());
export const getValidators = createServerFn().handler(() => readValidators());

export const getValidatorDetail = createServerFn()
  .validator((operatorAddress: string) => operatorAddress)
  .handler(({ data }) => readValidatorDetail(data));
