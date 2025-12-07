// Spinning pill loading component
export function SpinningPill({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className={`relative ${sizeClasses[size]} animate-spin-slow`}>
      <svg 
        viewBox="0 0 24 24" 
        className="w-full h-full drop-shadow-[0_0_15px_rgba(252,200,0,0.5)]"
      >
        {/* Pill capsule shape - tilted */}
        <defs>
          <linearGradient id="pillGradientLoader" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD633" />
            <stop offset="50%" stopColor="#FCC800" />
            <stop offset="100%" stopColor="#D4A800" />
          </linearGradient>
        </defs>
        <rect 
          x="7" 
          y="2" 
          width="10" 
          height="20" 
          rx="5" 
          transform="rotate(30 12 12)"
          fill="url(#pillGradientLoader)"
        />
        {/* Divider line */}
        <line 
          x1="7" 
          y1="12" 
          x2="17" 
          y2="12" 
          transform="rotate(30 12 12)"
          stroke="#000"
          strokeWidth="1"
          strokeOpacity="0.3"
        />
        {/* Highlight */}
        <ellipse
          cx="10"
          cy="8"
          rx="2"
          ry="3"
          transform="rotate(30 12 12)"
          fill="white"
          fillOpacity="0.3"
        />
      </svg>
    </div>
  );
}

