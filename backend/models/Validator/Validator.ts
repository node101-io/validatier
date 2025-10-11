import async from "async";

import mongoose, { Schema, Model, SortOrder } from "mongoose";
import CompositeEventBlock, {
    ValidatorRecordInterface,
} from "../CompositeEventBlock/CompositeEventBlock.js";
import Chain, { ChainInterface } from "../Chain/Chain.js";
import Cache, { CacheInterface } from "../Cache/Cache.js";
import Price from "../Price/Price.js";

import { isOperatorAddressValid } from "../../utils/validationFunctions.js";
import { getCsvExportData } from "./functions/getCsvExportData.js";
import { formatTimestamp } from "../../utils/formatTimestamp.js";
import { getPubkeysOfActiveValidatorsByHeight } from "../../utils/getPubkeysOfActiveValidatorsByHeight.js";
import ActiveValidators, {
    ActiveValidatorsInterface,
} from "../ActiveValidators/ActiveValidators.js";
import {
    getPercentageSold,
    getPercentageSoldWithoutRounding,
} from "./functions/getPercentageSold.js";
import {
    getFormattedValidatorPageData,
    FormattedValidatorPageData,
} from "./functions/getFormattedValidatorPageData.js";

export interface GraphDataInterface {
    _id: {
        year: number;
        month?: number;
        day?: number;
    };
    self_stake_sum: number;
    reward_sum: number;
    commission_sum: number;
    total_stake_sum: number;
    total_sold: number;
    percentage_sold: number;
}
[];

export interface SmallGraphDataInterface {
    _id: number;
    timestamp: number;
    self_stake_sum: number;
    total_stake_sum: number;
    average_self_stake_ratio: number;
}

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const CHAIN_TO_DECIMALS_MAPPING: Record<string, any> = {
    cosmoshub: 6,
    lava: 6,
    celestia: 6,
    osmosis: 6,
};

export interface ValidatorInterface {
    pubkey: string;
    operator_address: string;
    delegator_address: string;
    chain_identifier: string;
    moniker: string;
    website: string;
    description: string;
    security_contact: string;
    commission_rate: string;
    keybase_id: string;
    created_at: Date;
    temporary_image_uri?: string;
}

export interface ValidatorWithMetricsInterface extends ValidatorInterface {
    percentage_sold: number;
    sold: number;
    average_total_stake: number;
    reward: number;
    self_stake: number;
    initial_self_stake_prefix_sum?: number;
    commission: number;
    total_stake: number;
    total_withdraw: number;
}

export interface SingleValidatorGraphDataInterface {
    timestamps: number[];
    total_stake: number[];
    total_sold: number[];
}

export interface ValidatorsSummaryDataInterface {
    initial_total_stake_sum: number;
    total_stake_sum: number;
    initial_total_withdraw_sum: number;
    total_withdraw_sum: number;
    initial_total_sold: number;
    total_sold: number;
    initial_percentage_sold: number;
    percentage_sold: number;
    initial_self_stake_sum: number;
    self_stake_sum: number;
    initial_average_self_stake_ratio: number;
    average_self_stake_ratio: number;
}

