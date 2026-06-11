import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/server-auth';
import {
  createIncomeBudgetFromTemplate,
  ensureDefaultIncomeBudgetPlan,
  getActiveIncomeBudgetPlan,
  saveIncomeBudgetPlan,
} from '@/lib/income-budget-service';
import { INCOME_BUDGET_TEMPLATES, type IncomeBudgetTemplateId } from '@/lib/income-budget-templates';

export async function GET() {
  const user = await requireUser();
  const plan = await ensureDefaultIncomeBudgetPlan(user.id);
  return NextResponse.json({
    plan,
    templates: Object.values(INCOME_BUDGET_TEMPLATES).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      buckets: t.buckets,
    })),
  });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  const body = await request.json();

  if (body.action === 'apply-template') {
    const templateId = body.templateId as IncomeBudgetTemplateId;
    if (!templateId || !INCOME_BUDGET_TEMPLATES[templateId]) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 });
    }
    const plan = await createIncomeBudgetFromTemplate(user.id, templateId);
    return NextResponse.json({ plan });
  }

  if (!Array.isArray(body.buckets)) {
    return NextResponse.json({ error: 'Buckets are required' }, { status: 400 });
  }

  try {
    const plan = await saveIncomeBudgetPlan(user.id, {
      templateId: body.templateId,
      name: body.name,
      buckets: body.buckets,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save budget';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST() {
  const user = await requireUser();
  const plan = await getActiveIncomeBudgetPlan(user.id);
  if (plan) {
    return NextResponse.json({ plan });
  }
  const created = await ensureDefaultIncomeBudgetPlan(user.id);
  return NextResponse.json({ plan: created });
}
