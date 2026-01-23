import { principles } from "@/lib/data";

export function Principles() {
  return (
    <section
      id="principles"
      className="relative z-10 bg-bg px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
    >
      <div className="mx-auto max-w-240">
        {/* Section header */}
        <div className="mb-12 flex items-baseline justify-between border-b border-border pb-4 sm:mb-14">
          <h2 className="text-lg font-medium tracking-tight sm:text-xl">
            Principles
          </h2>
          <span className="font-mono text-xs text-fg-subtle">03</span>
        </div>

        {/* Principles list */}
        <ul className="flex flex-col">
          {principles.map((principle, index) => (
            <li
              key={principle.id}
              className="relative border-t border-border/50 py-4 first:border-t-0 first:pt-0 sm:py-5 md:py-6"
            >
              {/* Margin index */}
              <span className="absolute -left-8 top-0 hidden font-mono text-[10px] text-fg-subtle/50 first:top-0 lg:-left-10 lg:block">
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* Principle title */}
              <h3 className="max-w-150 text-lg font-medium tracking-tight sm:text-xl md:text-2xl">
                {principle.title}
              </h3>

              {/* Principle description */}
              <div className="mt-3 max-w-135 space-y-3 text-sm leading-relaxed text-fg-muted sm:text-base">
                {principle.description.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
