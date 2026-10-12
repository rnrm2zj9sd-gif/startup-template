import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mx-auto max-w-3xl text-center", className)}>
      <p className="text-xs tracking-[0.4em] text-brand-blue">{eyebrow}</p>
      <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-balance text-lg leading-8 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
