// Spinning pill loading component
import Image from "next/image";

export function SpinningPill({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
  };

  const pixelSize = sizeMap[size];

  return (
    <div className="animate-spin-slow drop-shadow-[0_0_15px_rgba(252,200,0,0.5)]">
      <Image
        src="/images/assets/yellow_pill_logo.png"
        alt="Loading"
        width={pixelSize}
        height={pixelSize}
        priority
      />
    </div>
  );
}

