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
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
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
        fetchSalaryHistory(); // Update history as well if needed
      }
    } catch (error) {
      console.error('Error deleting salary structure:', error);
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
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            My Compensation
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your salary structures, analyze breakdowns, and track history.
          </p>
        </div>
        <Sheet open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) { setEditingStructure(null); resetForm(); }
        }}>
          <SheetTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
              <Plus className="mr-2 h-4 w-4" />
              {salaryStructures.length > 0 ? 'Update Structure' : 'Add Salary'}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingStructure ? 'Edit Salary Structure' : 'New  Salary Structure'}</SheetTitle>
              <SheetDescription>
                {editingStructure ? 'Modify the details of your existing compensation plan.' : 'Add a new compensation plan to track your earnings.'}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6 pb-20">
              {/* Form implementation inline for simplicity in this artifact, ideally extracted */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Job Title</label>
                    <input
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="e.g. Senior Engineer"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company</label>
                    <input
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Annual Basic Salary (Total CTC if unsure, but preferably Basic)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      name="baseSalary"
                      type="number"
                      value={formData.baseSalary}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Allowances Section */}
                <div className="space-y-2 p-4 border rounded-lg bg-card/50">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" /> Monthly Allowances
                  </h3>
                  <div className="flex gap-2">
                    <input
                      value={allowanceName}
                      onChange={(e) => setAllowanceName(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      placeholder="Name (e.g. HRA)"
                    />
                    <input
                      type="number"
                      value={allowanceAmount}
                      onChange={(e) => setAllowanceAmount(e.target.value)}
                      className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      placeholder="Amount"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddAllowance}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(formData.allowances).map(([key, val]) => (
                      <Badge key={key} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-2">
                        {key}: {formatRupees(Number(val))}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveAllowance(key)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Deductions Section */}
                <div className="space-y-2 p-4 border rounded-lg bg-card/50">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-red-500" /> Monthly Deductions
                  </h3>
                  <div className="flex gap-2">
                    <input
                      value={deductionName}
                      onChange={(e) => setDeductionName(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      placeholder="Name (e.g. PF)"
                    />
                    <input
                      type="number"
                      value={deductionAmount}
                      onChange={(e) => setDeductionAmount(e.target.value)}
                      className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      placeholder="Amount"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddDeduction}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(formData.deductions).map(([key, val]) => (
                      <Badge key={key} variant="outline" className="pl-2 pr-1 py-1 flex items-center gap-2 border-red-200 text-red-700 dark:text-red-400 dark:border-red-900">
                        {key}: {formatRupees(Number(val))}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveDeduction(key)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Employer Contributions Section */}
                <div className="space-y-2 p-4 border rounded-lg bg-card/50">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-500" /> Monthly Employer Contributions
                  </h3>
                  <div className="flex gap-2">
                    <input
                      value={employerContributionName}
                      onChange={(e) => setEmployerContributionName(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      placeholder="Name (e.g. Employer PF)"
                    />
                    <input
                      type="number"
                      value={employerContributionAmount}
                      onChange={(e) => setEmployerContributionAmount(e.target.value)}
                      className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      placeholder="Amount"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddEmployerContribution}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(formData.employerContributions).map(([key, val]) => (
                      <Badge key={key} variant="outline" className="pl-2 pr-1 py-1 flex items-center gap-2 border-blue-200 text-blue-700 dark:text-blue-400 dark:border-blue-900">
                        {key}: {formatRupees(Number(val))}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveEmployerContribution(key)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Effective Date</label>
                    <input
                      type="date"
                      name="effectiveDate"
                      value={formData.effectiveDate}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <input
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g. Bangalore"
                    />
                  </div>
                </div>

                {/* Grade & Department */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grade / Level</label>
                    <input
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g. L4, Senior"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <input
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g. Engineering"
                    />
                  </div>
                </div>

                {/* Change Type & Reason (for timeline) */}
                <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <History className="h-4 w-4 text-purple-500" /> Change Details (for Timeline)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Change Type</label>
                      <select
                        name="changeType"
                        value={formData.changeType}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="NEW_JOB">New Job</option>
                        <option value="PROMOTION">Promotion</option>
                        <option value="SALARY_REVISION">Salary Revision</option>
                        <option value="TRANSFER">Transfer</option>
                        <option value="COMPANY_CHANGE">Company Change</option>
                        <option value="LOCATION_CHANGE">Location Change</option>
                        <option value="DEPARTMENT_CHANGE">Department Change</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Change Reason</label>
                      <input
                        name="changeReason"
                        value={formData.changeReason}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="e.g. Annual appraisal"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full" size="lg">Save Structure</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {activeStructure ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <Card className="md:col-span-2 overflow-hidden border-none shadow-xl bg-gradient-to-br from-primary/10 via-background to-background relative isolate">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    {activeStructure.jobTitle}
                    <Badge variant="secondary" className="text-xs font-normal">Active</Badge>
                  </CardTitle>
                  <CardDescription className="text-base mt-1 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> {activeStructure.company}
                    <span className="text-muted-foreground/50">•</span>
                    <MapPin className="w-4 h-4" /> {activeStructure.location || 'Remote'}
                  </CardDescription>
                </div>
                <div className="h-12 w-12 rounded-full border-2 border-background shadow-sm flex items-center justify-center overflow-hidden bg-primary/20 text-primary font-bold">
                  {activeStructure.company.substring(0, 2).toUpperCase()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gross Annual</p>
                  <p className="text-xl font-bold text-foreground">{formatRupees(grossAnnual)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Annual CTC</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatRupees(annualCTC)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Allowances</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">+{formatRupees(totalMonthlyAllowances)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Deductions</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">-{formatRupees(totalMonthlyDeductions)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-primary">Net Monthly</p>
                  <p className="text-xl font-bold text-primary">{formatRupees(netMonthly)}</p>
                </div>
              </div>

              {/* Visual Breakdown using Recharts Pie (Simplified) */}
              <div className="mt-8 flex flex-col md:flex-row items-center gap-8">
                <div className="h-48 w-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={salaryComponents}
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {salaryComponents.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-xs text-muted-foreground">Components</span>
                    <span className="font-bold">{salaryComponents.length}</span>
                  </div>
                </div>
                <div className="flex-1 w-full space-y-3">
                  <h4 className="font-semibold text-sm mb-2">Salary Breakdown</h4>
                  {salaryComponents.map((comp, i) => (
                    <div key={comp.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground capitalize">{comp.name}</span>
                      </div>
                      <span className="font-mono font-medium">{formatRupees(comp.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats / Side Column */}
          <div className="space-y-6">
            {/* Net Pay Highlight */}
            <Card className="bg-primary text-primary-foreground border-none shadow-xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-primary-foreground/80">Monthly Take Home</CardDescription>
                <CardTitle className="text-3xl font-bold tracking-tight">
                  {formatRupees(netMonthly)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-primary-foreground/70 bg-primary-foreground/10 p-2 rounded inline-block">
                  After all deductions
                </div>
              </CardContent>
            </Card>

            {/* Details List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Effective Date</span>
                  <span className="font-medium">{new Date(activeStructure.effectiveDate).toLocaleDateString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Award className="w-4 h-4" /> Grade</span>
                  <span className="font-medium">{activeStructure.grade || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Department</span>
                  <span className="font-medium">{activeStructure.department || '-'}</span>
                </div>
                {activeStructure.notes && (
                  <div className="pt-4 text-sm text-muted-foreground italic">
                    "{activeStructure.notes}"
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
          <div className="bg-primary/10 p-6 rounded-full mb-4">
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No Salary Structure Setup</h3>
          <p className="text-sm text-muted-foreground max-w-sm text-center mt-2 mb-6">
            Add your current salary details to get insights into your earnings, deductions, and monthly take-home.
          </p>
          <Button onClick={() => setShowForm(true)}>Add Compensation Plan</Button>
        </div>
      )}

      {/* History Section using Tabs */}
      <div className="mt-12">
        <Tabs defaultValue="history" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              History
            </h2>
            <TabsList>
              <TabsTrigger value="history">Timeline</TabsTrigger>
              <TabsTrigger value="list">All Structures</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="history" className="mt-0">
            <Card>
              <CardContent className="p-6">
                {salaryHistory.length > 0 ? (
                  <div className="relative border-l border-border ml-3 space-y-8 py-2">
                    {salaryHistory.map((item, i) => {
                      const prevItem = salaryHistory[i + 1]; // Previous entry (older)
                      const allowances = typeof item.allowances === 'string' ? JSON.parse(item.allowances || '{}') : (item.allowances || {});
                      const deductions = typeof item.deductions === 'string' ? JSON.parse(item.deductions || '{}') : (item.deductions || {});
                      const contributions = typeof item.employerContributions === 'string' ? JSON.parse(item.employerContributions || '{}') : (item.employerContributions || {});
                      const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                      const totalDeductions = Object.values(deductions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                      const totalContributions = Object.values(contributions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                      const monthlyBase = Number(item.baseSalary) / 12;
                      const grossMonthly = monthlyBase + totalAllowances;
                      const netMonthly = grossMonthly - totalDeductions;
                      const ctc = grossMonthly + totalContributions;

                      return (
                        <div
                          key={item.id}
                          className="ml-6 relative cursor-pointer group"
                          onClick={() => setSelectedHistoryItem(item)}
                        >
                          <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary ring-4 ring-background group-hover:ring-primary/20 transition-all" />
                          <div className="p-4 -m-4 rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                              <p className="text-sm font-medium text-muted-foreground">
                                {new Date(item.effectiveDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                              <Badge variant="outline" className="w-fit text-xs">{getChangeTypeLabel(item.changeType)}</Badge>
                            </div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{item.jobTitle} at {item.company}</h3>
                            <div className="mt-2 p-3 bg-muted/40 rounded-lg text-sm grid grid-cols-3 gap-4 max-w-lg">
                              <div>
                                <p className="text-muted-foreground text-xs uppercase">Base (Annual)</p>
                                <p className="font-medium">{formatRupees(Number(item.baseSalary))}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase">Take Home</p>
                                <p className="font-medium text-green-600 dark:text-green-400">{formatRupees(netMonthly)}/mo</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase">CTC</p>
                                <p className="font-medium text-primary">{formatRupees(ctc * 12)}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <ChevronRight className="w-3 h-3" /> Click to view full breakdown
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No history available yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            <div className="grid gap-4">
              {salaryStructures.map(structure => (
                <Card key={structure.id} className={`transition-all hover:bg-accent/40 ${structure.isActive ? 'border-primary/50 bg-primary/5' : ''}`}>
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{structure.jobTitle}</h4>
                        {structure.isActive && <Badge>Active</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{structure.company} • {new Date(structure.effectiveDate).getFullYear()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatRupees(Number(structure.baseSalary))}</p>
                      <p className="text-xs text-muted-foreground">Annual Base</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(structure)}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(structure.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* History Detail Sheet */}
      <Sheet open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedHistoryItem && (() => {
            const item = selectedHistoryItem;
            const allowances = typeof item.allowances === 'string' ? JSON.parse(item.allowances || '{}') : (item.allowances || {});
            const deductions = typeof item.deductions === 'string' ? JSON.parse(item.deductions || '{}') : (item.deductions || {});
            const contributions = typeof item.employerContributions === 'string' ? JSON.parse(item.employerContributions || '{}') : (item.employerContributions || {});
            const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
            const totalDeductions = Object.values(deductions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
            const totalContributions = Object.values(contributions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
            const monthlyBase = Number(item.baseSalary) / 12;
            const grossMonthly = monthlyBase + totalAllowances;
            const netMonthly = grossMonthly - totalDeductions;
            const ctc = grossMonthly + totalContributions;

            return (
              <>
                <SheetHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{getChangeTypeLabel(item.changeType)}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(item.effectiveDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <SheetTitle className="text-2xl">{item.jobTitle}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <Building className="w-4 h-4" /> {item.company}
                    {item.location && <><MapPin className="w-4 h-4 ml-2" /> {item.location}</>}
                  </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Take Home (Monthly)</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatRupees(netMonthly)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CTC (Annual)</p>
                        <p className="text-2xl font-bold text-primary">{formatRupees(ctc * 12)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Base Salary */}
                  <div className="bg-muted/40 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Base Salary (Annual)</span>
                      <span className="font-bold">{formatRupees(Number(item.baseSalary))}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                      <span>Monthly</span>
                      <span>{formatRupees(monthlyBase)}</span>
                    </div>
                  </div>

                  {/* Allowances */}
                  {Object.keys(allowances).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" /> Allowances
                      </h4>
                      <div className="space-y-2 bg-green-500/5 rounded-lg p-3">
                        {Object.entries(allowances).map(([name, amount]) => (
                          <div key={name} className="flex justify-between text-sm">
                            <span>{name}</span>
                            <span className="text-green-600 dark:text-green-400">+{formatRupees(Number(amount))}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total Allowances</span>
                          <span className="text-green-600 dark:text-green-400">+{formatRupees(totalAllowances)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Deductions */}
                  {Object.keys(deductions).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-red-500" /> Deductions
                      </h4>
                      <div className="space-y-2 bg-red-500/5 rounded-lg p-3">
                        {Object.entries(deductions).map(([name, amount]) => (
                          <div key={name} className="flex justify-between text-sm">
                            <span>{name}</span>
                            <span className="text-red-500">-{formatRupees(Number(amount))}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total Deductions</span>
                          <span className="text-red-500">-{formatRupees(totalDeductions)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employer Contributions */}
                  {Object.keys(contributions).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" /> Employer Contributions
                      </h4>
                      <div className="space-y-2 bg-blue-500/5 rounded-lg p-3">
                        {Object.entries(contributions).map(([name, amount]) => (
                          <div key={name} className="flex justify-between text-sm">
                            <span>{name}</span>
                            <span className="text-blue-500">+{formatRupees(Number(amount))}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total Employer Contributions</span>
                          <span className="text-blue-500">+{formatRupees(totalContributions)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    {item.department && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Department</p>
                        <p className="font-medium">{item.department}</p>
                      </div>
                    )}
                    {item.grade && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Grade / Level</p>
                        <p className="font-medium">{item.grade}</p>
                      </div>
                    )}
                  </div>

                  {/* Change Reason */}
                  {item.changeReason && (
                    <div className="bg-muted/40 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Change Reason</p>
                      <p className="font-medium">{item.changeReason}</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
