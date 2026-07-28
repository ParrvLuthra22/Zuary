/** A thin accent bar across the top while a route segment resolves. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-0.5 overflow-hidden bg-line"
    >
      <span className="block h-full w-1/3 animate-[zuary-indeterminate_1.1s_ease-in-out_infinite] bg-accent" />
    </div>
  );
}
