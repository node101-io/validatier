export default function StakeWithUs() {
  return (
    <div className="flex flex-col w-full max-w-[1100px] mx-auto gap-5 sm:gap-7 items-center justify-center pt-16 sm:pt-24 lg:pt-30 px-4 sm:px-6 relative">
      <div className="text-xl sm:text-3xl lg:text-4xl leading-[1.15] font-[500] text-[#361661] uppercase text-center">
        STAKE WITH US TO SUPPORT OUR PUBLIC
        <br />
        CONTRIBUTIONS TO INTERCHAIN
      </div>
      <a
        className="inline-flex items-center justify-center py-2 px-5 sm:py-2.5 sm:px-6 pb-3 bg-[#619bff] !text-[#fafafa] rounded-2xl text-base sm:text-xl font-semibold cursor-[var(--pointer-hand-dark)] transition-all hover:scale-105 duration-300 ease"
        href="https://wallet.keplr.app/chains/cosmos-hub?modal=staking&chain=cosmoshub-4&validator_address=cosmosvaloper1lrzxwu4dmy8030waevcpft7rpxjjz26cpzvumd&step_id=2"
      >
        Stake With Us
      </a>
    </div>
  );
}
