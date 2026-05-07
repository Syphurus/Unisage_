export default function SubjectDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
      <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-soft space-y-4">
        <div className="h-8 w-1/3 rounded-full bg-gray-200" />
        <div className="h-4 w-1/4 rounded-full bg-gray-100" />
        <div className="h-2.5 w-full rounded-full bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft space-y-4">
          <div className="h-6 w-48 rounded-full bg-gray-200" />
          <div className="h-4 w-2/3 rounded-full bg-gray-100" />
          <div className="space-y-3">
            <div className="h-24 rounded-2xl bg-gray-100" />
            <div className="h-24 rounded-2xl bg-gray-100" />
            <div className="h-24 rounded-2xl bg-gray-100" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft space-y-3">
          <div className="h-5 w-32 rounded-full bg-gray-200" />
          <div className="h-40 rounded-2xl bg-gray-100" />
          <div className="h-10 rounded-2xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