export interface ValidatorModel extends Model<ValidatorInterface> {
    saveValidator: (
        body: {
            pubkey?: string;
            operator_address: string;
            delegator_address?: string;
            chain_identifier: string;
            moniker: string;
            website: string;
            description: string;
            security_contact: string;
            commission_rate: string;
            keybase_id: string;
            created_at?: Date;
        },
        callback: (
            err: string | null,
            newValidator: ValidatorInterface | null
        ) => any
    ) => any;
    saveManyValidators: (
        body: Record<
            string,
            {
                pubkey: string;
                operator_address: string;
                delegator_address: string;
                chain_identifier: string;
                moniker: string;
                website: string;
                description: string;
                security_contact: string;
                commission_rate: string;
                keybase_id: string;
                created_at: Date;
            }
        >,
        callback: (
            err: string | null,
            validators: {
                insertedValidators: ValidatorInterface[] | null;
                updatedValidators: ValidatorInterface[] | null;
            } | null
        ) => any
    ) => any;
    updateValidator: (
        body: {
            operator_address: string;
            moniker: string;
            website: string;
            description: string;
            security_contact: string;
            commission_rate: string;
            keybase_id: string;
        },
        callback: (
            err: string | null,
            updatedValidator: ValidatorInterface | null
        ) => any
    ) => any;
    getValidatorByOperatorAddress: (
        body: {
            operator_address: string;
            bottom_timestamp?: number;
            top_timestamp?: number;
        },
        callback: (
            err: string | null,
            validator: ValidatorWithMetricsInterface | null
        ) => any
    ) => any;
    rankValidators: (
        body: {
            chain_identifier?: string;
            sort_by:
                | "total_stake"
                | "total_withdraw"
                | "sold"
                | "self_stake"
                | "percentage_sold";
            bottom_timestamp: number;
            top_timestamp: number;
            order: SortOrder;
            with_photos?: Boolean;
        },
        callback: (
            err: string | null,
            results: {
                summary_data: ValidatorsSummaryDataInterface | null;
                validators: ValidatorWithMetricsInterface[] | null;
            } | null
        ) => any
    ) => any;
    updateActiveValidatorList: (
        body: {
            chain_rpc_url: string;
            chain_identifier: string;
            height: number;
            day: number;
            month: number;
            year: number;
            active_validators_pubkeys_array: string[] | null;
        },
        callback: (
            err: string | null,
            savedActiveValidators: ActiveValidatorsInterface | null
        ) => any
    ) => any;
    exportCsv: (
        body: {
            chain_identifier?: string;
            sort_by:
                | "total_stake"
                | "total_withdraw"
                | "sold"
                | "self_stake"
                | "percentage_sold";
            order: SortOrder;
            bottom_timestamp?: number | null;
            top_timestamp?: number | null;
            range?: number;
        },
        callback: (err: string | null, csvDataMapping: any | null) => any
    ) => any;
    exportCsvForAllRanges: (
        body: {
            chain_identifier?: string;
            sort_by:
                | "total_stake"
                | "total_withdraw"
                | "sold"
                | "self_stake"
                | "percentage_sold";
            order: SortOrder;
            bottom_timestamp?: number | null;
            top_timestamp?: number | null;
        },
        callback: (
            err: string | null,
            rangeToCsvDataMapping: Record<string, any> | null
        ) => any
    ) => any;
    getSummaryGraphData: (
        body: {
            chain_identifier: string;
            bottom_timestamp: number;
            top_timestamp: number;
        },
        callback: (
            err: string | null,
            summaryGraphData: GraphDataInterface | null
        ) => any
    ) => any;
    getSmallGraphData: (
        body: {
            chain_identifier: string;
            bottom_timestamp: number;
            top_timestamp: number;
        },
        callback: (
            err: string | null,
            smallGraphData:
                | {
                      self_stake_amount: number;
                      average_self_stake_ratio: number;
                  }[]
                | null
        ) => any
    ) => any;
    updateLastVisitedBlock: (
        body: {
            chain_identifier: string;
            block_height?: number;
            block_time?: Date;
        },
        callback: (
            err: string | null,
            updated_chain: ChainInterface | null
        ) => any
    ) => any;
    findValidatorsByChainIdentifier: (
        body: { chain_identifier: string },
        callback: (
            err: string | null,
            validators: ValidatorInterface[] | null
        ) => any
    ) => any;
    getValidatorGraphData: (
        body: {
            operator_address: string;
            bottom_timestamp: number;
            top_timestamp: number;
            number_of_columns?: number;
        },
        callback: (
            err: string | null,
            data: SingleValidatorGraphDataInterface | null
        ) => any
    ) => any;
    getFormattedValidatorPageData: (
        body: {
            operator_address: string;
            bottom_timestamp: number;
            top_timestamp: number;
            chain_identifier: string;
            interval: string;
        },
        callback: (
            err: string | null,
            data: FormattedValidatorPageData | null
        ) => any
    ) => any;
}

const validatorSchema = new Schema<ValidatorInterface>({
    pubkey: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: 1,
    },
    operator_address: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: 1,
    },
    delegator_address: {
        type: String,
        required: false,
        unique: true,
        trim: true,
        index: 1,
    },
    chain_identifier: {
        type: String,
        required: true,
        trim: true,
    },
    moniker: {
        type: String,
        required: true,
        trim: true,
        index: 1,
        minlength: 1,
        maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH,
    },
    website: {
        type: String,
        trim: true,
        required: false,
    },
    description: {
        type: String,
        trim: true,
        required: false,
    },
    security_contact: {
        type: String,
        trim: true,
        required: false,
    },
    commission_rate: {
        type: String,
        required: true,
        trim: true,
    },
    keybase_id: {
        type: String,
        required: false,
        trim: true,
        default: "",
    },
    temporary_image_uri: {
        type: String,
        required: false,
    },
    created_at: {
        type: Date,
        required: true,
    },
});

/*
  TODO: Aynı pubkeye sahip bir validatör oluşturulduğunda farklı validatör olmasına rağmen aynı gibi davranıyoruz.
  Validatörü pubkeyi ile identify etmemeliyiz. Farklı validatör saymalıyız.
*/

validatorSchema.statics.saveValidator = function (
    body: Parameters<ValidatorModel["saveValidator"]>[0],
    callback: Parameters<ValidatorModel["saveValidator"]>[1]
) {
    const {
        operator_address,
        moniker,
        commission_rate,
        keybase_id,
        chain_identifier,
        description,
        security_contact,
        website,
    } = body;
    if (!isOperatorAddressValid(operator_address))
        return callback("format_error", null);

    Validator.findOne({
        chain_identifier: chain_identifier,
        operator_address: operator_address,
    })
        .then((oldValidator) => {
            if (!oldValidator) {
                return Validator.create(body)
                    .then((newValidator: ValidatorInterface) => {
                        if (!newValidator)
                            return callback("creation_error", null);
                        return callback(null, newValidator);
                    })
                    .catch((err) => callback(err, null));
            }

            const updateAndChangeValidatorBody = {
                operator_address: operator_address,
                moniker: moniker,
                commission_rate: commission_rate,
                keybase_id: keybase_id,
                website: website,
                description: description,
                security_contact: security_contact,
            };

            Validator.updateValidator(
                updateAndChangeValidatorBody,
                (err, updatedValidator) => {
                    if (err) return callback("bad_request", null);
                    return callback(null, updatedValidator);
                }
            );
        })
        .catch((err) => callback(err, null));
};

