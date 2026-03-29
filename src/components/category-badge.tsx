interface Props {
  name: string;
  color: string;
}

export function CategoryBadge({ name, color }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
