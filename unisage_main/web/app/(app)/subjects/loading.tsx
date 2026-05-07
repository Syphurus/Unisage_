export default function SubjectsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/4 rounded-full bg-gray-200" />
        <div className="h-10 w-full max-w-md rounded-2xl bg-gray-100" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-20 rounded-full bg-gray-100" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft animate-pulse">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 mr-4 space-y-2">
                <div className="h-5 w-3/4 rounded-full bg-gray-200" />
                <div className="h-3 w-1/2 rounded-full bg-gray-100" />
              </div>
              <div className="h-14 w-14 rounded-full bg-gray-100" />
            </div>
            <div className="flex gap-2 mb-5">
              <div className="h-6 w-16 rounded-full bg-gray-100" />
              <div className="h-6 w-16 rounded-full bg-gray-100" />
            </div>
            <div className="h-4 w-28 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
