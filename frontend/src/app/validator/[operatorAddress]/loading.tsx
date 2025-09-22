export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-[#250054] mb-4">
                    Loading...
                </h1>
                <h2 className="text-xl font-semibold text-[#250054] mb-2">
                    Please wait while we load the validator data.
                </h2>
                <div className="text-sm text-[#7c70c3]">
                    This may take a few moments.
                </div>
            </div>
        </div>
    );
}