validatorSchema.statics.saveManyValidators = function (
    body: Parameters<ValidatorModel["saveManyValidators"]>[0],
    callback: Parameters<ValidatorModel["saveManyValidators"]>[1]
) {
    const validatorsArray = Object.values(body);
    const operatorAddresses = validatorsArray.map(
        (validator) => validator.operator_address
    );

    Validator.find({ operator_address: { $in: operatorAddresses } })
        .then((existingValidators) => {
            const existingOperatorAddresses = existingValidators.map(
                (validator) => validator.operator_address
            );
            const newValidators = validatorsArray.filter(
                (validator) =>
                    !existingOperatorAddresses.includes(
                        validator.operator_address
                    )
            );
            const updateValidators = validatorsArray.filter((validator) =>
                existingOperatorAddresses.includes(validator.operator_address)
            );

            Validator.insertMany(newValidators, { ordered: false })
                .then((insertedValidators) => {
                    const updateValidatorsBulk = updateValidators.map(
                        (validator) => ({
                            updateOne: {
                                filter: {
                                    operator_address:
                                        validator.operator_address,
                                },
                                update: {
                                    $set: {
                                        moniker: validator.moniker,
                                        commission_rate:
                                            validator.commission_rate,
                                        keybase_id: validator.keybase_id,
                                    },
                                },
                            },
                        })
                    );

                    Validator.bulkWrite(updateValidatorsBulk)
                        .then((updatedValidators) => {
                            return callback(null, {
                                insertedValidators,
                                updatedValidators: Object.values(
                                    updatedValidators.insertedIds
                                ),
                            });
                        })
                        .catch((err) =>
                            callback(`database_error: ${err}`, null)
                        );
                })
                .catch((err) => callback(`database_error: ${err}`, null));
        })
        .catch((err) => callback(`database_error: ${err}`, null));
};

validatorSchema.statics.updateValidator = function (
    body: Parameters<ValidatorModel["updateValidator"]>[0],
    callback: Parameters<ValidatorModel["updateValidator"]>[1]
) {
    const {
        operator_address,
        moniker,
        commission_rate,
        keybase_id,
        website,
        security_contact,
        description,
    } = body;

    Validator.findOneAndUpdate(
        { operator_address: operator_address },
        {
            moniker: moniker,
            commission_rate: commission_rate,
            keybase_id: keybase_id,
            website: website,
            security_contact: security_contact,
            description: description,
        }
    )
        .then((validator) => {
            if (!validator) return callback("bad_request", null);
            return callback(null, validator);
        })
        .catch((err) => callback(err, null));
};

validatorSchema.statics.getValidatorByOperatorAddress = function (
    body: Parameters<ValidatorModel["getValidatorByOperatorAddress"]>[0],
    callback: Parameters<ValidatorModel["getValidatorByOperatorAddress"]>[1]
) {
    const { operator_address, bottom_timestamp, top_timestamp } = body;

    Validator.findOne({ operator_address })
        .lean()
        .then((validator) => {
            if (!validator) return callback("bad_request", null);

            const final_top_timestamp = top_timestamp ?? Date.now();
            const final_bottom_timestamp = bottom_timestamp ?? (final_top_timestamp - 365 * 86400 * 1000);

            CompositeEventBlock.getPeriodicDataForValidatorSet(
                {
                    chain_identifier: validator.chain_identifier,
                    bottom_timestamp: final_bottom_timestamp - 86_400_000,
                    top_timestamp: final_top_timestamp,
                },
                (err, validatorRecordMapping) => {
                    if (err) return callback("bad_request", null);

                    const record =
                        validatorRecordMapping?.[validator.operator_address] ||
                        null;

                    const reward = record?.reward || 0;
                    const commission = record?.commission || 0;
                    const self_stake = record?.self_stake || 0;
                    const total_stake = record?.total_stake || 0;
                    const average_total_stake = record?.average_total_stake || 0;
                    const balance_change = record?.balance_change || 0;

                    const outflow = Math.max((balance_change) * -1, 0);
                    const availableToSell = Math.max((reward + commission) - Math.max(self_stake, 0), 0);
                    // sold used for percentage and summaries should be capped by available rewards in range
                    const sold_for_percentage = Math.min(outflow, availableToSell);
                    // display sold should reflect raw outflow to allow warning when > total_withdraw
                    const sold_display = outflow;
                    const percentage_sold = getPercentageSoldWithoutRounding({
                        sold: sold_for_percentage,
                        self_stake,
                        total_withdraw: reward + commission,
                    });

                    return callback(null, {
                        ...validator,
                        percentage_sold: percentage_sold,
                        sold: sold_display,
                        average_total_stake: average_total_stake,
                        reward: reward,
                        self_stake: self_stake,
                        initial_self_stake_prefix_sum: record?.initial_self_stake_prefix_sum || 0,
                        commission: commission,
                        total_stake: total_stake,
                        total_withdraw: reward + commission,
                    });
                }
            );
        })
        .catch((err) => callback(err, null));
};

