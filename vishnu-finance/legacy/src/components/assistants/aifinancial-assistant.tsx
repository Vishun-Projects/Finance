'use client';

import React from 'react';

interface AIFinancialAssistantProps {
  title?: string;
  description?: string;
}

export default function AIFinancialAssistant({
  title = 'AI Financial Assistant',
  description = 'Intelligent financial assistance is coming soon. Stay tuned for personalized insights and automated planning tools.',
}: AIFinancialAssistantProps) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </section>
  );
}
