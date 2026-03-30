"use client";

export default function AgencyEarningsLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-sugu-100 border-t-sugu-500"></div>
        <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-amber-100 border-t-amber-500 animate-spin flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-sugu-500"></div>
        </div>
      </div>
    </div>
  );
}
