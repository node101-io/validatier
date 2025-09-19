export default function StakeWithUs() {
    return (
        <div className="flex flex-col w-full gap-7 items-center justify-center pt-30 relative">
            <div className="text-4xl/[1.1] font-[500] text-[#361661] uppercase text-center">
                STAKE WITH US TO SUPPORT OUR PUBLIC
                <br />
                CONTRIBUTIONS TO INTERCHAIN
            </div>
            <a
                className="inline-flex items-center justify-center py-2.5 px-6 pb-3.5 bg-[#619bff] !text-[#fafafa] rounded-2xl text-xl font-semibold cursor-[var(--pointer-hand-dark)] transition-all hover:scale-105 duration-300 ease"
                href="https://wallet.keplr.app/chains/cosmos-hub?modal=staking&chain=cosmoshub-4&validator_address=cosmosvaloper1lrzxwu4dmy8030waevcpft7rpxjjz26cpzvumd&step_id=2"
            >
                Stake With Us
            </a>
        </div>
    );
}
