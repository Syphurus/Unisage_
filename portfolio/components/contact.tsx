import { contact } from "@/lib/data";

export function Contact() {
  return (
    <section
      id="contact"
      className="relative z-10 flex min-h-screen flex-col justify-center bg-bg px-5 pb-20 sm:px-8 sm:pb-0 lg:px-12"
    >
      <div className="mx-auto w-full max-w-240">
        {/* Section header */}
        <div className="mb-12 flex items-baseline justify-between border-b border-border pb-4 sm:mb-14">
          <h2 className="text-lg font-medium tracking-tight sm:text-xl">
            Contact
          </h2>
          <span className="font-mono text-xs text-fg-subtle">04</span>
        </div>

        {/* Context — what's welcome */}
        <div className="max-w-135">
          <p className="text-base leading-relaxed text-fg sm:text-lg md:text-xl">
            I'm open to technical leadership roles, complex systems work, and
            early-stage product discussions.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:mt-4 sm:text-base">
            I'm most interested in teams that value craft, sustainable pace,
            and long-term thinking.
          </p>
        </div>

        {/* Boundary — subtle filter */}
        <p className="mt-8 max-w-120 text-xs leading-relaxed text-fg-subtle sm:mt-10 sm:text-sm md:mt-12">
          I'm not taking on short-term contracts or consulting engagements. If
          helpful, I'm happy to point you to someone better suited.
        </p>

        {/* Invitation — the email anchor */}
        <a
          href={`mailto:${contact.email}`}
          className="mt-10 block text-xl font-medium tracking-tight transition-opacity duration-150 hover:opacity-60 focus:outline-none focus-visible:opacity-60 sm:mt-14 sm:text-2xl md:mt-16 md:text-3xl"
        >
          {contact.email}
        </a>

        {/* Secondary links — metadata level */}
        <div className="mt-6 flex gap-6">
          {contact.github && (
            <a
              href={contact.github}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-fg-subtle transition-opacity duration-150 hover:opacity-60 focus:outline-none focus-visible:opacity-60"
            >
              GitHub
            </a>
          )}
          {contact.linkedin && (
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-fg-subtle transition-opacity duration-150 hover:opacity-60 focus:outline-none focus-visible:opacity-60"
            >
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
