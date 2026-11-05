/** The supplied Sobha Realty artwork is shared by every brand placement. */
export function Brand({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${compact ? "mobile-brand" : "brand"} ${className}`.trim()}
    >
      <img
        src="/sobha-realty-logo.png"
        alt="Sobha Realty"
        width={391}
        height={129}
      />
    </div>
  );
}
