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
                    w-full h-[76px]
                    px-5.5 py-4
                    bg-[#f5f5ff]
                    rounded-[20px]
                    [border-width:0.5px] border-[#bebee7]`}
                id={componentName}
            >
                <div className="max-w-1/2 h-full flex flex-col justify-between">
                    {leftColumn}
                </div>
                <div className="max-w-1/2 h-full flex flex-col justify-between">
                    {rightColumn}
                </div>
            </div>
        </>
    );
}
