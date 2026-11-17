export function OverlapBracket({ title }: { title: string }) {
  return (
    <span
      data-overlap-bracket=""
      aria-hidden="true"
      title={title}
      className="absolute inset-y-1 left-0 w-1.5 rounded-l-sm border-y-2 border-l-2 border-text-muted/50 sm:hidden"
    />
  );
}
