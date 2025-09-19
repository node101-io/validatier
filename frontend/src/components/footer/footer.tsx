import FooterSVG from "@/style/footer-svg";
import { LogoSVG } from "@/style/logo-svg";
import Image from "next/image";

export default function Footer() {
    return (
        <div className="flex flex-col py-5 h-[300px] w-fit justify-between text-xl font-[500] text-[#361661] relative mb-5 mt-[150px] gap-6 pb-20">
            <div className="footer-svg-wrapper w-[calc(100%+400px)] min-h-[300px] max-h-[300px] absolute left-0 bottom-0 overflow-hidden my-0 -mx-50 z-0">
                <FooterSVG />
            </div>
            <div className="flex w-full flex-row justify-between items-center relative z-100">
                <div className="flex flex-row items-center gap-3">
                    <a href="mailto:hello@node101.io" target="_blank">
                        hello@node101.io
                    </a>
                    <a href="https://node101.io" target="_blank">
                        node101.io
                    </a>
                </div>
                <div className="flex flex-row items-center gap-3">
                    <a href="https://x.com/node_101" target="_blank">
                        X
                    </a>
                    <a href="https://github.com/node101-io" target="_blank">
                        Github
                    </a>
                </div>
            </div>
            <div className="flex items-center gap-4 -mt-6 relative">
                <div className="h-[110px] aspect-24/15">
                    <LogoSVG fill="#361661" className="w-full h-full mt-4" />
                </div>
                <div className="text-[180px]/[140px] font-[800] conic-gradient-bg">
                    VALIDATIER
                </div>
            </div>
            <div className="flex w-full flex-row justify-between items-center relative z-100">
                <div className="flex flex-row items-center gap-3">
                    <span>Designed and developed by node101</span>
                </div>
                <div className="flex flex-row items-center gap-3">
                    <span>© 2025. All rights reserved</span>
                </div>
            </div>
        </div>
    );
}
