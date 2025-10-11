import Link from "next/link";

export default function StakeWithUs() {
  return (
    <div className="flex flex-col w-full max-w-[1100px] mx-auto gap-5 sm:gap-7 items-center justify-center pt-16 sm:pt-24 lg:pt-30 px-4 sm:px-6 relative">
      <div className="text-xl sm:text-3xl lg:text-4xl leading-[1.15] font-[500] text-[#361661] uppercase text-center">
        STAKE WITH US TO SUPPORT OUR PUBLIC
        <br />
        CONTRIBUTIONS TO INTERCHAIN
      </div>
      <Link
        className="inline-flex items-center justify-center pt-1 pb-2 px-5 sm:px-6 bg-[#619bff] !text-[#fafafa] rounded-2xl text-base sm:text-xl font-semibold cursor-[var(--pointer-hand-dark)] transition-all hover:scale-103 active:scale-100 duration-300 ease"
        href="https://wallet.keplr.app/chains/cosmos-hub?modal=validator&chain=cosmoshub-4&validator_address=cosmosvaloper1lrzxwu4dmy8030waevcpft7rpxjjz26cpzvumd"
        target="_blank"
        rel="noopener noreferrer"
      >
        Stake With Us
      </Link>
    </div>
  );
}
