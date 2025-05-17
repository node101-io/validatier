import Chain from "../../models/Chain/Chain.js"

export const Job_SaveCacheSummaryGraphs = (
  callback: (
    err: string | null,
    success: boolean
  ) => any
) => {
  Chain.getAllChains((err, chains) => {
    
  })
}
