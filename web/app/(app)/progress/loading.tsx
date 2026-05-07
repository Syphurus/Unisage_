export default function ProgressLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/4 rounded-full bg-gray-200" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft space-y-3">
              <div className="h-4 w-24 rounded-full bg-gray-200" />
              <div className="h-8 w-28 rounded-full bg-gray-100" />
              <div className="h-3 w-3/4 rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-soft animate-pulse space-y-4">
        <div className="h-6 w-40 rounded-full bg-gray-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-56 rounded-2xl bg-gray-100" />
          <div className="h-56 rounded-2xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