validatorSchema.statics.rankValidators = function (
    body: Parameters<ValidatorModel["rankValidators"]>[0],
    callback: Parameters<ValidatorModel["rankValidators"]>[1]
) {
    const {
        sort_by,
        order,
        bottom_timestamp,
        top_timestamp,
        chain_identifier,
    } = body;

    if (!chain_identifier) return callback("bad_request", null);

    Promise.allSettled([
        new Promise<ValidatorInterface[]>((resolve, reject) => {
            Validator.find({
                chain_identifier: chain_identifier
                    ? chain_identifier
                    : "cosmoshub",
                created_at: { $lte: new Date(top_timestamp) },
            })
                .lean()
                .then((result) => resolve(result))
                .catch((err) => reject(err));
        }),
        new Promise<Record<string, ValidatorRecordInterface> | null>(
            (resolve, reject) => {
                CompositeEventBlock.getPeriodicDataForValidatorSet(
                    {
                        chain_identifier: chain_identifier,
                        bottom_timestamp: bottom_timestamp - 86_400_000,
                        top_timestamp: top_timestamp,
                    },
                    (err, validatorRecordMapping) => {
                        if (err) return reject(err);
                        return resolve(validatorRecordMapping);
                    }
                );
            }
        ),
    ]).then((results) => {
        let totalSelfStaked = 0;
        let initialTotalSelfStaked = 0;

        let totalDelegation = 0;
        let initialTotalDelegation = 0;

        let totalWithdrawn = 0;
        let initialTotalWithdrawn = 0;

        let totalSold = 0;

        let totalSelfStakeRatio = 0;
        let initialTotalSelfStakeRatio = 0;

        let initialTotalPercentageSold = 0;

        const [validatorsResult, getPeriodicDataForValidatorSetResult] =
            results;
        if (
            validatorsResult.status == "rejected" ||
            getPeriodicDataForValidatorSetResult.status == "rejected"
        )
            return callback("bad_request", null);

        const validators = validatorsResult.value;
        const validatorRecordMapping =
            getPeriodicDataForValidatorSetResult.value;

        const valueArray = [];

        let index = 0;
        while (index < validators.length) {
            const i = index;
            const eachValidator = validators[i];
            const {
                self_stake = 0,
                reward = 0,
                commission = 0,
                total_stake = 0,
                total_withdraw = 0,
                balance_change = 0,
                initial_commission_prefix_sum = 0,
                initial_reward_prefix_sum = 0,
                initial_self_stake_prefix_sum = 0,
                initial_total_stake_prefix_sum = 0,
                initial_total_withdraw_prefix_sum = 0,
                average_total_stake = 0,
            } = validatorRecordMapping?.[eachValidator.operator_address] || {};

            const ratio =
                (self_stake || 0) /
                ((reward + commission) || 10 ** CHAIN_TO_DECIMALS_MAPPING[`${chain_identifier}`]);
            const outflow = Math.max((balance_change) * -1, 0);
            const availableToSell = Math.max((reward + commission) - Math.max(self_stake, 0), 0);
            // Use capped value for percentages/totals, but raw outflow for display
            const sold_for_percentage = Math.min(outflow, availableToSell);
            const sold_display = outflow;
            const initial_sold =
                ((initial_reward_prefix_sum + initial_commission_prefix_sum) || 0) - (initial_self_stake_prefix_sum || 0);

            const percentage_sold = getPercentageSoldWithoutRounding({
                sold: sold_for_percentage,
                self_stake,
                total_withdraw: reward + commission,
            });

            const initial_percentage_sold = Math.min(
                Math.max(
                    ((initial_sold <= 0 ? 0 : initial_sold) /
                        (initial_reward_prefix_sum +
                            initial_commission_prefix_sum || 1)) *
                        100,
                    0
                ),
                100
            );

            totalSold += sold_for_percentage;

            const self_stake_ratio =
                Math.min(Math.abs(self_stake / (total_stake || 1)), 1) * 100;
            const initial_self_stake_ratio =
                Math.min(
                    Math.abs(
                        initial_self_stake_prefix_sum /
                            (initial_total_stake_prefix_sum || 1)
                    ),
                    1
                ) * 100;

            totalDelegation += total_stake;
            initialTotalDelegation += initial_total_stake_prefix_sum;

            totalWithdrawn += reward + commission;
            initialTotalWithdrawn +=
                initial_reward_prefix_sum + initial_commission_prefix_sum;

            totalSelfStaked += self_stake;
            initialTotalSelfStaked += initial_self_stake_prefix_sum;

            totalSelfStakeRatio += self_stake_ratio;
            initialTotalSelfStakeRatio += initial_self_stake_ratio;

            initialTotalPercentageSold += initial_percentage_sold;

            const pushObjectData = {
                ...eachValidator,
                self_stake,
                reward,
                commission,
                total_stake,
                total_withdraw: reward + commission,
                initial_self_stake_prefix_sum,
                initial_reward_prefix_sum,
                initial_commission_prefix_sum,
                initial_total_stake_prefix_sum,
                initial_total_withdraw_prefix_sum:
                    initial_reward_prefix_sum + initial_commission_prefix_sum,
                percentage_sold,
                initial_percentage_sold: initialTotalPercentageSold,
                self_stake_ratio,
                initial_self_stake_ratio,
                average_total_stake: average_total_stake,
                ratio: ratio,
                sold: sold_display,
            };

            valueArray.push(pushObjectData);
            index++;
        }

        valueArray.sort((a: any, b: any) => {
            const valA = a[sort_by] || 0;
            const valB = b[sort_by] || 0;

            if (valA == valB && sort_by == "percentage_sold") {
                const secA = a["average_total_stake"] || 0;
                const secB = b["average_total_stake"] || 0;
                return order == "asc" || order == 1 ? secB - secA : secA - secB;
            }

            return order == "desc" || order == -1 ? valB - valA : valA - valB;
        });

        callback(null, {
            summary_data: {
                initial_total_stake_sum: initialTotalDelegation,
                total_stake_sum: totalDelegation,
                initial_total_withdraw_sum: initialTotalWithdrawn,
                total_withdraw_sum: totalWithdrawn,
                total_sold: totalSold,
                initial_total_sold:
                    initialTotalWithdrawn - initialTotalSelfStaked,
                initial_percentage_sold:
                    ((initialTotalWithdrawn - initialTotalSelfStaked) /
                        initialTotalWithdrawn) *
                    100,
                percentage_sold:
                    Math.min(((totalSold / (totalWithdrawn || 1)) * 100), 100),
                initial_self_stake_sum: initialTotalSelfStaked,
                self_stake_sum: totalSelfStaked,
                initial_average_self_stake_ratio:
                    initialTotalSelfStakeRatio / valueArray.length,
                average_self_stake_ratio:
                    totalSelfStakeRatio / valueArray.length,
            },
            validators: valueArray,
        });
    });
};

