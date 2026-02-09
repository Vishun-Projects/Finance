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
  MessageSquare
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

                <Button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] py-6 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all" size="lg">
                  {editingStructure ? 'Update Architecture' : 'Deploy Structure'}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {activeStructure ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="glass-card md:col-span-2 p-6 md:p-8 rounded-3xl flex flex-col relative overflow-hidden group shadow-xl shadow-primary/5 border-l-4 border-l-primary/40">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform group-hover:scale-110 duration-1000">
              <Briefcase className="w-32 h-32 md:w-48 md:h-48" />
            </div>

            <div className="relative z-10 flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl md:text-3xl font-black flex flex-wrap items-center gap-3 font-display tracking-tight">
                  {activeStructure.jobTitle}
                  <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1">Active Pulse</Badge>
                </h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs md:text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-70">
                  <span className="flex items-center gap-2"><Building className="w-4 h-4 text-primary" /> {activeStructure.company}</span>
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {activeStructure.location || 'Remote'}</span>
                </div>
              </div>
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl md:rounded-3xl glass-card border-primary/20 flex items-center justify-center text-xl md:text-2xl font-black text-primary font-display shadow-2xl shadow-primary/10 group-hover:rotate-6 transition-transform">
                {activeStructure.company.substring(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 md:p-6 rounded-2xl md:rounded-3xl bg-primary/5 border border-dashed border-primary/20 relative z-10">
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Gross Annual</p>
                <p className="text-lg md:text-2xl font-bold text-foreground font-display tracking-tight">{formatRupees(grossAnnual)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Total CTC</p>
                <p className="text-lg md:text-2xl font-bold text-blue-500 font-display tracking-tight">{formatRupees(annualCTC)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Allowances</p>
                <p className="text-lg md:text-2xl font-bold text-emerald-500 font-display tracking-tight">+{formatRupees(totalMonthlyAllowances)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Deductions</p>
                <p className="text-lg md:text-2xl font-bold text-rose-500 font-display tracking-tight">-{formatRupees(totalMonthlyDeductions)}</p>
              </div>
            </div>

            {/* Visual Breakdown */}
            <div className="mt-8 flex flex-col lg:flex-row items-center gap-8 relative z-10 pt-8 border-t border-border/10">
              <div className="h-40 w-40 md:h-48 md:w-48 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salaryComponents}
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {salaryComponents.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Components</span>
                  <span className="text-2xl font-black font-display text-primary">{salaryComponents.length}</span>
                </div>
              </div>
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground col-span-full mb-2">Compensation Architecture</h4>
                {salaryComponents.map((comp, i) => (
                  <div key={comp.name} className="flex items-center justify-between text-xs border-b border-border/5 pb-2 group/item">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground font-bold uppercase tracking-widest text-[9px] group-hover/item:text-foreground transition-colors">{comp.name}</span>
                    </div>
                    <span className="font-bold font-display opacity-80 text-sm">{formatRupees(comp.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats / Side Column */}
          <div className="space-y-6">
            {/* Net Pay Highlight */}
            <div className="glass-card p-6 md:p-8 rounded-3xl bg-foreground text-background border-none shadow-2xl shadow-primary/20 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 bg-background/10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-3">Monthly Liquid Surplus</p>
                <p className="text-4xl md:text-5xl font-black tracking-tighter font-display mb-6">
                  {formatRupees(netMonthly)}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/10 rounded-xl text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Net Yield
                </div>
              </div>
            </div>

            {/* Details List */}
            <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6 shadow-xl shadow-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Contractual Meta</p>
              </div>

              <div className="flex justify-between items-center text-[10px] md:text-xs group">
                <span className="text-muted-foreground flex items-center gap-3 font-black uppercase tracking-widest group-hover:text-primary transition-colors"><Calendar className="w-4 h-4" /> Start Date</span>
                <span className="font-black font-display tracking-widest">{new Date(activeStructure.effectiveDate).toLocaleDateString()}</span>
              </div>
              <div className="w-full h-px bg-border/10"></div>

              <div className="flex justify-between items-center text-[10px] md:text-xs group">
                <span className="text-muted-foreground flex items-center gap-3 font-black uppercase tracking-widest group-hover:text-primary transition-colors"><Award className="w-4 h-4" /> Grade</span>
                <span className="font-black font-display tracking-widest text-primary">{activeStructure.grade || 'N/A'}</span>
              </div>
              <div className="w-full h-px bg-border/10"></div>

              <div className="flex justify-between items-center text-[10px] md:text-xs group">
                <span className="text-muted-foreground flex items-center gap-3 font-black uppercase tracking-widest group-hover:text-primary transition-colors"><Users className="w-4 h-4" /> Dept</span>
                <span className="font-black font-display tracking-widest">{activeStructure.department || 'GLOBAL'}</span>
              </div>

              {activeStructure.notes && (
                <div className="rounded-2xl bg-primary/5 p-5 border border-primary/10 mt-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><MessageSquare className="w-4 h-4" /></div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-2">Strategic Notes</p>
                  <p className="text-xs text-muted-foreground/80 font-medium italic leading-relaxed">"{activeStructure.notes}"</p>
                </div>
              )}
            </div>
          </div>
        </div>

      ) : (
        <div className="flex flex-col items-center justify-center p-12 md:p-20 glass-card rounded-[2.5rem] bg-primary/5 border-dashed border-primary/20 shadow-2xl shadow-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
          <div className="bg-primary/10 p-8 rounded-3xl mb-8 relative z-10 shadow-inner">
            <DollarSign className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black font-display tracking-tight relative z-10">Economic Engine Offline</h3>
          <p className="text-xs md:text-sm text-muted-foreground max-w-sm text-center mt-3 mb-10 font-medium opacity-70 relative z-10 leading-relaxed">
            Your compensation architecture is currently unmapped. Deploy your first salary structure to begin financial trajectory modeling.
          </p>
          <Button
            onClick={() => setShowForm(true)}
            size="lg"
            className="rounded-2xl px-10 py-7 text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all relative z-10"
          >
            Map First Structure
          </Button>
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
            <div className="space-y-6 pt-4">
              {salaryHistory.length > 0 ? (
                <div className="relative space-y-8 pl-4 py-2">
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

                  {salaryHistory.map((item, i) => {
                    const allowances = typeof item.allowances === 'string' ? JSON.parse(item.allowances || '{}') : (item.allowances || {});
                    const deductions = typeof item.deductions === 'string' ? JSON.parse(item.deductions || '{}') : (item.deductions || {});
                    const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                    const totalDeductions = Object.values(deductions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                    const grossMonthly = (Number(item.baseSalary) / 12) + totalAllowances;
                    const netMonthly = grossMonthly - totalDeductions;

                    return (
                      <div
                        key={item.id}
                        className="pl-10 relative cursor-pointer group/item"
                        onClick={() => setSelectedHistoryItem(item)}
                      >
                        <span className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] group-hover/item:scale-150 transition-transform duration-500 z-10" />

                        <div className="glass-card p-6 rounded-2xl hover:bg-muted/10 transition-all border-l-4 border-l-primary/30 group-hover/item:border-l-primary group-hover/item:translate-x-1 shadow-lg shadow-black/5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mb-1">
                                {new Date(item.effectiveDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                              </p>
                              <h3 className="font-bold text-lg group-hover/item:text-primary transition-colors font-display tracking-tight leading-tight">{item.jobTitle}</h3>
                              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest flex items-center gap-2">
                                <Building className="w-3 h-3 text-primary/50" /> {item.company}
                              </p>
                            </div>
                            <Badge variant="outline" className="w-fit text-[8px] font-black uppercase tracking-widest py-1 border-primary/20 text-primary-foreground/70 bg-primary/5">{getChangeTypeLabel(item.changeType)}</Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-border/5">
                            <div>
                              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Base Analysis</p>
                              <p className="font-bold text-sm md:text-base font-display">{formatRupees(Number(item.baseSalary))}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Net Monthly</p>
                              <p className="font-bold text-sm md:text-base text-emerald-500 font-display">{formatRupees(netMonthly)}</p>
                            </div>
                            <div className="hidden md:block">
                              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Status</p>
                              <p className="font-black text-[10px] uppercase tracking-widest text-primary/70">Verified</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-12 glass-card rounded-3xl text-center border-dashed border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">No archival records found</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            <div className="grid gap-4 pt-4">
              {salaryStructures.map(structure => (
                <div
                  key={structure.id}
                  className={`glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all border-l-4 ${structure.isActive ? 'border-l-primary bg-primary/5 shadow-xl shadow-primary/5' : 'border-l-transparent hover:border-l-primary/30 hover:bg-muted/10'
                    }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-lg font-display tracking-tight">{structure.jobTitle}</h4>
                      {structure.isActive && (
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">Active Pulse</Badge>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 opacity-60">
                      <Building className="w-3.5 h-3.5" /> {structure.company} • {new Date(structure.effectiveDate).getFullYear()} Archives
                    </p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm md:text-lg font-black font-display">{formatRupees(Number(structure.baseSalary))}</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">Annual Base</p>
                    </div>
                    <div className="flex gap-2">
                      {!structure.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl h-10 w-10 p-0"
                          onClick={() => handleSetActive(structure.id)}
                          title="Set as Active"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => handleEdit(structure)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-colors" onClick={() => handleDelete(structure.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* History Detail Sheet */}
      <Sheet open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-background/80 backdrop-blur-xl border-l border-border/40 p-0">
          {selectedHistoryItem && (() => {
            const item = selectedHistoryItem;
            const allowances = typeof item.allowances === 'string' ? JSON.parse(item.allowances || '{}') : (item.allowances || {});
            const deductions = typeof item.deductions === 'string' ? JSON.parse(item.deductions || '{}') : (item.deductions || {});
            const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
            const totalDeductions = Object.values(deductions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
            const monthlyBase = Number(item.baseSalary) / 12;
            const grossMonthly = monthlyBase + totalAllowances;
            const netMonthly = grossMonthly - totalDeductions;

            return (
              <div className="p-8 space-y-10">
                <SheetHeader className="pb-8 border-b border-border/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-primary/5 text-primary border-primary/20">{getChangeTypeLabel(item.changeType)}</Badge>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {new Date(item.effectiveDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <SheetTitle className="text-3xl font-black font-display tracking-tight leading-tight mb-2">{item.jobTitle}</SheetTitle>
                    <SheetDescription className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-2"><Building className="w-4 h-4 text-primary" /> {item.company}</span>
                      {item.location && <span className="flex items-center gap-2 font-black"><MapPin className="w-4 h-4 text-primary" /> {item.location}</span>}
                    </SheetDescription>
                  </div>
                </SheetHeader>

                <div className="space-y-8">
                  {/* Primary Grid Analysis */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-6 rounded-3xl bg-emerald-500/5 border-emerald-500/10 text-center flex flex-col items-center justify-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-3 opacity-60">Net Yield (Monthly)</p>
                      <p className="text-2xl font-black text-emerald-500 font-display tracking-tight leading-none">{formatRupees(netMonthly)}</p>
                    </div>
                    <div className="glass-card p-6 rounded-3xl bg-primary/5 border-primary/10 text-center flex flex-col items-center justify-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-3 opacity-60">Base Portfolio (Annual)</p>
                      <p className="text-2xl font-black text-primary font-display tracking-tight leading-none">{formatRupees(Number(item.baseSalary))}</p>
                    </div>
                  </div>

                  {/* Operational Details */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 flex items-center gap-2">
                        <History className="w-4 h-4 opacity-50" /> Architectural Breakdown
                      </h4>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 rounded-2xl bg-muted/20 border border-border/5 group">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Base</span>
                          <span className="font-bold font-display text-base">{formatRupees(monthlyBase)}</span>
                        </div>

                        {Object.keys(allowances).length > 0 && (
                          <div className="space-y-3 rounded-2xl bg-emerald-500/[0.02] p-5 border border-emerald-500/10">
                            {Object.entries(allowances).map(([name, amount]) => (
                              <div key={name} className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-medium uppercase tracking-widest text-[9px]">{name}</span>
                                <span className="text-emerald-500 font-bold font-display">+{formatRupees(Number(amount))}</span>
                              </div>
                            ))}
                            <div className="h-px bg-emerald-500/10 my-2" />
                            <div className="flex justify-between items-center text-emerald-500">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Benefits</span>
                              <span className="font-black font-display text-lg">+{formatRupees(totalAllowances)}</span>
                            </div>
                          </div>
                        )}

                        {Object.keys(deductions).length > 0 && (
                          <div className="space-y-3 rounded-2xl bg-rose-500/[0.02] p-5 border border-rose-500/10">
                            {Object.entries(deductions).map(([name, amount]) => (
                              <div key={name} className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-medium uppercase tracking-widest text-[9px]">{name}</span>
                                <span className="text-rose-500 font-bold font-display">-{formatRupees(Number(amount))}</span>
                              </div>
                            ))}
                            <div className="h-px bg-rose-500/10 my-2" />
                            <div className="flex justify-between items-center text-rose-500">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Deductions</span>
                              <span className="font-black font-display text-lg">-{formatRupees(totalDeductions)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata Context */}
                    <div className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-muted/20 border border-border/5">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Corporate Dept</p>
                        <p className="font-bold text-xs font-display tracking-widest text-foreground">{item.department || 'GLOBAL OPS'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status Grade</p>
                        <p className="font-bold text-xs font-display tracking-widest text-primary">{item.grade || 'N/A'}</p>
                      </div>
                    </div>

                    {item.changeReason && (
                      <div className="rounded-2xl bg-primary/5 p-6 border border-primary/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:rotate-12 transition-transform"><Plus className="w-5 h-5 text-primary" /></div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-3">Historical Context</p>
                        <p className="text-xs text-muted-foreground/80 font-medium italic leading-relaxed">"{item.changeReason}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
