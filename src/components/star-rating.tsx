import { Star } from "lucide-react";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 20, readonly = false }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        return (
          <button
            key={n}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(n)}
            className={readonly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}
            aria-label={`${n} estrelas`}
          >
            <Star
              style={{ width: size, height: size }}
              className={filled ? "fill-warning text-warning" : "text-muted-foreground/40"}
            />
          </button>
        );
      })}
    </div>
  );
}