validatorSchema.statics.updateActiveValidatorList = async function (
    body: Parameters<ValidatorModel["updateActiveValidatorList"]>[0],
    callback: Parameters<ValidatorModel["updateActiveValidatorList"]>[1]
) {
    const {
        chain_identifier,
        chain_rpc_url,
        height,
        day,
        month,
        year,
        active_validators_pubkeys_array,
    } = body;

    if (
        active_validators_pubkeys_array &&
        active_validators_pubkeys_array.length > 0
    ) {
        return ActiveValidators.saveActiveValidators(
            {
                chain_identifier: chain_identifier,
                month: month + 1,
                year: year,
                day: day,
                active_validators_pubkeys_array:
                    active_validators_pubkeys_array,
            },
            (err, savedActiveValidators) => {
                if (err) return callback(err, null);
                return callback(null, savedActiveValidators);
            }
        );
    }

    return getPubkeysOfActiveValidatorsByHeight(
        chain_rpc_url,
        height,
        (err, pubkeysOfActiveValidators) => {
            if (err || !pubkeysOfActiveValidators) return callback(err, null);

            ActiveValidators.saveActiveValidators(
                {
                    chain_identifier: chain_identifier,
                    month: month + 1,
                    year: year,
                    day: day,
                    active_validators_pubkeys_array: pubkeysOfActiveValidators,
                },
                (err, savedActiveValidators) => {
                    if (err) return callback(err, null);
                    return callback(null, savedActiveValidators);
                }
            );
        }
    );
};

validatorSchema.statics.exportCsv = function (
    body: Parameters<ValidatorModel["exportCsv"]>[0],
    callback: Parameters<ValidatorModel["exportCsv"]>[1]
) {
    const {
        sort_by,
        order,
        bottom_timestamp,
        top_timestamp,
        range = 1,
        chain_identifier,
    } = body;

    let bottomTimestamp = bottom_timestamp ? bottom_timestamp : 0;
    const topTimestamp = top_timestamp ? top_timestamp : 2e9;

    const timestampDifference = topTimestamp - bottomTimestamp;
    if (timestampDifference / range > 50 && range != 0)
        return callback("bad_request", null);

    const timestampRange = Math.min(
        topTimestamp - bottomTimestamp,
        range ? range : topTimestamp - bottomTimestamp
    );
    const csvDataMapping: Record<string, ValidatorInterface[]> = {};

    async.whilst(
        function test(cb) {
            cb(null, bottomTimestamp < topTimestamp);
        },
        function iter(next) {
            Validator.rankValidators(
                {
                    chain_identifier: chain_identifier,
                    sort_by: sort_by,
                    order: order,
                    bottom_timestamp: bottomTimestamp,
                    top_timestamp: bottomTimestamp + timestampRange,
                    with_photos: false,
                },
                (err, results) => {
                    if (err || !results) return next();

                    csvDataMapping[
                        `validator-ranking-${formatTimestamp(
                            bottomTimestamp
                        )}_${formatTimestamp(
                            bottomTimestamp + timestampRange
                        )}.csv`
                    ] = results.validators || [];

                    bottomTimestamp += timestampRange;
                    return next();
                }
            );
        },
        function (err) {
            if (err) return callback("async_error", null);
            getCsvExportData(csvDataMapping, (err, csvExportData) => {
                if (err) return callback("bad_request", null);
                return callback(null, csvExportData);
            });
        }
    );
};

