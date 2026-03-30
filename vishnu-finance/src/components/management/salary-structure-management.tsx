'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Building,
  Calendar,
  TrendingUp,
  Calculator,
  MapPin,
  Users,
  Award,
  History,
  ArrowUpRight,
  ArrowDown,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Download,
  Share2,
  X,
  CreditCard,
  Briefcase,
  PieChart as PieChartIcon,
  ChevronRight,
  ArrowRight,
  AlarmClock,
  Loader2
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { SalaryStructure, SalaryHistory } from '../../types';
import { useAuth } from '../../contexts/AuthContext'; // Fixed import path
import { formatRupees } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Chart colors
const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function SalaryStructureManagement() {
  const { user, loading: authLoading } = useAuth();
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SalaryHistory | null>(null);

  // Form state
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
    changeReason: ''
  });

  // Allowance/Deduction form state
  const [allowanceName, setAllowanceName] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [deductionName, setDeductionName] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');

  const [employerContributionName, setEmployerContributionName] = useState('');
  const [employerContributionAmount, setEmployerContributionAmount] = useState('');

  const fetchSalaryStructures = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/salary-structure?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSalaryStructures(data);
      } else {
        throw new Error('Failed to fetch salary structures');
      }
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
      if (response.ok) {
        const data = await response.json();
        setSalaryHistory(data);
      } else {
        throw new Error('Failed to fetch salary history');
      }
    } catch (error) {
      console.error('Error fetching salary history:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchSalaryStructures();
      fetchSalaryHistory();
    }
  }, [user, authLoading, fetchSalaryStructures, fetchSalaryHistory]);

  const activeStructure = useMemo(() =>
    salaryStructures.find(s => s.isActive) || salaryStructures[0] || null
    , [salaryStructures]);

  // Derived calculations
  const totalMonthlyAllowances = useMemo(() => {
    if (!activeStructure?.allowances) return 0;
    try {
      const allowances = typeof activeStructure.allowances === 'string'
        ? JSON.parse(activeStructure.allowances)
        : activeStructure.allowances;
      return Object.values(allowances).reduce((sum: any, val: any) => sum + (Number(val) || 0), 0) as number;
    } catch { return 0; }
  }, [activeStructure]);

  const totalMonthlyDeductions = useMemo(() => {
    if (!activeStructure?.deductions) return 0;
    try {
      const deductions = typeof activeStructure.deductions === 'string'
        ? JSON.parse(activeStructure.deductions)
        : activeStructure.deductions;
      return Object.values(deductions).reduce((sum: any, val: any) => sum + (Number(val) || 0), 0) as number;
    } catch { return 0; }
  }, [activeStructure]);

  const totalMonthlyEmployerContributions = useMemo(() => {
    if (!activeStructure?.employerContributions) return 0;
    try {
      const contributions = typeof activeStructure.employerContributions === 'string'
        ? JSON.parse(activeStructure.employerContributions)
        : activeStructure.employerContributions;
      return Object.values(contributions).reduce((sum: any, val: any) => sum + (Number(val) || 0), 0) as number;
    } catch { return 0; }
  }, [activeStructure]);

  const monthlyBasic = (Number(activeStructure?.baseSalary) || 0) / 12;
  const grossMonthly = monthlyBasic + totalMonthlyAllowances;
  const netMonthly = grossMonthly - totalMonthlyDeductions;
  const grossAnnual = grossMonthly * 12;
  const monthlyCTC = grossMonthly + totalMonthlyEmployerContributions;
  const annualCTC = monthlyCTC * 12;

  // Chart Logic
  const salaryComponents = useMemo(() => {
    const data = [
      { name: 'Basic Pay', value: (Number(activeStructure?.baseSalary) || 0) / 12 },
    ];
    if (activeStructure?.allowances) {
      const allowances = typeof activeStructure.allowances === 'string'
        ? JSON.parse(activeStructure.allowances)
        : activeStructure.allowances;
      Object.entries(allowances).forEach(([key, val]) => {
        data.push({ name: key, value: Number(val) || 0 });
      });
    }
    return data.filter(d => d.value > 0);
  }, [activeStructure]);
  
  const historyChartData = useMemo(() => {
    return [...salaryHistory]
      .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
      .map(h => ({
        date: new Date(h.effectiveDate).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        salary: h.baseSalary,
        fullDate: new Date(h.effectiveDate).toLocaleDateString()
      }));
  }, [salaryHistory]);

  // Search/Filter state which was used in render but not defined in state in snippets seen.
  // Assuming these states need to be added or were part of the closure.
  // From previous file analysis, searchTerm and filterType were used.
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showHistory, setShowHistory] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAllowance = () => {
    if (allowanceName && allowanceAmount) {
      setFormData(prev => ({
        ...prev,
        allowances: { ...prev.allowances, [allowanceName]: Number(allowanceAmount) }
      }));
      setAllowanceName('');
      setAllowanceAmount('');
    }
  };

  const handleAddDeduction = () => {
    if (deductionName && deductionAmount) {
      setFormData(prev => ({
        ...prev,
        deductions: { ...prev.deductions, [deductionName]: Number(deductionAmount) }
      }));
      setDeductionName('');
      setDeductionAmount('');
    }
  };

  const handleAddEmployerContribution = () => {
    if (employerContributionName && employerContributionAmount) {
      setFormData(prev => ({
        ...prev,
        employerContributions: { ...prev.employerContributions, [employerContributionName]: Number(employerContributionAmount) }
      }));
      setEmployerContributionName('');
      setEmployerContributionAmount('');
    }
  };

  const handleRemoveAllowance = (key: string) => {
    const newAllowances = { ...formData.allowances };
    delete newAllowances[key];
    setFormData(prev => ({ ...prev, allowances: newAllowances }));
  };

  const handleRemoveDeduction = (key: string) => {
    const newDeductions = { ...formData.deductions };
    delete newDeductions[key];
    setFormData(prev => ({ ...prev, deductions: newDeductions }));
  };

  const handleRemoveEmployerContribution = (key: string) => {
    const newContributions = { ...formData.employerContributions };
    delete newContributions[key];
    setFormData(prev => ({ ...prev, employerContributions: newContributions }));
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
      changeReason: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const url = editingStructure ? `/api/salary-structure` : `/api/salary-structure`;
      const method = editingStructure ? 'PUT' : 'POST';
      const body = editingStructure
        ? { ...formData, id: editingStructure.id, userId: user.id }
        : { ...formData, userId: user.id };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        fetchSalaryStructures();
        fetchSalaryHistory();
        setShowForm(false);
        setEditingStructure(null);
        resetForm();
      } else {
        throw new Error('Failed to save salary structure');
      }
    } catch (error) {
      console.error('Error saving salary structure:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary structure?')) return;
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

  const handleSetActive = async (id: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/salary-structure`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: user.id, action: 'ACTIVATE' })
      });

      if (response.ok) {
        fetchSalaryStructures();
      } else {
        console.error('Failed to set active structure');
      }
    } catch (error) {
      console.error('Error setting active structure:', error);
    }
  };

  const handleEdit = (structure: SalaryStructure) => {
    setEditingStructure(structure);

    let parsedAllowances = {};
    let parsedDeductions = {};
    let parsedEmployerContributions = {};

    try {
      parsedAllowances = typeof structure.allowances === 'string' ? JSON.parse(structure.allowances) : structure.allowances || {};
      parsedDeductions = typeof structure.deductions === 'string' ? JSON.parse(structure.deductions) : structure.deductions || {};
      parsedEmployerContributions = typeof structure.employerContributions === 'string' ? JSON.parse(structure.employerContributions) : structure.employerContributions || {};
    } catch (e) { console.error("Error parsing fields", e); }

    setFormData({
      jobTitle: structure.jobTitle,
      company: structure.company,
      baseSalary: structure.baseSalary.toString(),
      allowances: parsedAllowances,
      deductions: parsedDeductions,
      employerContributions: parsedEmployerContributions,
      effectiveDate: new Date(structure.effectiveDate).toISOString().split('T')[0],
      endDate: structure.endDate ? new Date(structure.endDate).toISOString().split('T')[0] : '',
      currency: structure.currency,
      location: structure.location || '',
      department: structure.department || '',
      grade: structure.grade || '',
      notes: structure.notes || '',
      changeType: 'OTHER',
      changeReason: ''
    });
    setShowForm(true);
  };



  const getChangeTypeIcon = (changeType: SalaryHistory['changeType']) => {
    switch (changeType) {
      case 'PROMOTION': return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'SALARY_REVISION': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'COMPANY_CHANGE': return <Building className="w-4 h-4 text-purple-600" />;
      case 'LOCATION_CHANGE': return <MapPin className="w-4 h-4 text-orange-600" />;
      case 'DEPARTMENT_CHANGE': return <Users className="w-4 h-4 text-indigo-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getChangeTypeLabel = (changeType: SalaryHistory['changeType']) => {
    return changeType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const filteredStructures = salaryStructures.filter(structure => {
    const matchesSearch = structure.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      structure.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' ||
      (filterType === 'active' && structure.isActive) ||
      (filterType === 'inactive' && !structure.isActive);
    return matchesSearch && matchesFilter;
  });

  const totalSalaryHistory = salaryHistory.length;
  const averageSalaryChange = salaryHistory.length > 0
    ? salaryHistory.reduce((sum, h) => sum + h.baseSalary, 0) / salaryHistory.length
    : 0;

  if (loading && salaryStructures.length === 0) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Industrial Audit Header */}
      <header className="h-10 shrink-0 border-b border-border bg-muted/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono">
            COMPENSATION_AUDIT_LOG_V2
          </h1>
          <div className="h-4 w-[1px] bg-border" />
          <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
            ESTABLISHED: {activeStructure ? new Date(activeStructure.effectiveDate).getFullYear() : '----'}
          </p>
        </div>
        <div className="flex items-center gap-px">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 px-4 rounded-none border-l border-border hover:bg-muted text-[10px] font-black uppercase tracking-widest gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus size={14} />
            UPDATE_PROTOCOL
          </Button>
        </div>
      </header>

      {activeStructure ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Ledger Pane */}
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar border-r border-border">
            {/* High-Density Metric Strip */}
            <div className="grid grid-cols-4 border-b border-border bg-muted/5">
              <div className="p-4 border-r border-border">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest font-mono mb-1">GROSS_ANNUAL</p>
                <p className="text-xl font-black text-foreground font-mono tabular-nums">{formatRupees(grossAnnual)}</p>
              </div>
              <div className="p-4 border-r border-border">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest font-mono mb-1">CTC_VALUATION</p>
                <p className="text-xl font-black text-blue-600 font-mono tabular-nums">{formatRupees(annualCTC)}</p>
              </div>
              <div className="p-4 border-r border-border">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest font-mono mb-1">NET_MONTHLY</p>
                <p className="text-xl font-black text-emerald-600 font-mono tabular-nums">{formatRupees(netMonthly)}</p>
              </div>
              <div className="p-4 bg-emerald-500/5">
                <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest font-mono mb-1">RETENTION_COEFF</p>
                <p className="text-xl font-black text-emerald-600 font-mono">
                  {((netMonthly / grossMonthly) * 100).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Active Entity Descriptor */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black tracking-tighter uppercase">{activeStructure.jobTitle}</h2>
                    <span className="px-1.5 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest">ACTIVE_NODE</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                    <span className="flex items-center gap-1.5"><Building size={14} /> {activeStructure.company}</span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {activeStructure.location || 'REMOTE'}</span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> EF: {new Date(activeStructure.effectiveDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Composition Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono flex items-center gap-2">
                    <div className="size-1.5 bg-foreground" /> COMPONENT_AUDIT
                  </h4>
                  <div className="border border-border">
                    <div className="grid grid-cols-[1fr_auto] bg-muted/30 border-b border-border h-8 items-center px-3">
                      <span className="text-[9px] font-black uppercase tracking-widest font-mono text-muted-foreground">DESCRIPTOR</span>
                      <span className="text-[9px] font-black uppercase tracking-widest font-mono text-muted-foreground text-right">VALUE_MONTHLY</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      <div className="grid grid-cols-[1fr_auto] h-10 items-center px-3 hover:bg-muted/10">
                        <span className="text-[10px] font-bold uppercase font-mono">BASIC_PAY</span>
                        <span className="text-[11px] font-black font-mono tabular-nums">{formatRupees(monthlyBasic)}</span>
                      </div>
                      {salaryComponents.filter(c => c.name !== 'Basic Pay').map((comp) => (
                        <div key={comp.name} className="grid grid-cols-[1fr_auto] h-10 items-center px-3 hover:bg-muted/10">
                          <span className="text-[10px] font-bold uppercase font-mono">{comp.name}</span>
                          <span className="text-[11px] font-black font-mono tabular-nums">{formatRupees(comp.value)}</span>
                        </div>
                      ))}
                      <div className="grid grid-cols-[1fr_auto] h-10 items-center px-3 bg-muted/5">
                        <span className="text-[10px] font-black uppercase font-mono text-rose-600">TOTAL_DEDUCTIONS</span>
                        <span className="text-[11px] font-black font-mono tabular-nums text-rose-600">-{formatRupees(totalMonthlyDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Telemetry Chart */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono flex items-center gap-2">
                    <div className="size-1.5 bg-primary" /> GROWTH_TELEMETRY
                  </h4>
                  <div className="h-64 w-full border border-border bg-muted/5 p-6 relative">
                    <div className="absolute top-4 right-6 text-[9px] font-mono text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-2"><div className="size-1.5 bg-primary" /> BASE_SALARY_V3</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyChartData}>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}
                          dy={10}
                        />
                        <YAxis 
                          hide 
                          domain={['auto', 'auto']}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border border-border p-3 rounded-none shadow-2xl">
                                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest font-mono mb-1">{payload[0].payload.fullDate}</p>
                                  <p className="text-[11px] font-black text-primary font-mono tabular-nums">{formatRupees(payload[0].value as number)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="salary" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2.5} 
                          dot={{ r: 0 }}
                          activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                          animationDuration={1500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Log Sidebar */}
          <aside className="w-80 lg:w-96 shrink-0 flex flex-col bg-background border-l border-border overflow-y-auto custom-scrollbar">
            <div className="h-10 px-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground font-mono">HISTORICAL_ARCHIVE</h2>
              <span className="text-[9px] font-mono text-muted-foreground/50">{salaryHistory.length} ENTRIES</span>
            </div>
            
            <div className="divide-y divide-border">
              {salaryHistory.map((item) => {
                const allowances = typeof item.allowances === 'string' ? JSON.parse(item.allowances || '{}') : (item.allowances || {});
                const deductions = typeof item.deductions === 'string' ? JSON.parse(item.deductions || '{}') : (item.deductions || {});
                const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                const totalDeductions = Object.values(deductions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                const netMonthly = (Number(item.baseSalary) / 12) + totalAllowances - totalDeductions;

                return (
                  <div 
                    key={item.id} 
                    className="p-4 hover:bg-muted/30 cursor-pointer transition-colors group"
                    onClick={() => setSelectedHistoryItem(item)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-muted-foreground font-mono opacity-50">
                          {new Date(item.effectiveDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }).toUpperCase()}
                        </span>
                        <div className="flex-1" />
                        <span className="px-1 py-0.5 border border-border bg-muted/50 text-[8px] font-black uppercase tracking-widest mr-2">
                          {item.changeType}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-none border border-border hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item as any);
                            }}
                          >
                            <Edit size={12} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-none border border-border hover:bg-rose-500/10 text-rose-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
                      {item.jobTitle} @ {item.company}
                    </h3>
                    <div className="flex items-end justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-muted-foreground font-mono uppercase">MONTHLY_NET</p>
                        <p className="text-sm font-black text-foreground font-mono tabular-nums">{formatRupees(netMonthly)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-muted-foreground font-mono uppercase">ANNUAL_BASE</p>
                        <p className="text-[11px] font-bold text-muted-foreground font-mono tabular-nums">{formatRupees(Number(item.baseSalary))}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-muted/5">
          <div className="size-16 border border-border flex items-center justify-center mb-6 bg-background">
            <DollarSign className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2">NO_ACTIVE_STRUCTURE</h3>
          <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-tight text-center max-w-xs mb-8">
            System requires at least one compensation record to initiate financial modeling.
          </p>
          <Button 
            className="rounded-none h-11 px-8 font-black text-[10px] uppercase tracking-widest"
            onClick={() => setShowForm(true)}
          >
            INITIALIZE_COMPENSATION_PLAN
          </Button>
        </div>
      )}

      {/* --- FORMS & SHEETS --- */}
      
      {/* Update Protocol Sheet */}
      <Sheet open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingStructure(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl h-full p-0 flex flex-col border-l border-border bg-background transition-none">
          <SheetHeader className="h-12 border-b border-border bg-muted/20 px-6 flex flex-row items-center justify-between shrink-0">
            <SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground font-mono">
              {editingStructure ? 'STRUCTURE_REVISION_PROTOCOL' : 'INITIAL_STRUCTURE_PROTOCOL'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            <div className="space-y-6">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="size-1 bg-foreground" /> CORE_ENTITY_DATA
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Job_Title</label>
                  <Input name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} className="rounded-none border-border bg-muted/5 font-mono text-[11px]" placeholder="SYSTEM_ARCHITECT" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Organization</label>
                  <Input name="company" value={formData.company} onChange={handleInputChange} className="rounded-none border-border bg-muted/5 font-mono text-[11px]" placeholder="CORP_X" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="size-1 bg-foreground" /> FINANCIAL_VALUATION
              </h4>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Base_Annual_Salary (INR)</label>
                <Input name="baseSalary" type="number" value={formData.baseSalary} onChange={handleInputChange} className="rounded-none border-border bg-muted/5 font-mono text-[11px]" />
              </div>

              {/* Allowances Section */}
              <div className="space-y-3">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monthly_Allowances</label>
                <div className="flex gap-2">
                  <Input value={allowanceName} onChange={(e) => setAllowanceName(e.target.value)} placeholder="Type" className="rounded-none border-border text-[10px] h-8" />
                  <Input type="number" value={allowanceAmount} onChange={(e) => setAllowanceAmount(e.target.value)} placeholder="Value" className="rounded-none border-border text-[10px] h-8 w-24" />
                  <Button onClick={handleAddAllowance} size="sm" variant="outline" className="rounded-none h-8 px-3 text-[9px] font-black uppercase">ADD</Button>
                </div>
                <div className="space-y-1">
                  {Object.entries(formData.allowances).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-[10px] font-mono border-b border-border/50 py-1">
                      <span className="uppercase text-muted-foreground">{key}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-black">{formatRupees(val as number)}</span>
                        <button onClick={() => handleRemoveAllowance(key)} className="text-rose-500 hover:text-rose-700"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions Section */}
              <div className="space-y-3">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monthly_Deductions</label>
                <div className="flex gap-2">
                  <Input value={deductionName} onChange={(e) => setDeductionName(e.target.value)} placeholder="Type" className="rounded-none border-border text-[10px] h-8" />
                  <Input type="number" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} placeholder="Value" className="rounded-none border-border text-[10px] h-8 w-24" />
                  <Button onClick={handleAddDeduction} size="sm" variant="outline" className="rounded-none h-8 px-3 text-[9px] font-black uppercase">ADD</Button>
                </div>
                <div className="space-y-1">
                  {Object.entries(formData.deductions).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-[10px] font-mono border-b border-border/50 py-1">
                      <span className="uppercase text-rose-600/60">{key}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-rose-600">-{formatRupees(val as number)}</span>
                        <button onClick={() => handleRemoveDeduction(key)} className="text-rose-500 hover:text-rose-700"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="size-1 bg-foreground" /> CHRONO_PARAMETERS
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Effective_Date</label>
                  <Input name="effectiveDate" type="date" value={formData.effectiveDate} onChange={handleInputChange} className="rounded-none border-border bg-muted/5 font-mono text-[11px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason_for_Change</label>
                  <Select value={formData.changeType} onValueChange={(val) => setFormData(prev => ({ ...prev, changeType: val as any }))}>
                    <SelectTrigger className="rounded-none border-border bg-muted/5 font-mono text-[10px] h-10 px-3 uppercase tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-border">
                      <SelectItem value="NEW_JOB">NEW_JOB</SelectItem>
                      <SelectItem value="SALARY_REVISION">SALARY_REVISION</SelectItem>
                      <SelectItem value="PROMOTION">PROMOTION</SelectItem>
                      <SelectItem value="OTHER">OTHER_REASON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="h-16 border-t border-border bg-muted/20 px-6 flex items-center justify-end shrink-0 gap-3">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-none h-10 px-6 text-[10px] font-black uppercase tracking-widest">CANCEL</Button>
            <Button onClick={handleSubmit} className="rounded-none h-10 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">COMMIT_REVISION</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail Overlay Sheet */}
      <Sheet open={!!selectedHistoryItem} onOpenChange={(open) => { if (!open) setSelectedHistoryItem(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md h-full p-0 flex flex-col border-l border-border bg-background transition-none">
          {selectedHistoryItem && (
            <>
              <SheetHeader className="h-12 border-b border-border bg-muted/20 px-6 flex flex-row items-center justify-between shrink-0">
                <SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground font-mono">
                  HISTORICAL_RECORD_EXTRACT
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest font-mono mb-2 opacity-50">RECORD_IDENTIFIER</p>
                  <h3 className="text-xl font-black uppercase tracking-tighter">{selectedHistoryItem.jobTitle}</h3>
                  <p className="text-sm font-bold text-muted-foreground/60 uppercase">{selectedHistoryItem.company}</p>
                </div>

                <div className="grid grid-cols-2 gap-px border border-border bg-border">
                  <div className="bg-background p-4">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">EFFECTIVE</p>
                    <p className="text-xs font-black font-mono">{new Date(selectedHistoryItem.effectiveDate).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-background p-4">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">REASON</p>
                    <p className="text-xs font-black font-mono">{selectedHistoryItem.changeType}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <div className="size-1 bg-foreground" /> VALUATION_DATA
                  </h4>
                  <div className="space-y-px border border-border bg-border">
                    <div className="bg-background p-3 flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase">ANNUAL_BASE</span>
                      <span className="text-[11px] font-black font-mono">{formatRupees(selectedHistoryItem.baseSalary)}</span>
                    </div>
                    <div className="bg-muted/5 p-3 flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase">MONTHLY_BASE</span>
                      <span className="text-[11px] font-black font-mono">{formatRupees(selectedHistoryItem.baseSalary / 12)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-16 border-t border-border bg-muted/20 px-6 flex items-center shrink-0">
                 <Button variant="outline" onClick={() => setSelectedHistoryItem(null)} className="w-full rounded-none h-10 text-[10px] font-black uppercase tracking-widest border-border">CLOSE_EXTRACT</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

