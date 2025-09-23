import "@/../public/css/index/header.css";
import "@/../public/css/index/navbar.css";
import { LogoSVG } from "@/style/logo-svg";
import DateRangePicker from "@/components/date-picker/date-picker";

export default function Navbar({
    isValidatorPage = false,
}: {
    isValidatorPage?: boolean;
}) {
    const heightClass = isValidatorPage ? "h-[75px]" : "h-[150px]";
    const backgroundClass = isValidatorPage ? "bg-white" : "bg-transparent";

    return (
        <div
            className={`flex flex-row w-full ${heightClass} px-6 ${backgroundClass} justify-between items-center gap-3 flex-nowrap fixed z-[100] top-0 left-0 right-0`}
        >
            <a
                href="/"
                className="flex h-[18px] sm:h-[26px] gap-2 my-1.5 mr-8 z-20 user-select-none flex-row items-center justify-center transition-all duration-500"
            >
                <div
                    className="flex min-w-fit h-full min-h-full items-center justify-center"
                    id="banner-logo"
                >
                    <LogoSVG
                        fill={isValidatorPage ? "#250754" : "#f5f5ff"}
                        className="aspect-[1.6] block min-h-full h-full w-auto max-h-full max-w-full"
                    />
                </div>
                <div
                    className={`transition-all duration-250 ease-in-out -mt-1.5 text-[26px] sm:text-[42px] font-bold text-nowrap ${
                        isValidatorPage ? "text-[#250754]" : "text-[#f5f5ff]"
                    }`}
                    id="banner-title"
                >
                    VALIDATIER
                </div>
            </a>
            <div className="flex w-fit items-center gap-3 transition-all duration-1000 overflow-visible">
                {!isValidatorPage && (
                    <div className="hidden sm:block w-fit h-fit relative">
                        <input
                            type="text"
                            className="sm:w-[200px] sm:h-[42px] text-xl font-[500] border-1 border-[#bebee7] text-[#7c70c3] bg-[#f5f5ff] rounded-2xl pl-[46px] pb-1 invisible opacity-0 bg-[url(/res/images/search.svg)] bg-position-[13px_13px] bg-no-repeat mt-0.5 transition-all duration-500 ease-in-out relative"
                            placeholder="Search Validator"
                        />
                    </div>
                )}
                <DateRangePicker />
            </div>
        </div>
    );
}