validatorSchema.statics.exportCsvForAllRanges = function (
    body: Parameters<ValidatorModel["exportCsvForAllRanges"]>[0],
    callback: Parameters<ValidatorModel["exportCsvForAllRanges"]>[1]
) {
    const {
        sort_by,
        order,
        bottom_timestamp,
        top_timestamp,
        chain_identifier,
    } = body;

    const rangeArray = [
        { id: "all_time", range: 0 },
        { id: "weekly", range: 7 * 86400 * 1000 },
        { id: "monthly", range: 30 * 86400 * 1000 },
        { id: "yearly", range: 365 * 86400 * 1000 },
    ];

    const rangeToCsvDataMapping: Record<string, any> = {};

    async.timesSeries(
        rangeArray.length,
        (i, next) => {
            Validator.exportCsv(
                {
                    sort_by: sort_by,
                    order: order,
                    bottom_timestamp: bottom_timestamp,
                    top_timestamp: top_timestamp,
                    chain_identifier: chain_identifier,
                    range: rangeArray[i].range,
                },
                (err, csvDataMapping) => {
                    if (err) return next();
                    rangeToCsvDataMapping[rangeArray[i].id] = csvDataMapping;
                    return next();
                }
            );
        },
        (err: any) => {
            if (err) return callback(err, null);
            return callback(null, rangeToCsvDataMapping);
        }
    );
};

validatorSchema.statics.getSummaryGraphData = function (
    body: Parameters<ValidatorModel["getSummaryGraphData"]>[0],
    callback: Parameters<ValidatorModel["getSummaryGraphData"]>[1]
) {
    const { chain_identifier, bottom_timestamp, top_timestamp } = body;

    const numberOfDataPoints = 90;
    const intervalMs = Math.ceil(
        (top_timestamp - bottom_timestamp) / numberOfDataPoints
    );

    // Cumulative series for correct Total Sold/Stake graph
    const cumulativePromises: Promise<{ index: number; sold: number; reward: number; commission: number; self_stake: number; total_stake_sum: number; timestamp: number }>[] = [];
    // Additive per-bucket series for accurate percentage_sold
    const additivePromises: Promise<{ index: number; sold: number; reward: number; commission: number; self_stake: number }>[] = [];
    for (let i = 0; i < numberOfDataPoints; i++) {
        const start = bottom_timestamp + i * intervalMs;
        const end = Math.min(start + intervalMs, top_timestamp);
        const index = i;
        // Cumulative up to 'end'
        cumulativePromises.push(
            new Promise((resolve) => {
                CompositeEventBlock.getPeriodicDataForValidatorSet(
                    {
                        chain_identifier,
                        bottom_timestamp: bottom_timestamp - 86_400_000,
                        top_timestamp: end,
                    },
                    (err, mapping) => {
                        if (err || !mapping)
                            return resolve({ index, sold: 0, reward: 0, commission: 0, self_stake: 0, total_stake_sum: 0, timestamp: end });
                        let soldSum = 0;
                        let rewardSum = 0;
                        let commissionSum = 0;
                        let selfStakeSum = 0;
                        let totalStakeSum = 0;
                        for (const op of Object.keys(mapping)) {
                            const rec = mapping[op] || {};
                            const reward = rec.reward || 0;
                            const commission = rec.commission || 0;
                            const self_stake = rec.self_stake || 0;
                            const balance_change = rec.balance_change || 0;
                            const total_stake = rec.total_stake || 0;
                            const outflow = Math.max(balance_change * -1, 0);
                            const availableToSell = Math.max(reward + commission - Math.max(self_stake, 0), 0);
                            const sold = Math.min(outflow, availableToSell);
                            soldSum += sold;
                            rewardSum += reward;
                            commissionSum += commission;
                            selfStakeSum += self_stake;
                            totalStakeSum += total_stake;
                        }
                        return resolve({ index, sold: soldSum, reward: rewardSum, commission: commissionSum, self_stake: selfStakeSum, total_stake_sum: totalStakeSum, timestamp: end });
                    }
                );
            })
        );
        // Additive for bucket [start, end]
        additivePromises.push(
            new Promise((resolve) => {
                CompositeEventBlock.getPeriodicDataForValidatorSet(
                    { chain_identifier, bottom_timestamp: start, top_timestamp: end },
                    (err, mapping) => {
                        if (err || !mapping) return resolve({ index, sold: 0, reward: 0, commission: 0, self_stake: 0 });
                        let bucketSold = 0;
                        let bucketReward = 0;
                        let bucketCommission = 0;
                        let bucketSelfStake = 0;
                        for (const op of Object.keys(mapping)) {
                            const rec = (mapping)[op] || {};
                            const reward = rec.reward || 0;
                            const commission = rec.commission || 0;
                            const self_stake = rec.self_stake || 0;
                            const balance_change = rec.balance_change || 0;
                            const outflow = Math.max(balance_change * -1, 0);
                            const availableToSell = Math.max(reward + commission - Math.max(self_stake, 0), 0);
                            const sold = Math.min(outflow, availableToSell);
                            bucketSold += sold;
                            bucketReward += reward;
                            bucketCommission += commission;
                            bucketSelfStake += self_stake;
                        }
                        return resolve({ index, sold: bucketSold, reward: bucketReward, commission: bucketCommission, self_stake: bucketSelfStake });
                    }
                );
            })
        );
    }

    Promise.all([Promise.all(cumulativePromises), Promise.all(additivePromises)])
        .then(([bucketResults, additiveResults]) => {
            // Sort bucket results by index to build cumulative series
            (bucketResults).sort((a, b) => a.index - b.index);
            (additiveResults).sort((a, b) => a.index - b.index);

            const result = [];
            let lastValue: any = null;

            for (let i = 0; i < numberOfDataPoints; i++) {
                const br = (bucketResults)[i] || {
                    index: i,
                    sold: 0,
                    reward: 0,
                    commission: 0,
                    self_stake: 0,
                    total_stake_sum: 0,
                    timestamp: bottom_timestamp + (i + 1) * intervalMs,
                };
                // br.* değerleri zaten bottom-1günden bu bucket sonuna kadar birikimli
                const cumulativeSold = br.sold || 0;
                const cumulativeReward = br.reward || 0;
                const cumulativeCommission = br.commission || 0;
                const cumulativeSelfStake = br.self_stake || 0;
                const stake =
                    br.total_stake_sum || (lastValue ? lastValue.total_stake_sum : 0);
                const ts = br.timestamp;

                const value = {
                    _id: { bucket: i },
                    timestamp: ts,
                    self_stake_sum: cumulativeSelfStake,
                    reward_sum: cumulativeReward,
                    commission_sum: cumulativeCommission,
                    total_stake_sum: stake,
                    total_sold: cumulativeSold,
                    percentage_sold: 0, // override below using additive method
                };
                result.push(value);
                lastValue = value;
            }

            // Compute additive-based percentage series to match example
            let addSold = 0;
            let addReward = 0;
            let addCommission = 0;
            let addSelfStake = 0;
            for (let i = 0; i < numberOfDataPoints; i++) {
                const ar: any = (additiveResults)[i] || { sold: 0, reward: 0, commission: 0, self_stake: 0 };
                addSold += ar.sold || 0;
                addReward += ar.reward || 0;
                addCommission += ar.commission || 0;
                addSelfStake += ar.self_stake || 0;
                result[i].percentage_sold = getPercentageSoldWithoutRounding({
                    sold: addSold,
                    self_stake: addSelfStake,
                    total_withdraw: addReward + addCommission,
                });
            }

            return callback(null, result as unknown as any);
        })
        .catch((err) => callback(err, null));
};

