import { cn } from "@/lib/utils";

type WordmarkProps = {
  className?: string;
  /** The A is a CSS triangle — override its fill when the mark is tinted. */
  triangleClassName?: string;
  style?: React.CSSProperties;
};

/** ZU▲RY. The A is a clip-path triangle, sized in em so it tracks font-size. */
export function Wordmark({ className, triangleClassName, style }: WordmarkProps) {
  return (
    <span
      className={cn("inline-flex items-center leading-none", className)}
      style={style}
    >
      ZU
      <TriangleA className={cn("mx-[0.06em]", triangleClassName)} />
      <span className="sr-only">A</span>
      RY
    </span>
  );
}

export function TriangleA({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block bg-accent", className)}
      style={{
        width: "0.62em",
        height: "0.56em",
        clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
      }}
    />
  );
}
