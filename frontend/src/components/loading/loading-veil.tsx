// Suspense fallbacks: fake content built at the SAME dimensions as the real
// components (network summary cards, graph area, leaderboard, table rows),
// blurred + pulsing rather than swapped for empty boxes — so the layout
// doesn't jump when the real data streams in and finishes, and the page
// still visually "reads" like the finished design while it's loading.
const veil = "blur-[6px] opacity-60 animate-pulse pointer-events-none select-none";

function Card() {
  return (
    <div
      className={`flex justify-between w-full min-w-[280px] h-[114px] px-5.5 py-4 bg-[#f5f5ff] rounded-[20px] [border-width:0.5px] border-[#bebee7] ${veil}`}
    >
      <div className="w-1/2 h-full flex flex-col justify-between">
        <div className="text-xl text-[#7c70c3]">Percentage sold</div>
        <div className="text-[36px] leading-[22px] font-bold text-[#49306f]">00%</div>
      </div>
      <div className="w-1/2 h-full flex flex-col justify-end items-end">
        <div className="w-16 aspect-square rounded-full bg-[#e8e8ff]" />
      </div>
    </div>
  );
}

export function NetworkSummarySkeleton({ cards = 1 }: { cards?: number }) {
  return (
    <div className="flex flex-row flex-nowrap gap-5 px-5 lg:px-0">
      {Array.from({ length: cards }, (_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}

export function GraphSkeleton() {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[30px] bg-[#f5f5ff] border-[0.5px] border-[#bebee7] h-[420px] w-full px-6 py-5 ${veil}`}
    >
      <div className="h-6 w-40 rounded bg-[#e8e8ff]" />
      <div className="flex-1 rounded-2xl bg-[#e8e8ff]/60" />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className={`flex flex-col gap-2.5 rounded-[30px] bg-[#f5f5ff] border-[0.5px] border-[#bebee7] h-[220px] w-full px-6 py-5 ${veil}`} />
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5 px-5 lg:px-0">
      <div className="text-xl font-[500] text-[#7c70c3] my-2">Validators</div>
      <div
        className={`flex flex-col rounded-[30px] bg-[#f5f5ff] border-[0.5px] border-[#bebee7] overflow-hidden px-6 py-4 gap-3 ${veil}`}
      >
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-10 rounded-xl bg-[#e8e8ff]/60" />
        ))}
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col w-full lg:w-[1100px] gap-5 h-fit py-0 lg:px-10 mt-37.5 mb-1">
      <NetworkSummarySkeleton />
      <GraphSkeleton />
      <LeaderboardSkeleton />
      <TableSkeleton />
    </div>
  );
}

export function ValidatorDetailSkeleton() {
  return (
    <div className="flex flex-col w-full gap-5 mt-5">
      <div className="flex flex-col md:flex-row gap-5 px-5 lg:px-0">
        <NetworkSummarySkeleton cards={2} />
      </div>
      <GraphSkeleton />
    </div>
  );
}