validatorSchema.statics.getSmallGraphData = function (
    body: Parameters<ValidatorModel["getSmallGraphData"]>[0],
    callback: Parameters<ValidatorModel["getSmallGraphData"]>[1]
) {
    const { chain_identifier, bottom_timestamp, top_timestamp } = body;
    const numberOfColumns = 20;
    const step = (top_timestamp - bottom_timestamp) / numberOfColumns;
    CompositeEventBlock.aggregate([
        {
            $match: {
                chain_identifier: chain_identifier,
                timestamp: {
                    $gte: bottom_timestamp,
                    $lte: top_timestamp,
                },
            },
        },
        {
            $addFields: {
                groupId: {
                    $floor: {
                        $divide: [
                            {
                                $subtract: ["$timestamp", bottom_timestamp],
                            },
                            step,
                        ],
                    },
                },
            },
        },
        {
            $group: {
                _id: "$groupId",
                timestamp: { $first: "$timestamp" },
                self_stake_sum: { $sum: "$self_stake" },
                total_stake_sum: { $sum: "$total_stake" },
            },
        },
        {
            $addFields: {
                average_self_stake_ratio: {
                    $multiply: [
                        100,
                        {
                            $divide: [
                                "$self_stake_sum",
                                {
                                    $cond: [
                                        { $eq: ["$total_stake_sum", 0] },
                                        1,
                                        "$total_stake_sum",
                                    ],
                                },
                            ],
                        },
                    ],
                },
            },
        },
        {
            $sort: {
                timestamp: 1,
            },
        },
    ])
        .hint({
            chain_identifier: 1,
            timestamp: 1,
            self_stake: 1,
            reward: 1,
            commission: 1,
            total_stake: 1,
            balance_change: 1,
        })
        .then((results) => callback(null, results))
        .catch((err) => callback(err, null));
};

validatorSchema.statics.updateLastVisitedBlock = function (
    body: Parameters<ValidatorModel["updateLastVisitedBlock"]>[0],
    callback: Parameters<ValidatorModel["updateLastVisitedBlock"]>[1]
) {
    const { chain_identifier, block_height, block_time } = body;

    Chain.findOneAndUpdate(
        { name: chain_identifier },
        {
            last_visited_block: block_height,
            last_visited_block_time: block_time,
        }
    )
        .then((updatedChain) => {
            if (!updatedChain) return callback("database_error", null);
            return callback(null, updatedChain);
        })
        .catch((err) => callback(err, null));
};

validatorSchema.statics.findValidatorsByChainIdentifier = function (
    body: Parameters<ValidatorModel["findValidatorsByChainIdentifier"]>[0],
    callback: Parameters<ValidatorModel["findValidatorsByChainIdentifier"]>[1]
) {
    const { chain_identifier } = body;
    Validator.find({ chain_identifier: chain_identifier })
        .then((validators) => callback(null, validators))
        .catch((err) => callback(err, null));
};

