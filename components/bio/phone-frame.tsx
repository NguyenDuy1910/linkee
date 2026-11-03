/** Phone-shaped frame for bio page previews; content scrolls inside the screen. */
export function PhoneFrame({ children, label, className = "" }: { children: React.ReactNode; label: string; className?: string }) {
  return (
    <figure
      aria-label={label}
      className={`relative mx-auto aspect-[9/19] w-full max-w-[300px] rounded-[2.75rem] border border-border bg-neutral-900 p-2.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)] ${className}`}
    >
      <div aria-hidden className="absolute top-4 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      <div className="h-full w-full overflow-hidden rounded-[2.2rem] bg-background">
        <div className="h-full w-full overflow-y-auto overscroll-contain [scrollbar-width:none]">{children}</div>
      </div>
    </figure>
  );
}
