'use client'

import React from 'react'

export default function Loading() {
  const petals = [0, 72, 144, 216, 288] // 5 petals spaced 72 degrees apart

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-8 bg-brand-surface min-h-[60vh] animate-fade-in">
      <div className="flex flex-col items-center space-y-8">
        {/* Flower Blooming Loader Container */}
        <div className="relative w-24 h-24 flex items-center justify-center animate-rotate-flower select-none">
          {/* Petals */}
          {petals.map((angle, index) => (
            <div
              key={index}
              style={{
                '--rotation': `${angle}deg`,
                animationDelay: `${index * 0.25}s`,
              } as React.CSSProperties}
              className="absolute w-5 h-10 rounded-t-full bg-gradient-to-b from-brand-accent-bold via-brand-accent-soft to-transparent origin-bottom -translate-y-5 animate-bloom"
            />
          ))}
          {/* Flower Center Core */}
          <div className="absolute w-4 h-4 rounded-full bg-amber-400 shadow-inner z-10 animate-pulse border border-white/35" />
        </div>

        {/* Brand Text & Indicator */}
        <div className="flex flex-col items-center space-y-2 text-center select-none">
          <h2 className="font-serif text-lg font-bold tracking-widest text-brand-primary uppercase animate-pulse">
            Zoéflorist
          </h2>
          <span className="text-[9px] uppercase tracking-[0.25em] text-brand-primary/60 font-sans font-medium">
            Merangkai Keindahan...
          </span>
        </div>
      </div>
    </div>
  )
}
