export default function NetworkSummary({
    leftColumn,
    rightColumn,
    componentName,
}: {
    leftColumn: React.ReactNode;
    rightColumn: React.ReactNode;
    componentName?: string;
}) {
    return (
        <>
            <div
                className={`flex justify-between relative 
                    w-full min-w-[280px] md:min-w-[325px] h-[114px]
                    px-5.5 py-4
                    bg-[#f5f5ff]
                    rounded-[20px]
                    [border-width:0.5px] border-[#bebee7]`}
                id={componentName}
            >
                <div className="w-1/2 h-full flex flex-col justify-between">
                    {leftColumn}
                </div>
                <div className="w-1/2 h-full flex flex-col justify-between items-end text-right">
                    {rightColumn}
                </div>
            </div>
        </>
    );
}
