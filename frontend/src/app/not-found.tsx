export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#250054] mb-4">404</h1>
        <h2 className="text-xl font-semibold text-[#250054] mb-2">
          This page could not be found.
        </h2>
        <div className="text-sm text-[#7c70c3]">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </div>
      </div>
    </div>
  );
}
