import { CompareColumn, CompareGrid } from '@/components/ui/compare-grid';
import { planIcons } from './plan-icons';

interface ProsConsProps {
  pros: string[];
  cons: string[];
}

export function ProsCons({ pros, cons }: ProsConsProps) {
  return (
    <CompareGrid className="mt-2.5">
      <CompareColumn title="Pros" variant="success">
        {pros.map((p, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0 text-[var(--success)]">{planIcons.check}</span>
            {p}
          </div>
        ))}
      </CompareColumn>
      <CompareColumn title="Cons" variant="danger">
        {cons.map((c, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0 text-[var(--danger)]">{planIcons.x}</span>
            {c}
          </div>
        ))}
      </CompareColumn>
    </CompareGrid>
  );
}
