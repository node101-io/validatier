import Metric from "@/types/metric";

export default function MetricContent({ metric }: { metric: Metric }) {
    return (
        <div
            className="flex flex-col justify-center h-full w-full min-w-[325px] lg:min-w-full !box-border py-4 px-[22px] rounded-[20px] border-[0.5px] border-[#bebee7] bg-[#f5f5ff] opacity-100 transition-all duration-250 ease-in-out"
            id={`summary-metric-${metric.id}`}
        >
            <div className="flex items-center h-fit w-full text-xl text-[#7c70c3] gap-2.5 mt-0">
                <div
                    className="-mt-0.5 w-3 aspect-square rounded-full"
                    style={{ backgroundColor: metric.color }}
                ></div>
                <div className="-mt-0.5 text-xl font-[500] mb-1 text-nowrap">
                    {metric.title}
                </div>
            </div>
            <div className="flex flex-row lg:flex-col items-baseline justify-between w-full">
                <div className="text-nowrap text-[#49306f] font-[700] text-[28px]">
                    {metric.valueNative}
                </div>
                <div className="text-nowrap font-semibold text-xl text-[#7c70c3] mt-0">
                    {metric.valueUsd}
                </div>
            </div>
            <div className="text-[#7c70c3] font-normal text-xl">
                <span className="flex items-center text-[#13a719]">
                    {metric.percentageChange}
                </span>
            </div>
        </div>
    );
}
