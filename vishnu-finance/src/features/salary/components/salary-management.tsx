'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart-container';
import { SalaryStructure, SalaryHistory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatRupees } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MobileCollapsibleSection } from '@/components/ui/mobile-collapsible-section';
import { MobileHeroMetric, MobileKpiStrip } from '@/components/ui/mobile-kpi-strip';
import { ResponsiveSheet } from '@/components/ui/responsive-sheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TakeHomeAnchor } from '@/components/finance/take-home-anchor';
import {
  SalaryPlanPreviewCard,
  type PlanPreviewData,
} from '@/components/finance/salary-plan-preview-card';
import type { PlanIncomeSource } from '@/lib/plan-income';

function parseRecordField(field: unknown): Record<string, number> {
  if (!field) return {};
  try {
    const obj = typeof field === 'string' ? JSON.parse(field) : field;
    if (!obj || typeof obj !== 'object') return {};
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, Number(v) || 0])
    );
  } catch {
    return {};
  }
}

interface SalaryLineItemEditorProps {
  label: string;
  nameValue: string;
  amountValue: string;
  onNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onAdd: () => void;
  items: Record<string, number>;
  onRemove: (key: string) => void;
  amountTone?: 'neutral' | 'danger';
}

function SalaryLineItemEditor({
  label,
  nameValue,
  amountValue,
  onNameChange,
  onAmountChange,
  onAdd,
  items,
  onRemove,
  amountTone = 'neutral',
}: SalaryLineItemEditorProps) {
  const entries = Object.entries(items);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface/40 p-3">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_auto]">
        <Input value={nameValue} onChange={(e) => onNameChange(e.target.value)} placeholder="Name" className="h-9 text-sm" />
        <Input type="number" value={amountValue} onChange={(e) => onAmountChange(e.target.value)} placeholder="₹" className="h-9 text-sm" />
        <Button type="button" onClick={onAdd} size="sm" variant="outline" className="h-9 shrink-0 px-3">Add</Button>
      </div>
      {entries.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border bg-background">
          {entries.map(([key, val]) => (
            <li key={key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-foreground">{key}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn('tabular-nums numeric', amountTone === 'danger' && 'text-[var(--danger)]')}>
                  {amountTone === 'danger' ? '-' : ''}{formatRupees(val)}
                </span>
                <Button type="button" variant="ghost" size="icon" className="size-7 text-[var(--danger)]" onClick={() => onRemove(key)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">No items added yet.</p>
      )}
    </div>
  );
}

function BreakdownTable({
  rows,
}: {
  rows: Array<{ label: string; value: string; tone?: 'default' | 'muted' | 'danger' | 'success' | 'info'; bold?: boolean }>;
}) {
  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={cn(row.bold && 'border-t border-border')}>
              <td className={cn('py-1.5 pr-3', row.bold ? 'font-medium text-foreground' : 'text-muted')}>{row.label}</td>
              <td
                className={cn(
                  'py-1.5 text-right tabular-nums numeric',
                  row.bold && 'font-medium',
                  row.tone === 'danger' && 'text-[var(--danger)]',
                  row.tone === 'success' && 'text-[var(--success)]',
                  row.tone === 'info' && 'text-info',
                  row.tone === 'muted' && 'text-muted',
                  !row.tone && 'text-foreground'
                )}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              'flex items-center justify-between gap-3 rounded-md border border-border bg-surface/40 px-3 py-2 text-sm',
              row.bold && 'border-t-2'
            )}
          >
            <span className={cn(row.bold ? 'font-medium text-foreground' : 'text-muted')}>{row.label}</span>
            <span
              className={cn(
                'tabular-nums numeric',
                row.bold && 'font-medium',
                row.tone === 'danger' && 'text-[var(--danger)]',
                row.tone === 'success' && 'text-[var(--success)]',
                row.tone === 'info' && 'text-info',
                row.tone === 'muted' && 'text-muted',
                !row.tone && 'text-foreground'
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function SalaryStructureManagement() {
  const { user, loading: authLoading } = useAuth();
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    baseSalary: '',
    allowances: {} as Record<string, number>,
    deductions: {} as Record<string, number>,
    employerContributions: {} as Record<string, number>,
    effectiveDate: '',
    endDate: '',
    currency: 'INR',
    location: '',
    department: '',
    grade: '',
    notes: '',
    changeType: 'NEW_JOB' as SalaryHistory['changeType'],
    changeReason: '',
  });

  const [allowanceName, setAllowanceName] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [deductionName, setDeductionName] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [employerContributionName, setEmployerContributionName] = useState('');
  const [employerContributionAmount, setEmployerContributionAmount] = useState('');
  const [planPreview, setPlanPreview] = useState<PlanPreviewData | null>(null);
  const [planPreviewLoading, setPlanPreviewLoading] = useState(false);

  const fetchPlanPreview = useCallback(async () => {
    try {
      setPlanPreviewLoading(true);
      const response = await fetch('/api/plan-preview');
      if (response.ok) {
        const data = await response.json();
        setPlanPreview({
          takeHome: data.takeHome,
          source: data.source as PlanIncomeSource,
          plannedTotal: data.plannedTotal,
          actualTotal: data.actualTotal,
          headroom: data.headroom,
          underspend: data.underspend ?? 0,
          available: data.available,
          overallScore: data.overallScore,
          monthLabel: data.monthLabel,
        });
      }
    } catch (error) {
      console.error('Error fetching plan preview:', error);
    } finally {
      setPlanPreviewLoading(false);
    }
  }, []);

  const fetchSalaryStructures = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/salary-structure?userId=${user.id}`);
      if (response.ok) setSalaryStructures(await response.json());
    } catch (error) {
      console.error('Error fetching salary structures:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchSalaryHistory = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/salary-history?userId=${user.id}`);
      if (response.ok) setSalaryHistory(await response.json());
    } catch (error) {
      console.error('Error fetching salary history:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchSalaryStructures();
      fetchSalaryHistory();
      void fetchPlanPreview();
    }
  }, [user, authLoading, fetchSalaryStructures, fetchSalaryHistory, fetchPlanPreview]);

  const activeStructure = useMemo(
    () => salaryStructures.find((s) => s.isActive) || salaryStructures[0] || null,
    [salaryStructures]
  );

  const allowances = useMemo(() => parseRecordField(activeStructure?.allowances), [activeStructure]);
  const deductions = useMemo(() => parseRecordField(activeStructure?.deductions), [activeStructure]);
  const employerContributions = useMemo(() => parseRecordField(activeStructure?.employerContributions), [activeStructure]);

  const totalMonthlyAllowances = useMemo(() => Object.values(allowances).reduce((s, v) => s + v, 0), [allowances]);
  const totalMonthlyDeductions = useMemo(() => Object.values(deductions).reduce((s, v) => s + v, 0), [deductions]);
  const totalMonthlyEmployerContributions = useMemo(
    () => Object.values(employerContributions).reduce((s, v) => s + v, 0),
    [employerContributions]
  );

  const monthlyBasic = (Number(activeStructure?.baseSalary) || 0) / 12;
  const grossMonthly = monthlyBasic + totalMonthlyAllowances;
  const netMonthly = grossMonthly - totalMonthlyDeductions;
  const grossAnnual = grossMonthly * 12;
  const monthlyCTC = grossMonthly + totalMonthlyEmployerContributions;
  const annualCTC = monthlyCTC * 12;
  const takeHomePercent = grossMonthly > 0 ? (netMonthly / grossMonthly) * 100 : 0;

  const historyChartData = useMemo(
    () =>
      [...salaryHistory]
        .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
        .map((h) => ({
          date: new Date(h.effectiveDate).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          salary: h.baseSalary,
          fullDate: new Date(h.effectiveDate).toLocaleDateString(),
        })),
    [salaryHistory]
  );

  const sortedHistory = useMemo(
    () => [...salaryHistory].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()),
    [salaryHistory]
  );

  const breakdownRows = useMemo(() => {
    const rows: Array<{ label: string; value: string; tone?: 'default' | 'muted' | 'danger' | 'success' | 'info'; bold?: boolean }> = [
      { label: 'Basic pay', value: formatRupees(monthlyBasic) },
      ...Object.entries(allowances).map(([name, val]) => ({ label: name, value: formatRupees(val) })),
      { label: 'Gross monthly', value: formatRupees(grossMonthly), tone: 'muted' as const, bold: true },
      ...Object.entries(deductions).map(([name, val]) => ({
        label: name,
        value: `-${formatRupees(val)}`,
        tone: 'danger' as const,
      })),
      { label: 'Net monthly (take-home)', value: formatRupees(netMonthly), tone: 'success' as const, bold: true },
    ];
    if (totalMonthlyEmployerContributions > 0) {
      rows.push({
        label: 'Employer cost (CTC add-on)',
        value: formatRupees(totalMonthlyEmployerContributions),
        tone: 'info',
      });
      rows.push({ label: 'Monthly CTC', value: formatRupees(monthlyCTC), tone: 'info' as const, bold: true });
    }
    return rows;
  }, [
    allowances,
    deductions,
    grossMonthly,
    monthlyBasic,
    monthlyCTC,
    netMonthly,
    totalMonthlyEmployerContributions,
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddAllowance = () => {
    if (allowanceName && allowanceAmount) {
      setFormData((prev) => ({
        ...prev,
        allowances: { ...prev.allowances, [allowanceName]: Number(allowanceAmount) },
      }));
      setAllowanceName('');
      setAllowanceAmount('');
    }
  };

  const handleAddDeduction = () => {
    if (deductionName && deductionAmount) {
      setFormData((prev) => ({
        ...prev,
        deductions: { ...prev.deductions, [deductionName]: Number(deductionAmount) },
      }));
      setDeductionName('');
      setDeductionAmount('');
    }
  };

  const handleAddEmployerContribution = () => {
    if (employerContributionName && employerContributionAmount) {
      setFormData((prev) => ({
        ...prev,
        employerContributions: {
          ...prev.employerContributions,
          [employerContributionName]: Number(employerContributionAmount),
        },
      }));
      setEmployerContributionName('');
      setEmployerContributionAmount('');
    }
  };

  const handleRemoveAllowance = (key: string) => {
    const next = { ...formData.allowances };
    delete next[key];
    setFormData((prev) => ({ ...prev, allowances: next }));
  };

  const handleRemoveDeduction = (key: string) => {
    const next = { ...formData.deductions };
    delete next[key];
    setFormData((prev) => ({ ...prev, deductions: next }));
  };

  const handleRemoveEmployerContribution = (key: string) => {
    const next = { ...formData.employerContributions };
    delete next[key];
    setFormData((prev) => ({ ...prev, employerContributions: next }));
  };

  const resetForm = () => {
    setFormData({
      jobTitle: '',
      company: '',
      baseSalary: '',
      allowances: {},
      deductions: {},
      employerContributions: {},
      effectiveDate: '',
      endDate: '',
      currency: 'INR',
      location: '',
      department: '',
      grade: '',
      notes: '',
      changeType: 'OTHER',
      changeReason: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const historyEntry = editingHistoryId
        ? salaryHistory.find((entry) => entry.id === editingHistoryId)
        : null;
      const structureId = editingStructure?.id || historyEntry?.salaryStructureId;

      const body = structureId
        ? {
            ...formData,
            id: structureId,
            historyId: editingHistoryId || undefined,
            userId: user.id,
          }
        : { ...formData, userId: user.id };
      const response = await fetch('/api/salary-structure', {
        method: structureId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        fetchSalaryStructures();
        fetchSalaryHistory();
        void fetchPlanPreview();
        setShowForm(false);
        setEditingStructure(null);
        setEditingHistoryId(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving salary structure:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this salary record?')) return;
    try {
      const response = await fetch(`/api/salary-structure?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchSalaryStructures();
        fetchSalaryHistory();
      }
    } catch (error) {
      console.error('Error deleting salary structure:', error);
    }
  };

  const handleEdit = (structure: SalaryStructure) => {
    setEditingHistoryId(null);
    setEditingStructure(structure);
    setFormData({
      jobTitle: structure.jobTitle,
      company: structure.company,
      baseSalary: structure.baseSalary.toString(),
      allowances: parseRecordField(structure.allowances),
      deductions: parseRecordField(structure.deductions),
      employerContributions: parseRecordField(structure.employerContributions),
      effectiveDate: new Date(structure.effectiveDate).toISOString().split('T')[0],
      endDate: structure.endDate ? new Date(structure.endDate).toISOString().split('T')[0] : '',
      currency: structure.currency,
      location: structure.location || '',
      department: structure.department || '',
      grade: structure.grade || '',
      notes: structure.notes || '',
      changeType: 'OTHER',
      changeReason: '',
    });
    setShowForm(true);
  };

  const handleEditHistory = (item: SalaryHistory) => {
    const linkedStructure =
      salaryStructures.find((structure) => structure.id === item.salaryStructureId) || null;

    setEditingStructure(linkedStructure);
    setEditingHistoryId(item.id);
    setAllowanceName('');
    setAllowanceAmount('');
    setDeductionName('');
    setDeductionAmount('');
    setEmployerContributionName('');
    setEmployerContributionAmount('');
    setFormData({
      jobTitle: item.jobTitle,
      company: item.company,
      baseSalary: item.baseSalary.toString(),
      allowances: parseRecordField(item.allowances),
      deductions: parseRecordField(item.deductions),
      employerContributions: parseRecordField(item.employerContributions),
      effectiveDate: new Date(item.effectiveDate).toISOString().split('T')[0],
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
      currency: item.currency,
      location: item.location || '',
      department: item.department || '',
      grade: item.grade || '',
      notes: linkedStructure?.notes || '',
      changeType: item.changeType,
      changeReason: item.changeReason || '',
    });
    setShowForm(true);
  };

  const openNewStructure = () => {
    setEditingHistoryId(null);
    setEditingStructure(null);
    setAllowanceName('');
    setAllowanceAmount('');
    setDeductionName('');
    setDeductionAmount('');
    setEmployerContributionName('');
    setEmployerContributionAmount('');
    setFormData({
      jobTitle: '',
      company: '',
      baseSalary: '',
      allowances: {},
      deductions: {},
      employerContributions: {},
      effectiveDate: new Date().toISOString().split('T')[0],
      endDate: '',
      currency: 'INR',
      location: '',
      department: '',
      grade: '',
      notes: '',
      changeType: 'NEW_JOB',
      changeReason: '',
    });
    setShowForm(true);
  };

  const formatChangeType = (changeType: SalaryHistory['changeType']) =>
    changeType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

  if (loading && salaryStructures.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!activeStructure) {
    return (
      <>
        <div className="card-base flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-md border border-border bg-surface">
            <DollarSign className="size-6 text-hint" />
          </div>
          <h3 className="mb-1 text-base font-medium text-foreground">No salary added yet</h3>
          <p className="mb-5 max-w-sm text-sm text-muted">Add your CTC and deductions to see take-home pay at a glance.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 size-4" />
            Add salary
          </Button>
        </div>
        {renderFormSheet()}
      </>
    );
  }

  function renderFormSheet() {
    return (
      <ResponsiveSheet
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingStructure(null);
            setEditingHistoryId(null);
            resetForm();
          }
        }}
        title={
          editingHistoryId
            ? 'Edit revision'
            : editingStructure
              ? 'Edit salary'
              : 'Update structure'
        }
        description={
          editingHistoryId
            ? 'Update this historical salary entry.'
            : editingStructure
              ? 'Change the current active salary details.'
              : 'Add a new job, revision, or promotion — keeps history intact.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </>
        }
        contentClassName="gap-0 p-0"
      >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 custom-scrollbar md:px-6">
            <div className="mx-auto w-full max-w-md space-y-6">
              <section className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Role</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} placeholder="Job title" className="h-10" />
                  <Input name="company" value={formData.company} onChange={handleInputChange} placeholder="Company" className="h-10" />
                </div>
              </section>
              <section className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Pay</h4>
                <Input name="baseSalary" type="number" value={formData.baseSalary} onChange={handleInputChange} placeholder="Annual base (INR)" className="h-10 max-w-xs" />
                <SalaryLineItemEditor label="Allowances (monthly)" nameValue={allowanceName} amountValue={allowanceAmount} onNameChange={setAllowanceName} onAmountChange={setAllowanceAmount} onAdd={handleAddAllowance} items={formData.allowances} onRemove={handleRemoveAllowance} />
                <SalaryLineItemEditor label="Deductions (monthly)" nameValue={deductionName} amountValue={deductionAmount} onNameChange={setDeductionName} onAmountChange={setDeductionAmount} onAdd={handleAddDeduction} items={formData.deductions} onRemove={handleRemoveDeduction} amountTone="danger" />
                <SalaryLineItemEditor label="Employer contributions" nameValue={employerContributionName} amountValue={employerContributionAmount} onNameChange={setEmployerContributionName} onAmountChange={setEmployerContributionAmount} onAdd={handleAddEmployerContribution} items={formData.employerContributions} onRemove={handleRemoveEmployerContribution} />
              </section>
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Effective date</label>
                  <Input name="effectiveDate" type="date" value={formData.effectiveDate} onChange={handleInputChange} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Reason</label>
                  <Select value={formData.changeType} onValueChange={(val) => setFormData((prev) => ({ ...prev, changeType: val as SalaryHistory['changeType'] }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW_JOB">New job</SelectItem>
                      <SelectItem value="SALARY_REVISION">Revision</SelectItem>
                      <SelectItem value="PROMOTION">Promotion</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>
            </div>
          </div>
      </ResponsiveSheet>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:max-h-[calc(100vh-7rem)]">
        {/* Header — one line */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 max-lg:hidden">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Salary</p>
            <h1 className="truncate text-xl font-semibold text-foreground">
              {activeStructure.jobTitle}
              <span className="font-normal text-muted"> · {activeStructure.company}</span>
            </h1>
            <p className="text-xs text-muted">
              Since {new Date(activeStructure.effectiveDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              {activeStructure.location ? ` · ${activeStructure.location}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-lg:w-full max-lg:justify-end">
            <Button size="sm" variant="outline" onClick={() => handleEdit(activeStructure)} className="max-lg:px-2">
              <Edit className="size-3.5 sm:mr-1.5" />
              <span className="max-lg:hidden">Edit current</span>
            </Button>
            <Button size="sm" onClick={openNewStructure} className="max-lg:px-2">
              <Plus className="size-3.5 sm:mr-1.5" />
              <span className="max-lg:hidden">Update structure</span>
            </Button>
          </div>
        </div>

        <MobileHeroMetric
          label="Take-home / mo"
          value={formatRupees(netMonthly)}
          tone="success"
          subtitle={
            <>
              Gross {formatRupees(grossAnnual)} · CTC {formatRupees(annualCTC)} · Ded {formatRupees(totalMonthlyDeductions)}
            </>
          }
          footer={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => handleEdit(activeStructure)}>
                Edit
              </Button>
              <Button size="sm" className="h-8 flex-1" onClick={openNewStructure}>
                Update
              </Button>
            </div>
          }
        />

        <MobileKpiStrip
          items={[
            { label: 'Gross/yr', value: formatRupees(grossAnnual) },
            { label: 'CTC/yr', value: formatRupees(annualCTC), tone: 'info' },
            { label: 'Ded/mo', value: `-${formatRupees(totalMonthlyDeductions)}`, tone: 'danger' },
          ]}
        />

        <TakeHomeAnchor
          baseIncome={netMonthly}
          source="salary_structure"
          variant="compact"
          showEditLink={false}
          className="mb-1"
          activeSalaryTakeHome={netMonthly}
          currentMonthSalaryReceived={planPreview?.currentMonthSalaryReceived}
          lastMonthSalaryReceived={planPreview?.lastMonthSalaryReceived}
          receivedSalarySource={planPreview?.receivedSalarySource}
        />

        <SalaryPlanPreviewCard preview={planPreview} loading={planPreviewLoading} />

        {/* All KPIs in one row — desktop only */}
        <div className="hidden grid-cols-2 gap-3 md:grid md:grid-cols-4">
          <div className="card-base p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Take-home / mo</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--success)] numeric sm:text-2xl">{formatRupees(netMonthly)}</p>
            <Progress value={takeHomePercent} className="mt-2 h-1" />
            <p className="mt-1 text-[10px] text-muted">{takeHomePercent.toFixed(1)}% of {formatRupees(grossMonthly)}</p>
          </div>
          <div className="card-base p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Gross / year</p>
            <p className="mt-1 text-xl font-medium tabular-nums numeric sm:text-2xl">{formatRupees(grossAnnual)}</p>
          </div>
          <div className="card-base p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">CTC / year</p>
            <p className="mt-1 text-xl font-medium tabular-nums text-info numeric sm:text-2xl">{formatRupees(annualCTC)}</p>
          </div>
          <div className="card-base p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Deductions / mo</p>
            <p className="mt-1 text-xl font-medium tabular-nums text-[var(--danger)] numeric sm:text-2xl">-{formatRupees(totalMonthlyDeductions)}</p>
          </div>
        </div>

        {/* Main grid — fits one screen, no page scroll on desktop */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
          <MobileCollapsibleSection
            title="Monthly breakdown"
            summary={
              <span>
                Gross {formatRupees(grossMonthly)} · Ded -{formatRupees(totalMonthlyDeductions)} · Net{' '}
                {formatRupees(netMonthly)}
              </span>
            }
            className="flex flex-col lg:col-span-1"
          >
            <div className="p-4">
              <h2 className="mb-3 hidden text-sm font-medium text-foreground md:block">Monthly breakdown</h2>
              <BreakdownTable rows={breakdownRows} />
            </div>
          </MobileCollapsibleSection>

          <MobileCollapsibleSection
            title="Base salary trend"
            summary={historyChartData.length >= 2 ? 'Tap to view chart' : 'Need 2+ revisions'}
            className="flex flex-col lg:col-span-1"
          >
            <div className="p-4">
              <h2 className="mb-2 hidden text-sm font-medium text-foreground md:block">Base salary trend</h2>
              {historyChartData.length < 2 ? (
                <div className="flex flex-1 items-center justify-center text-xs text-muted">Need 2+ revisions for trend.</div>
              ) : (
                <ChartContainer height={130} className="flex-1">
                  <LineChart data={historyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                    <YAxis hide tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                    <Tooltip
                      formatter={(value: number) => formatRupees(value)}
                      labelFormatter={(_, items) => (items?.[0]?.payload as { fullDate?: string })?.fullDate ?? ''}
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="salary" stroke="var(--foreground)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </MobileCollapsibleSection>

          <MobileCollapsibleSection
            title="Revision history"
            summary={
              sortedHistory[0]
                ? `${new Date(sortedHistory[0].effectiveDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} · ${sortedHistory.length} total`
                : 'No revisions yet'
            }
            className="flex flex-col lg:col-span-1"
          >
            <div className="p-4">
              <div className="mb-3 hidden items-center justify-between md:flex">
                <h2 className="text-sm font-medium text-foreground">Revision history</h2>
                <span className="text-xs text-muted">{sortedHistory.length} total</span>
              </div>
              {sortedHistory.length === 0 ? (
                <p className="text-xs text-muted">No revisions yet.</p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wide text-hint">
                    <th className="pb-2 pr-2">Date</th>
                    <th className="pb-2 pr-2">Type</th>
                    <th className="pb-2 pr-2 text-right">Net/mo</th>
                    <th className="pb-2 text-right">Base/yr</th>
                    <th className="pb-2 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedHistory.slice(0, 6).map((item) => {
                    const itemAllowances = parseRecordField(item.allowances);
                    const itemDeductions = parseRecordField(item.deductions);
                    const itemNet =
                      Number(item.baseSalary) / 12 +
                      Object.values(itemAllowances).reduce((s, v) => s + v, 0) -
                      Object.values(itemDeductions).reduce((s, v) => s + v, 0);
                    return (
                      <tr key={item.id} className="text-foreground">
                        <td className="py-2 pr-2 tabular-nums">
                          {new Date(item.effectiveDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                        </td>
                        <td className="py-2 pr-2">
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                            {formatChangeType(item.changeType)}
                          </Badge>
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-[var(--success)]">{formatRupees(itemNet)}</td>
                        <td className="py-2 text-right tabular-nums text-muted">{formatRupees(Number(item.baseSalary))}</td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted hover:text-foreground"
                              onClick={() => handleEditHistory(item)}
                              aria-label={`Edit revision from ${new Date(item.effectiveDate).toLocaleDateString()}`}
                            >
                              <Edit className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-[var(--danger)]"
                              onClick={() => handleDelete(item.salaryStructureId)}
                              aria-label={`Delete revision from ${new Date(item.effectiveDate).toLocaleDateString()}`}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                  </table>
                </div>

                <div className="space-y-3 lg:hidden">
                  {sortedHistory.slice(0, 6).map((item) => {
                    const itemAllowances = parseRecordField(item.allowances);
                    const itemDeductions = parseRecordField(item.deductions);
                    const itemNet =
                      Number(item.baseSalary) / 12 +
                      Object.values(itemAllowances).reduce((s, v) => s + v, 0) -
                      Object.values(itemDeductions).reduce((s, v) => s + v, 0);
                    return (
                      <div key={item.id} className="rounded-md border border-border p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs tabular-nums text-foreground">
                            {new Date(item.effectiveDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                          </span>
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                            {formatChangeType(item.changeType)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className="text-[var(--success)]">{formatRupees(itemNet)}/mo</span>
                          <span className="text-muted">{formatRupees(Number(item.baseSalary))}/yr</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => handleEditHistory(item)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[var(--danger)]" onClick={() => handleDelete(item.salaryStructureId)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {sortedHistory.length > 6 ? (
              <p className="mt-2 text-[10px] text-muted">Showing latest 6 of {sortedHistory.length}</p>
            ) : null}
            </div>
          </MobileCollapsibleSection>
        </div>
      </div>

      {renderFormSheet()}
    </>
  );
}
