import FooterSVG from "@/style/footer-svg";
import Link from "next/link";

export default function Footer() {
  return (
    <div className="flex flex-col py-5 h-[300px] w-fit justify-between text-xl font-[500] text-[#361661] relative mb-5 mt-[150px] gap-6 pb-20">
      <div className="footer-svg-wrapper w-[calc(100%+400px)] min-h-[300px] max-h-[300px] absolute left-0 bottom-0 overflow-hidden my-0 -mx-50 z-0">
        <FooterSVG />
      </div>
      <div className="flex w-full flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 relative z-100">
        <div className="flex flex-row flex-wrap items-center gap-3">
          <Link href="mailto:hello@node101.io" target="_blank">
            hello@node101.io
          </Link>
          <Link href="https://node101.io" target="_blank">
            node101.io
          </Link>
        </div>
        <div className="flex flex-row items-center gap-3 mt-2 sm:mt-0">
          <Link href="https://x.com/node_101" target="_blank">
            X
          </Link>
          <Link href="https://github.com/node101-io" target="_blank">
            Github
          </Link>
        </div>
      </div>
      <div className="flex items-end gap-4 -mt-2 sm:-mt-6 relative">
        <div className="text-[56px]/[48px] sm:text-[120px]/[96px] lg:text-[140px]/[120px] xl:text-[180px]/[140px] font-[800] conic-gradient-bg">
          VALIDATIER
        </div>
      </div>
      <div className="flex w-full flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 relative z-100">
        <div className="flex flex-row items-center gap-3 order-2 sm:order-1">
          <span>Designed and developed by node101</span>
        </div>
        <div className="flex flex-row items-center gap-3 order-1 sm:order-2">
          <span>© 2025. All rights reserved</span>
        </div>
      </div>
    </div>
  );
}
