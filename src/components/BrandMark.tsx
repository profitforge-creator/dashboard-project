interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** A faceted geometric gem mark — replaces the plain dot/diamond as Amari's brand symbol. */
export function BrandMark({ size = 20, className }: BrandMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon points="12,1 22,8 18,22 6,22 2,8" fill="currentColor" opacity="0.22" />
      <polygon points="12,1 22,8 12,11" fill="currentColor" opacity="0.95" />
      <polygon points="12,1 2,8 12,11" fill="currentColor" opacity="0.7" />
      <polygon points="2,8 6,22 12,11" fill="currentColor" opacity="0.5" />
      <polygon points="22,8 18,22 12,11" fill="currentColor" opacity="0.35" />
      <polygon points="6,22 18,22 12,11" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
