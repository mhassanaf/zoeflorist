export default function Loading() {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-8 bg-brand-surface animate-fade-in">
      <div className="flex flex-col items-center space-y-6">
        {/* Elegant looping circular loader */}
        <div className="relative w-16 h-16">
          {/* Loop ring */}
          <div className="absolute inset-0 rounded-full border-4 border-brand-accent-soft/30" />
          {/* Active indicator */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-accent-bold animate-spin" />
          {/* Center core */}
          <div className="absolute inset-2 rounded-full bg-brand-surface flex items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full bg-brand-accent-bold/55 animate-pulse" />
          </div>
        </div>

        {/* Brand Text */}
        <div className="flex flex-col items-center space-y-1.5 text-center">
          <span className="font-serif text-lg font-bold tracking-widest text-brand-primary uppercase">
            Zoéflorist
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-brand-primary/50 font-sans">
            Menyajikan Keindahan...
          </span>
        </div>
      </div>
    </div>
  )
}
