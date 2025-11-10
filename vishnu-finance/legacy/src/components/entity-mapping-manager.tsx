'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, Edit, Users, Store, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Combobox } from './ui/combobox';

interface EntityMapping {
  id: string;
  userId: string;
  canonicalName: string;
  mappedNames: string[];
  entityType: 'PERSON' | 'STORE';
  createdAt: string;
  updatedAt: string;
}

interface EntityMappingManagerProps {
  entityType: 'PERSON' | 'STORE';
  onClose?: () => void;
}

export function EntityMappingManager({ entityType, onClose }: EntityMappingManagerProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [mappings, setMappings] = useState<EntityMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableNames, setAvailableNames] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [canonicalName, setCanonicalName] = useState('');
  const [editingMapping, setEditingMapping] = useState<EntityMapping | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch mappings
  const fetchMappings = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/entity-mappings?userId=${user.id}&type=${entityType}`);
      if (response.ok) {
        const data = await response.json();
        setMappings(data);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      showError('Error', 'Failed to fetch entity mappings');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available names from income/expense
  const fetchAvailableNames = async () => {
    if (!user?.id) return;

    try {
      const field = entityType === 'PERSON' ? 'personName' : 'store';
      const allNames = new Set<string>();

      // Fetch from income
      const incomeResponse = await fetch(`/api/income?userId=${user.id}`);
      if (incomeResponse.ok) {
        const incomeResponseData = await incomeResponse.json();
        // Handle paginated response structure
        const incomeData = Array.isArray(incomeResponseData) ? incomeResponseData : (incomeResponseData.data || []);
        incomeData.forEach((item: any) => {
          const name = item[field];
          if (name && name.trim()) {
            allNames.add(name.trim());
          }
        });
      }

      // Fetch from expenses
      const expenseResponse = await fetch(`/api/expenses?userId=${user.id}`);
      if (expenseResponse.ok) {
        const expenseResponseData = await expenseResponse.json();
        // Handle paginated response structure
        const expenseData = Array.isArray(expenseResponseData) ? expenseResponseData : (expenseResponseData.data || []);
        expenseData.forEach((item: any) => {
          const name = item[field];
          if (name && name.trim()) {
            allNames.add(name.trim());
          }
        });
      }

      // Filter out names that are already canonical names
      const canonicalNames = new Set(mappings.map(m => m.canonicalName.toLowerCase()));
      const filteredNames = Array.from(allNames).filter(
        name => !canonicalNames.has(name.toLowerCase())
      );

      setAvailableNames(filteredNames.sort());
    } catch (error) {
      console.error('Error fetching available names:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMappings();
    }
  }, [user?.id, entityType]);

  useEffect(() => {
    if (user?.id) {
      fetchAvailableNames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mappings.length]);

  const handleCreateMapping = async () => {
    if (!user?.id || !canonicalName.trim() || selectedNames.length === 0) {
      showError('Validation Error', 'Please select names and provide a canonical name');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/entity-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          canonicalName: canonicalName.trim(),
          mappedNames: selectedNames,
          entityType,
        }),
      });

      if (response.ok) {
        success('Success', 'Entity mapping created successfully');
        setCanonicalName('');
        setSelectedNames([]);
        await fetchMappings();
        await fetchAvailableNames();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create mapping');
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to create entity mapping');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMapping = async () => {
    if (!editingMapping || !canonicalName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/entity-mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMapping.id,
          canonicalName: canonicalName.trim(),
          mappedNames: selectedNames,
        }),
      });

      if (response.ok) {
        success('Success', 'Entity mapping updated successfully');
        setEditingMapping(null);
        setCanonicalName('');
        setSelectedNames([]);
        await fetchMappings();
        await fetchAvailableNames();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update mapping');
      }
    } catch (error) {
      console.error('Error updating mapping:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to update entity mapping');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const response = await fetch(`/api/entity-mappings?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        success('Success', 'Entity mapping deleted successfully');
        await fetchMappings();
        await fetchAvailableNames();
      } else {
        throw new Error('Failed to delete mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      showError('Error', 'Failed to delete entity mapping');
    }
  };

  const handleEdit = (mapping: EntityMapping) => {
    setEditingMapping(mapping);
    setCanonicalName(mapping.canonicalName);
    setSelectedNames(mapping.mappedNames);
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
    setCanonicalName('');
    setSelectedNames([]);
  };

  const toggleNameSelection = (name: string) => {
    setSelectedNames(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  if (isLoading) {
    return (
      <div className="minimal-card p-8">
        <div className="text-center py-8">
          <div className="minimal-loading mx-auto mb-4"></div>
          <p className="text-muted">Loading mappings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="minimal-card p-8 animate-scale-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {entityType === 'PERSON' ? (
            <Users className="w-6 h-6 text-primary" />
          ) : (
            <Store className="w-6 h-6 text-primary" />
          )}
          <h3 className="text-xl font-bold text-primary">
            {entityType === 'PERSON' ? 'Person Name' : 'Store Name'} Unification
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="minimal-button-small p-2">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Create/Edit Form */}
        <div className="minimal-card-inset p-6">
          <h4 className="font-semibold text-primary mb-4">
            {editingMapping ? 'Edit Mapping' : 'Create New Mapping'}
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Canonical Name (Unified Name)
              </label>
              <input
                type="text"
                value={canonicalName}
                onChange={(e) => setCanonicalName(e.target.value)}
                className="minimal-input w-full"
                placeholder={`Enter unified ${entityType === 'PERSON' ? 'person' : 'store'} name`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Select Names to Map
              </label>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {availableNames.length === 0 ? (
                  <p className="text-sm text-muted">No available names found</p>
                ) : (
                  availableNames.map((name) => (
                    <label
                      key={name}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedNames.includes(name)}
                        onChange={() => toggleNameSelection(name)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedNames.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted mb-1">Selected ({selectedNames.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                      >
                        {name}
                        <button
                          onClick={() => toggleNameSelection(name)}
                          className="ml-1 hover:text-error"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              {editingMapping ? (
                <>
                  <button
                    onClick={handleUpdateMapping}
                    disabled={isSaving || !canonicalName.trim()}
                    className="minimal-button-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Update Mapping</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="minimal-button-secondary flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCreateMapping}
                  disabled={isSaving || !canonicalName.trim() || selectedNames.length === 0}
                  className="minimal-button-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Mapping</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Existing Mappings */}
        <div>
          <h4 className="font-semibold text-primary mb-4">Existing Mappings</h4>
          {mappings.length === 0 ? (
            <div className="minimal-card-inset p-6 text-center text-muted">
              No mappings found. Create your first mapping above.
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="minimal-card-inset p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-primary">{mapping.canonicalName}</span>
                        <span className="text-xs text-muted">({mapping.mappedNames.length} names)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {mapping.mappedNames.map((name, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(mapping)}
                        className="minimal-button-small p-2 text-primary hover:bg-primary hover:text-white"
                        title="Edit mapping"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="minimal-button-small p-2 text-error hover:bg-error hover:text-white"
                        title="Delete mapping"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

