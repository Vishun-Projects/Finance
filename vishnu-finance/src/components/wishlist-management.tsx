'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Gift, 
  DollarSign, 
  Calendar, 
  Tag, 
  Edit, 
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Star,
  ShoppingCart,
  Heart,
  Target
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCurrency } from '../contexts/CurrencyContext';
import { useToast } from '../contexts/ToastContext';
import PageSkeleton from './page-skeleton';
import { Combobox } from './ui/combobox';

interface WishlistItem {
  id: string;
  title: string;
  description?: string;
  estimatedCost: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: string;
  targetDate?: string;
  imageUrl?: string;
  notes?: string;
  tags?: string[];
  isCompleted: boolean;
  completedDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function WishlistManagement() {
  const { user, loading: authLoading } = useAuth();
  const { formatCurrency } = useCurrency();
  const { success, error: showError } = useToast();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimatedCost: '',
    priority: 'MEDIUM' as WishlistItem['priority'],
    category: '',
    targetDate: '',
    imageUrl: '',
    notes: '',
    tags: [] as string[]
  });

  // formatCurrency is now provided by the CurrencyContext

  useEffect(() => {
    if (user && !authLoading) {
      fetchWishlistItems();
    }
  }, [user, authLoading]);

  const fetchWishlistItems = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/wishlist?userId=${user.id}`);
      const raw = await response.json();

      if (!response.ok) {
        console.error('Error response when fetching wishlist items:', raw);
        showError('Error', raw?.error || 'Failed to fetch wishlist items');
        setWishlistItems([]);
        return;
      }

      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

      if (!Array.isArray(items)) {
        console.error('Unexpected wishlist payload shape:', raw);
        showError('Error', 'Unexpected response format for wishlist items');
        setWishlistItems([]);
        return;
      }

      // Parse tags from JSON strings to arrays and ensure estimatedCost is a number
      const processedData = items.map((item: any) => ({
        ...item,
        estimatedCost: Number(item.estimatedCost),
        tags: typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags || []
      }));
      setWishlistItems(processedData);
    } catch (error) {
      console.error('Error fetching wishlist items:', error);
      showError('Error', 'Failed to fetch wishlist items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const url = editingItem ? '/api/wishlist' : '/api/wishlist';
      const method = editingItem ? 'PUT' : 'POST';
      
      const payload = {
        ...(editingItem && { id: editingItem.id }),
        ...formData,
        userId: user.id,
        estimatedCost: parseFloat(formData.estimatedCost)
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowForm(false);
        setEditingItem(null);
        resetForm();
        fetchWishlistItems();
        success('Success', editingItem ? 'Wishlist item updated successfully!' : 'Wishlist item added successfully!');
      }
    } catch (error) {
      console.error('Error saving wishlist item:', error);
      showError('Error', 'Failed to save wishlist item');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      estimatedCost: '',
      priority: 'MEDIUM',
      category: '',
      targetDate: '',
      imageUrl: '',
      notes: '',
      tags: []
    });
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await fetch(`/api/wishlist?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchWishlistItems();
        success('Success', 'Wishlist item deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting wishlist item:', error);
      showError('Error', 'Failed to delete wishlist item');
    }
  };

  const handleToggleComplete = async (item: WishlistItem) => {
    if (!user) return;
    try {
      const response = await fetch('/api/wishlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isCompleted: !item.isCompleted,
          completedDate: !item.isCompleted ? new Date().toISOString() : null
        })
      });

      if (response.ok) {
        fetchWishlistItems();
      }
    } catch (error) {
      console.error('Error updating wishlist item:', error);
      showError('Error', 'Failed to update wishlist item');
    }
  };

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      estimatedCost: item.estimatedCost.toString(),
      priority: item.priority,
      category: item.category || '',
      targetDate: item.targetDate ? new Date(item.targetDate).toISOString().split('T')[0] : '',
      imageUrl: item.imageUrl || '',
      notes: item.notes || '',
      tags: item.tags || []
    });
    setShowForm(true);
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '🔥';
      case 'HIGH': return '⭐';
      case 'MEDIUM': return '📌';
      case 'LOW': return '📝';
      default: return '📌';
    }
  };

  const filteredItems = wishlistItems.filter(item => {
    const matchesSearchTerm = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority.toUpperCase();
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'completed' ? item.isCompleted : !item.isCompleted);

    return matchesSearchTerm && matchesPriority && matchesStatus;
  });

  const totalCost = wishlistItems
    .filter(item => !item.isCompleted)
    .reduce((sum, item) => sum + Number(item.estimatedCost), 0);

  const completedCount = wishlistItems.filter(item => item.isCompleted).length;
  const totalCount = wishlistItems.length;

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Wishlist & Bucket List</h2>
          <p className="text-muted-foreground">Track your dreams and aspirations</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-card rounded-lg shadow-md border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
            <div className="text-blue-600">
              <Tag className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-card rounded-lg shadow-md border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-card rounded-lg shadow-md border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
            </div>
            <div className="text-purple-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-card rounded-lg shadow-md border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </p>
            </div>
            <div className="text-orange-600">
              <Star className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterPriority('all')}
          className={`px-3 py-2 rounded-md text-sm font-medium ${filterPriority === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilterPriority('low')}
          className={`px-3 py-2 rounded-md text-sm font-medium ${filterPriority === 'low' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
        >
          Low ({wishlistItems.filter(item => item.priority === 'LOW').length})
        </button>
        <button
          onClick={() => setFilterPriority('medium')}
          className={`px-3 py-2 rounded-md text-sm font-medium ${filterPriority === 'medium' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
        >
          Medium ({wishlistItems.filter(item => item.priority === 'MEDIUM').length})
        </button>
        <button
          onClick={() => setFilterPriority('high')}
          className={`px-3 py-2 rounded-md text-sm font-medium ${filterPriority === 'high' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
        >
          High ({wishlistItems.filter(item => item.priority === 'HIGH').length})
        </button>
        <button
          onClick={() => setFilterPriority('critical')}
          className={`px-3 py-2 rounded-md text-sm font-medium ${filterPriority === 'critical' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
        >
          Critical ({wishlistItems.filter(item => item.priority === 'CRITICAL').length})
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
          <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl modal-content border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingItem ? 'Edit Wishlist Item' : 'Add New Wishlist Item'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input text-foreground"
                    placeholder="Enter item title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Estimated Cost *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.estimatedCost}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input text-foreground"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Priority
                  </label>
                  <Combobox
                    options={[
                      { value: 'LOW', label: 'Low' },
                      { value: 'MEDIUM', label: 'Medium' },
                      { value: 'HIGH', label: 'High' },
                      { value: 'CRITICAL', label: 'Critical' }
                    ]}
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: (value || 'LOW') as any }))}
                    placeholder="Select priority"
                    searchPlaceholder="Search priorities..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input text-foreground"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate}
                                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                                       onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                                       onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a tag"
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        addTag(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Add a tag"]') as HTMLInputElement;
                      if (input) {
                        addTag(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wishlist Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className={`p-4 bg-white rounded-lg shadow-md ${item.isCompleted ? 'opacity-75' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleComplete(item)}
                  className="text-gray-400 hover:text-green-600"
                >
                  {item.isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(item.priority)}`}>
                  {getPriorityIcon(item.priority)} {item.priority}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(item)}
                  className="text-gray-400 hover:text-blue-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-32 object-cover rounded-md mb-3"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}

            <h3 className={`font-semibold text-lg mb-2 ${item.isCompleted ? 'line-through' : ''}`}>
              {item.title}
            </h3>

            {item.description && (
              <p className="text-gray-600 text-sm mb-3">{item.description}</p>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-medium">{formatCurrency(item.estimatedCost)}</span>
              </div>

              {item.category && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span>{item.category}</span>
                </div>
              )}

              {item.targetDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>{new Date(item.targetDate).toLocaleDateString()}</span>
                </div>
              )}

              {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {item.notes && (
                <p className="text-xs text-gray-500 italic">{item.notes}</p>
              )}

              {item.isCompleted && item.completedDate && (
                <p className="text-xs text-green-600">
                  Completed on {new Date(item.completedDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Star className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filterPriority === 'all' ? 'No wishlist items yet' : 
             filterPriority === 'low' ? 'No low priority items' :
             filterPriority === 'medium' ? 'No medium priority items' :
             filterPriority === 'high' ? 'No high priority items' : 'No critical items'}
          </h3>
          <p className="text-gray-600">
            {filterPriority === 'all' ? 'Start building your bucket list by adding your first item!' :
             filterPriority === 'low' ? 'Complete some high priority items to see them here!' :
             filterPriority === 'medium' ? 'Complete some high priority items to see them here!' :
             filterPriority === 'high' ? 'Complete some critical items to see them here!' : 'Complete some items to see them here!'}
          </p>
        </div>
      )}
    </div>
  );
}