validatorSchema.statics.getValidatorGraphData = function (
    body: Parameters<ValidatorModel["getValidatorGraphData"]>[0],
    callback: Parameters<ValidatorModel["getValidatorGraphData"]>[1]
) {
    const {
        operator_address,
        bottom_timestamp,
        top_timestamp,
        number_of_columns = 90,
    } = body;

    if (!operator_address || !bottom_timestamp || !top_timestamp)
        return callback("format_error", null);

    const numberOfColumns = Math.max(1, number_of_columns);
    const stepValue = Math.ceil((top_timestamp - bottom_timestamp) / numberOfColumns);

    const timestamps: number[] = [];
    const totalStakeSeries: number[] = [];
    const totalSoldSeries: number[] = [];

    const promises: Promise<void>[] = [];

    let current = bottom_timestamp;
    let index = 0;

    while (current < top_timestamp) {
        const end = Math.min(current + stepValue, top_timestamp);
        const i = index;
        promises.push(
            new Promise<void>((resolve) => {
                CompositeEventBlock.getPeriodicDataForGraphGeneration(
                    {
                        operator_address: operator_address,
                        bottom_timestamp: bottom_timestamp - 86_400_000,
                        top_timestamp: end,
                        index: i,
                    },
                    (err, result) => {
                        const mapping = result || {};
                        const values = mapping[operator_address] || {};
                        const total_stake = values.total_stake || 0;
                        const total_sold = values.total_sold || 0;

                        timestamps[i] = bottom_timestamp + i * stepValue;
                        totalStakeSeries[i] = total_stake / 1_000_000;
                        totalSoldSeries[i] = total_sold / 1_000_000;
                        return resolve();
                    }
                );
            })
        );

        current += stepValue;
        index++;
    }

    Promise.all(promises)
        .then(() =>
            callback(null, {
                timestamps: timestamps,
                total_stake: totalStakeSeries,
                total_sold: totalSoldSeries,
            })
        )
        .catch((err) => callback(err, null));
};

validatorSchema.statics.getFormattedValidatorPageData = function (
    body: Parameters<ValidatorModel["getFormattedValidatorPageData"]>[0],
    callback: Parameters<ValidatorModel["getFormattedValidatorPageData"]>[1]
) {
    const {
        operator_address,
        bottom_timestamp,
        top_timestamp,
        chain_identifier,
        interval,
    } = body;

    if (!operator_address || !bottom_timestamp || !top_timestamp || !chain_identifier || !interval)
        return callback("format_error", null);

    // Get all data in parallel
    Promise.allSettled([
        // Get validator info
        new Promise<ValidatorWithMetricsInterface>((resolve, reject) => {
            Validator.getValidatorByOperatorAddress(
                {
                    operator_address,
                    bottom_timestamp,
                    top_timestamp
                },
                (err, validator) => {
                    if (err || !validator) return reject(err);
                    resolve(validator);
                }
            );
        }),
        // Get validator graph data
        new Promise<SingleValidatorGraphDataInterface>((resolve, reject) => {
            Validator.getValidatorGraphData(
                {
                    operator_address,
                    bottom_timestamp,
                    top_timestamp,
                    number_of_columns: 90,
                },
                (err, data) => {
                    if (err || !data) return reject(err);
                    resolve(data);
                }
            );
        }),
        // Get price data
        new Promise<number[]>((resolve, reject) => {
            Price.getPriceGraphData(
                {
                    bottom_timestamp,
                    top_timestamp,
                },
                (err, priceData) => {
                    if (err || !priceData) return reject(err);
                    resolve(priceData);
                }
            );
        }),
        // Get cache for rankings
        new Promise<CacheInterface | Omit<CacheInterface, "export" | "interval">>(
            (resolve, reject) => {
                // Check if custom range
                const predefinedIntervals = ['all_time', 'last_90_days', 'last_180_days', 'last_365_days'];
                const isCustomRange = !predefinedIntervals.includes(interval);

                if (isCustomRange) {
                    // Generate fresh data for custom range
                    Cache.generateCacheData(
                        {
                            chain_identifier,
                            bottom_timestamp,
                            top_timestamp,
                        },
                        (err, result) => {
                            if (err || !result) return reject(err);
                            resolve(result);
                        }
                    );
                } else {
                    // Use cached data for predefined intervals
                    Cache.getCacheForChain(
                        {
                            chain_identifier,
                            interval,
                        },
                        (err, result) => {
                            if (err || !result) return reject(err);
                            resolve(result[0]);
                        }
                    );
                }
            }
        ),
    ]).then((results) => {
        const [
            validatorResult,
            graphDataResult,
            priceDataResult,
            cacheResult,
        ] = results;

        if (
            validatorResult.status === "rejected" ||
            graphDataResult.status === "rejected" ||
            priceDataResult.status === "rejected" ||
            cacheResult.status === "rejected"
        ) {
            return callback("bad_request", null);
        }

        const validator = validatorResult.value;
        const graphData = graphDataResult.value;
        const priceData = priceDataResult.value;
        const cache = cacheResult.value;

        // Build cummulativeActiveSet from cache
        const cummulativeActiveSet = new Set<string>();
        const daysDiff = Math.abs(top_timestamp - bottom_timestamp) / 86400000;
        const threshold = daysDiff / 90;

        for (const each of cache.cummulative_active_list) {
            if (threshold <= each.count) {
                cummulativeActiveSet.add(each._id);
            }
        }

        const formattedData = getFormattedValidatorPageData(
            validator,
            graphData,
            priceData,
            cache.validators,
            cummulativeActiveSet
        );

        return callback(null, formattedData);
    });
};

const Validator =
    (mongoose.models.Validators as ValidatorModel) ||
    mongoose.model<ValidatorInterface, ValidatorModel>(
        "Validators",
        validatorSchema
    );

export default Validator;
