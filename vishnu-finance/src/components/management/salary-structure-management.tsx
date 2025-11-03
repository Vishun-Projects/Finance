'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  Building, 
  Calendar,
  TrendingUp,
  Calculator,
  FileText,
  MapPin,
  Users,
  Award,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Share2,
  X
} from 'lucide-react';
import { SalaryStructure, SalaryHistory } from '../../types';
import { useAuth } from '../../hooks/useAuth';

export default function SalaryStructureManagement() {
  const { user, loading: authLoading } = useAuth();
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');

  // Form state
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    baseSalary: '',
    allowances: {} as Record<string, number>,
    deductions: {} as Record<string, number>,
    effectiveDate: '',
    endDate: '',
    currency: 'INR',
    location: '',
    department: '',
    grade: '',
    notes: '',
    changeType: 'OTHER' as SalaryHistory['changeType'],
    changeReason: ''
  });

  // Allowance/Deduction form state
  const [allowanceName, setAllowanceName] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [deductionName, setDeductionName] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      fetchSalaryStructures();
      fetchSalaryHistory();
    }
  }, [user, authLoading]);

  const fetchSalaryStructures = async () => {
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
  };

  const fetchSalaryHistory = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      const method = editingStructure ? 'PUT' : 'POST';
      const url = '/api/salary-structure';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: user.id,
          changeType: formData.changeType || 'OTHER',
          changeReason: formData.changeReason || 'Manual update'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (editingStructure) {
          setSalaryStructures(prev => 
            prev.map(structure => 
              structure.id === editingStructure.id ? result : structure
            )
          );
        } else {
          setSalaryStructures(prev => [result, ...prev]);
        }
        
        setFormData({
          jobTitle: '',
          company: '',
          baseSalary: '',
          allowances: {},
          deductions: {},
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
        setShowForm(false);
        setEditingStructure(null);
        
        // Refresh salary history
        fetchSalaryHistory();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save salary structure');
      }
    } catch (err) {
      console.error('Error saving salary structure:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this salary structure?')) return;
    
    try {
      const response = await fetch(`/api/salary-structure?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchSalaryStructures();
        fetchSalaryHistory();
      }
    } catch (error) {
      console.error('Error deleting salary structure:', error);
    }
  };

  const handleEdit = (structure: SalaryStructure) => {
    setEditingStructure(structure);
    setFormData({
      jobTitle: structure.jobTitle,
      company: structure.company,
      baseSalary: structure.baseSalary.toString(),
      allowances: structure.allowances || {},
      deductions: structure.deductions || {},
      effectiveDate: structure.effectiveDate.toString().split('T')[0],
      endDate: structure.endDate ? structure.endDate.toString().split('T')[0] : '',
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

  const resetForm = () => {
    setFormData({
      jobTitle: '',
      company: '',
      baseSalary: '',
      allowances: {},
      deductions: {},
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

  const addAllowance = () => {
    if (allowanceName && allowanceAmount) {
      setFormData(prev => ({
        ...prev,
        allowances: {
          ...prev.allowances,
          [allowanceName]: parseFloat(allowanceAmount)
        }
      }));
      setAllowanceName('');
      setAllowanceAmount('');
    }
  };

  const removeAllowance = (name: string) => {
    setFormData(prev => {
      const newAllowances = { ...prev.allowances };
      delete newAllowances[name];
      return { ...prev, allowances: newAllowances };
    });
  };

  const addDeduction = () => {
    if (deductionName && deductionAmount) {
      setFormData(prev => ({
        ...prev,
        deductions: {
          ...prev.deductions,
          [deductionName]: parseFloat(deductionAmount)
        }
      }));
      setDeductionName('');
      setDeductionAmount('');
    }
  };

  const removeDeduction = (name: string) => {
    setFormData(prev => {
      const newDeductions = { ...prev.deductions };
      delete newDeductions[name];
      return { ...prev, deductions: newDeductions };
    });
  };

  const calculateTotalAllowances = () => {
    return Object.values(formData.allowances).reduce((sum, amount) => sum + amount, 0);
  };

  const calculateTotalDeductions = () => {
    return Object.values(formData.deductions).reduce((sum, amount) => sum + amount, 0);
  };

  const calculateNetSalary = () => {
    const base = parseFloat(formData.baseSalary) || 0;
    const allowances = calculateTotalAllowances();
    const deductions = calculateTotalDeductions();
    return base + allowances - deductions;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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

  const activeStructure = salaryStructures.find(s => s.isActive);
  const totalSalaryHistory = salaryHistory.length;
  const averageSalaryChange = salaryHistory.length > 0 
    ? salaryHistory.reduce((sum, h) => sum + h.baseSalary, 0) / salaryHistory.length 
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="minimal-loading"></div>
        <span className="ml-3 text-muted">Loading salary data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-primary">Salary Structure Management</h2>
          <p className="text-muted">Track your compensation history and career progression</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="minimal-button-secondary flex items-center space-x-2"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="minimal-button-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Structure</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Active Structure</p>
              <p className="text-2xl font-bold text-primary">
                {activeStructure ? activeStructure.jobTitle : 'None'}
              </p>
            </div>
            <div className="minimal-stat-inset">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Current Salary</p>
              <p className="text-2xl font-bold text-success currency-inr">
                {activeStructure ? formatCurrency(activeStructure.baseSalary) : '₹0'}
              </p>
            </div>
            <div className="minimal-stat-inset">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Changes</p>
              <p className="text-2xl font-bold text-info">{totalSalaryHistory}</p>
            </div>
            <div className="minimal-stat-inset">
              <History className="w-6 h-6 text-info" />
            </div>
          </div>
        </div>

        <div className="minimal-stat">
      <div className="flex items-center justify-between">
        <div>
              <p className="text-sm font-medium text-muted">Avg. Salary</p>
              <p className="text-2xl font-bold text-warning currency-inr">
                {formatCurrency(averageSalaryChange)}
              </p>
            </div>
            <div className="minimal-stat-inset">
              <Calculator className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by job title or company..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 minimal-input"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value as any)}
            className="minimal-select"
          >
            <option value="all">All Structures</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <button className="minimal-button-small p-2">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Salary Structures Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStructures.map((structure) => {
          const allowances = structure.allowances || {};
          const deductions = structure.deductions || {};
          const totalAllowances = Object.values(allowances).reduce((sum: number, amount: any) => sum + amount, 0);
          const totalDeductions = Object.values(deductions).reduce((sum: number, amount: any) => sum + amount, 0);
          const netSalary = structure.baseSalary + totalAllowances - totalDeductions;

          return (
            <div key={structure.id} className="minimal-card p-6 hover-lift transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-primary">{structure.jobTitle}</h3>
                  <p className="text-sm text-muted">{structure.company}</p>
                  {structure.isActive && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success bg-opacity-10 text-success mt-1">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(structure)}
                    className="minimal-button-small p-2"
                    title="Edit structure"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(structure.id)}
                    className="minimal-button-small p-2 text-error hover:bg-error hover:text-white"
                    title="Delete structure"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted">Base Salary:</span>
                  <span className="font-semibold currency-inr">{formatCurrency(structure.baseSalary)}</span>
                </div>

                {Object.keys(allowances).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted mb-1">Allowances:</p>
                    {Object.entries(allowances).map(([name, amount]) => (
                      <div key={name} className="flex justify-between text-sm">
                        <span className="text-muted">{name}:</span>
                        <span className="text-success font-medium">+{formatCurrency(amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {Object.keys(deductions).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted mb-1">Deductions:</p>
                    {Object.entries(deductions).map(([name, amount]) => (
                      <div key={name} className="flex justify-between text-sm">
                        <span className="text-muted">{name}:</span>
                        <span className="text-error font-medium">-{formatCurrency(amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-primary">Net Salary:</span>
                    <span className="text-lg font-bold text-success currency-inr">{formatCurrency(netSalary)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-muted">
                  <Calendar className="w-4 h-4" />
                  <span>Effective: {new Date(structure.effectiveDate).toLocaleDateString()}</span>
                </div>

                {structure.location && (
                  <div className="flex items-center space-x-2 text-sm text-muted">
                    <MapPin className="w-4 h-4" />
                    <span>{structure.location}</span>
                  </div>
                )}

                {structure.department && (
                  <div className="flex items-center space-x-2 text-sm text-muted">
                    <Users className="w-4 h-4" />
                    <span>{structure.department}</span>
                  </div>
                )}

                {structure.grade && (
                  <div className="flex items-center space-x-2 text-sm text-muted">
                    <Award className="w-4 h-4" />
                    <span>Grade: {structure.grade}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredStructures.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Salary Structures</h3>
          <p className="text-muted mb-4">Add your first salary structure to start tracking your compensation</p>
          <button
            onClick={() => setShowForm(true)}
            className="minimal-button-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Salary Structure
          </button>
        </div>
      )}

      {/* Salary History Section */}
      {showHistory && (
        <div className="minimal-card p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-primary">Salary History</h3>
            <div className="flex space-x-2">
              <button className="minimal-button-small p-2">
                <Download className="w-4 h-4" />
              </button>
              <button className="minimal-button-small p-2">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {salaryHistory.map((history) => (
              <div key={history.id} className="minimal-card-inset p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getChangeTypeIcon(history.changeType)}
                    <div>
                      <h4 className="font-medium text-primary">{history.jobTitle}</h4>
                      <p className="text-sm text-muted">{history.company}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-success font-medium currency-inr">
                          {formatCurrency(history.baseSalary)}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(history.effectiveDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted">
                      {getChangeTypeLabel(history.changeType)}
                    </span>
                    {history.changeReason && (
                      <p className="text-xs text-muted mt-1">{history.changeReason}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {salaryHistory.length === 0 && (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted">No salary history available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-primary">
                {editingStructure ? 'Edit Salary Structure' : 'Add Salary Structure'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingStructure(null);
                  resetForm();
                }}
                className="minimal-button-small p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                    className="minimal-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Company *
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="minimal-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Base Salary *
                  </label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, baseSalary: e.target.value }))}
                    className="minimal-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="minimal-select"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    className="minimal-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="minimal-input"
                  />
                </div>

                <div>
                  <label className="block text.sm font-medium text-primary mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="minimal-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="minimal-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                    className="minimal-input"
                  />
                </div>
              </div>

              {/* Change Details (for editing) */}
              {editingStructure && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Change Type
                    </label>
                    <select
                      value={formData.changeType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, changeType: e.target.value as any }))}
                      className="minimal-select"
                    >
                      <option value="PROMOTION">Promotion</option>
                      <option value="SALARY_REVISION">Salary Revision</option>
                      <option value="COMPANY_CHANGE">Company Change</option>
                      <option value="LOCATION_CHANGE">Location Change</option>
                      <option value="DEPARTMENT_CHANGE">Department Change</option>
                      <option value="TRANSFER">Transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Change Reason
                    </label>
                    <input
                      type="text"
                      value={formData.changeReason}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
                      className="minimal-input"
                      placeholder="Brief reason for the change..."
                    />
                  </div>
                </div>
              )}

              {/* Allowances */}
              <div>
                <h4 className="text-lg font-medium text-primary mb-3">Allowances</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Allowance name"
                    value={allowanceName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllowanceName(e.target.value)}
                    className="minimal-input"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={allowanceAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllowanceAmount(e.target.value)}
                    className="minimal-input"
                  />
                  <button type="button" onClick={addAllowance} className="minimal-button-secondary">
                    Add Allowance
                  </button>
                </div>

                {Object.keys(formData.allowances).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(formData.allowances).map(([name, amount]) => (
                      <div key={name} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                        <span className="font-medium text-green-800">{name}: +{formatCurrency(amount)}</span>
                        <button
                          type="button"
                          onClick={() => removeAllowance(name)}
                          className="minimal-button-small p-1 text-error hover:bg-error hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-lg font-medium text-primary mb-3">Deductions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Deduction name"
                    value={deductionName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeductionName(e.target.value)}
                    className="minimal-input"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={deductionAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeductionAmount(e.target.value)}
                    className="minimal-input"
                  />
                  <button type="button" onClick={addDeduction} className="minimal-button-secondary">
                    Add Deduction
                  </button>
                </div>

                {Object.keys(formData.deductions).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(formData.deductions).map(([name, amount]) => (
                      <div key={name} className="flex items-center justify-between bg-red-50 p-3 rounded-lg">
                        <span className="font-medium text-red-800">{name}: -{formatCurrency(amount)}</span>
                        <button
                          type="button"
                          onClick={() => removeDeduction(name)}
                          className="minimal-button-small p-1 text-error hover:bg-error hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Salary Summary */}
              <div className="bg-secondary p-4 rounded-lg">
                <h4 className="text-lg font-medium text-primary mb-3">Salary Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Salary:</span>
                    <span className="font-medium currency-inr">{formatCurrency(parseFloat(formData.baseSalary) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>Total Allowances:</span>
                    <span className="font-medium">+{formatCurrency(calculateTotalAllowances())}</span>
                  </div>
                  <div className="flex justify-between text-error">
                    <span>Total Deductions:</span>
                    <span className="font-medium">-{formatCurrency(calculateTotalDeductions())}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Net Salary:</span>
                    <span className="text-success currency-inr">{formatCurrency(calculateNetSalary())}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="minimal-textarea"
                  placeholder="Additional notes about this salary structure..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingStructure(null);
                    resetForm();
                  }}
                  className="minimal-button-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="minimal-button-primary">
                  {editingStructure ? 'Update' : 'Create'} Salary Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


