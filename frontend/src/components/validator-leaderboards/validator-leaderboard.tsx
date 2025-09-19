import Validator from "@/types/validator";
import Leaderboard from "@/types/leaderboard";

export default function ValidatorLeaderboard({
    validators,
    leaderboard,
}: {
    validators: Validator[];
    leaderboard: Leaderboard;
}) {
    return (
        <div className="flex flex-col overflow-hidden w-full h-full p-0 bg-[#f5f5ff] border-[0.5px] border-[#bebee7] rounded-[20px] gap-1">
            <div className="flex items-center justify-between w-full p-4">
                {/* Each Leaderboard Header */}
                <div className="flex items-center gap-1 cursor-[var(--pointer-hand-dark)] select-none">
                    {/* Each Leaderboard Table Type Content */}
                    <div className="text-[#7c70c3] font-normal text-xl">
                        {leaderboard.title}
                    </div>
                    <div className="flex flex-col justify-center gap-0.5 ml-1.25 -mb-0.75">
                        <div
                            className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-[#49306f]"
                            id="triangle-up-leaderboard"
                        ></div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mb-6 px-4 max-h-[14px]">
                {/* Each Leaderboard Summary */}
                <div className="flex items-baseline flex-nowrap gap-1.25 mb-auto">
                    <div className="text-nowrap text-4xl/3 font-bold text-[#49306f] mb-0.5">
                        {leaderboard.summaryContent}
                    </div>
                    {leaderboard.usdValue && (
                        <div className="block items-baseline w-full font-[500] text-xl text-[#7c70c3]">
                            {leaderboard.usdValue}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-col h-fit gap-0">
                {validators.map((validator, index) => (
                    <div
                        className="flex items-center justify-between cursor-[var(--pointer-hand-dark)] py-3 px-4 hover:bg-[#e8e8ff] transition-colors duration-250 ease-in-out"
                        operator-address={validator.operatorAddress}
                    >
                        <div className="flex items-center gap-2">
                            {/* Each Leaderboard Validator Info Wrapper */}
                            <div className="flex items-center relative min-w-7.5 max-w-7.5 aspect-square gap-2.5 rounded-full">
                                {/* Each Leaderboard Validator Image */}
                                <div className="flex items-center justify-center absolute -left-1.5 -bottom-1.5 text-[#f5f5ff] bg-[#250055] border-1 border-[#f5f5ff] rounded-full z-20 min-w-4 max-w-4 min-h-4 max-h-4 text-sm">
                                    {index + 1}
                                </div>
                                <img
                                    src={validator.image}
                                    alt={validator.name}
                                    className="w-full h-full rounded-full aspect-square overflow-clip"
                                />
                            </div>
                            <div className="w-[150px] text-xl text-[#49306f] overflow-hidden text-ellipsis text-nowrap">
                                {/* Each Leaderboard Validator Name */}
                                {validator.name}
                            </div>
                        </div>
                        <div className="flex gap-5 text-[#7c70c3] text-[16px] text-nowrap">
                            {/* Each Leaderboard Validator Data Wrapper */}
                            {leaderboard.type === "percentageSold" ? (
                                <div className="flex items-center font-bold gap-1">
                                    <div
                                        className={
                                            validator.percentageSold &&
                                            validator.percentageSold > 0
                                                ? "text-[#13a719] text-xl"
                                                : "text-[#b82200] text-xl"
                                        }
                                    >
                                        %
                                        {validator.percentageSold &&
                                        validator.percentageSold <= 100
                                            ? Math.max(
                                                  validator.percentageSold,
                                                  0
                                              ).toFixed(2)
                                            : 100.0}
                                    </div>
                                    {validator.percentageSold &&
                                        validator.percentageSold > 0 && (
                                            <div className="flex items-center gap-1">
                                                <img
                                                    src="/res/images/check_green.svg"
                                                    alt="Check"
                                                    className="flex justify-center items-center"
                                                />
                                            </div>
                                        )}
                                </div>
                            ) : leaderboard.type === "totalSold" ? (
                                <>
                                    <div className="flex items-center !justify-end text-end text-xl min-w-[100px] max-w-[100px] w-[100px]">
                                        {validator.totalStaked?.toFixed(2)} ATOM
                                    </div>
                                    <div className="flex items-center !justify-end text-end text-xl min-w-[100px] max-w-[100px] w-[100px]">
                                        {validator.usdValue} USD
                                    </div>
                                </>
                            ) : (
                                <></>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
