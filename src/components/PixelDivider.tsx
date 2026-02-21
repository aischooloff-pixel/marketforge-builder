interface PixelDividerProps {
  variant?: 'zigzag' | 'checker' | 'dots';
  className?: string;
}

export const PixelDivider = ({ variant = 'zigzag', className = '' }: PixelDividerProps) => {
  if (variant === 'checker') {
    return (
      <div className={`w-full h-2 ${className}`} style={{
        backgroundImage: `
          linear-gradient(45deg, hsl(var(--border)) 25%, transparent 25%),
          linear-gradient(-45deg, hsl(var(--border)) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, hsl(var(--border)) 75%),
          linear-gradient(-45deg, transparent 75%, hsl(var(--border)) 75%)
        `,
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
      }} />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`w-full h-2 ${className}`} style={{
        backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
        backgroundSize: '8px 8px',
      }} />
    );
  }

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <svg width="100%" height="8" preserveAspectRatio="none" className="block">
        <defs>
          <pattern id="zigzag" x="0" y="0" width="16" height="8" patternUnits="userSpaceOnUse">
            <path
              d="M0 8 L4 0 L8 8 L12 0 L16 8"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="2"
              shapeRendering="crispEdges"
            />
          </pattern>
        </defs>
        <rect width="100%" height="8" fill="url(#zigzag)" />
      </svg>
    </div>
  );
};