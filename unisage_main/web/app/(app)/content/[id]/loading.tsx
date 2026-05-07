export default function ContentLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-soft space-y-4">
        <div className="h-8 w-2/3 rounded-full bg-gray-200" />
        <div className="h-4 w-1/4 rounded-full bg-gray-100" />
      </div>
      <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft space-y-4">
        <div className="h-4 w-full rounded-full bg-gray-100" />
        <div className="h-4 w-11/12 rounded-full bg-gray-100" />
        <div className="h-4 w-10/12 rounded-full bg-gray-100" />
        <div className="h-4 w-4/5 rounded-full bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-44 rounded-2xl border border-white/70 bg-white/90 shadow-soft" />
        ))}
      </div>
    </div>
  );
}
