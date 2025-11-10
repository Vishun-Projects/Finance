'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Save, X, Camera, MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuth } from '@/contexts/AuthContext';
import type { User as AuthUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fetchLocationByPincode, validateIndianPhoneNumber } from '@/lib/pincode-api';
import { validateImageFile } from '@/lib/avatar-utils';

type ProfileSectionMode = 'standalone' | 'embedded';

interface ProfileSectionProps {
  mode?: ProfileSectionMode;
  initialProfile?: Partial<AuthUser> | null;
}

export function ProfileSettingsSection({ mode = 'embedded', initialProfile = null }: ProfileSectionProps) {
  const isStandalone = mode === 'standalone';
  const { user, refreshUser } = useAuth();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
 
  const hasBootstrapProfileRef = useRef(Boolean(initialProfile));

  const initialPincodeRef = useRef<string>('');
  const hasInitialLocationRef = useRef<boolean>(false);
  const lastLookupPincodeRef = useRef<string | null>(null);
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    phone: '',
    dateOfBirth: undefined as Date | undefined,
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    occupation: '',
    bio: '',
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const profile = initialProfile ?? user;
    if (!profile) {
      return;
    }

      const nextFormData = {
      name: profile.name || '',
      gender: profile.gender || '',
      phone: profile.phone || '',
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
      addressLine1: profile.addressLine1 || '',
      addressLine2: profile.addressLine2 || '',
      city: profile.city || '',
      state: profile.state || '',
      country: profile.country || 'India',
      pincode: profile.pincode || '',
      occupation: profile.occupation || '',
      bio: profile.bio || '',
      };
      setFormData(nextFormData);
    setAvatarUrl(profile.avatarUrl || null);

    initialPincodeRef.current = profile.pincode || '';
    hasInitialLocationRef.current = Boolean(profile.city && profile.state);
      if (nextFormData.pincode) {
        lastLookupPincodeRef.current = nextFormData.pincode;
      }
  }, [initialProfile, user]);

  const fetchProfile = useCallback(
    async ({ showSpinner = true }: { showSpinner?: boolean } = {}) => {
    if (!user?.id) return;

      if (showSpinner) {
    setLoading(true);
      }

    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        const profile = data.user;

        const nextFormData = {
          name: profile.name || '',
          gender: profile.gender || '',
          phone: profile.phone || '',
          dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
          addressLine1: profile.addressLine1 || '',
          addressLine2: profile.addressLine2 || '',
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || 'India',
          pincode: profile.pincode || '',
          occupation: profile.occupation || '',
          bio: profile.bio || '',
        };
        setFormData(nextFormData);
        setAvatarUrl(profile.avatarUrl || null);

        initialPincodeRef.current = profile.pincode || '';
        hasInitialLocationRef.current = Boolean(profile.city && profile.state);
        if (nextFormData.pincode) {
          lastLookupPincodeRef.current = nextFormData.pincode;
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
        if (showSpinner) {
      setLoading(false);
    }
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (hasBootstrapProfileRef.current) {
      hasBootstrapProfileRef.current = false;
      void fetchProfile({ showSpinner: false });
      return;
    }

    void fetchProfile({ showSpinner: true });
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    const pincode = formData.pincode;

    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
      lookupTimeoutRef.current = null;
    }

    if (!pincode || pincode.length !== 6) {
      return;
    }

    if (
      hasInitialLocationRef.current &&
      pincode === initialPincodeRef.current
    ) {
      return;
    }

    if (lastLookupPincodeRef.current === pincode) {
      return;
    }

    lookupTimeoutRef.current = setTimeout(async () => {
      setFetchingLocation(true);
      try {
        const result = await fetchLocationByPincode(pincode);
        if (result.success && result.data) {
          setFormData(prev => ({
            ...prev,
            city: result.data!.city,
            state: result.data!.state,
            country: result.data!.country || 'India',
          }));
        } else if (result.error) {
          showError('Lookup Failed', result.error);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        showError('Lookup Failed', 'Something went wrong while fetching the location.');
      } finally {
        setFetchingLocation(false);
        lastLookupPincodeRef.current = pincode;
        lookupTimeoutRef.current = null;
      }
    }, 600);

    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
        lookupTimeoutRef.current = null;
      }
    };
  }, [formData.pincode, showError]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (formData.phone && !validateIndianPhoneNumber(formData.phone)) {
      showError('Invalid Phone Number', 'Please enter a valid Indian phone number (10 digits, starting with 6-9)');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dateOfBirth: formData.dateOfBirth?.toISOString(),
        }),
      });

      if (response.ok) {
        await response.json();
        await refreshUser();
        success('Profile Updated', 'Your profile has been updated successfully');
      } else {
        const errorData = await response.json();
        showError('Update Failed', errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Update Failed', 'An error occurred while updating your profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showError('Invalid Image', validation.error || 'Please select a valid image file');
      return;
    }

    setUploadingAvatar(true);
    try {
      const payload = new FormData();
      payload.append('avatar', file);

      const response = await fetch('/api/user/profile/avatar', {
        method: 'POST',
        body: payload,
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarUrl(data.avatarUrl);
        await refreshUser();
        success('Avatar Updated', 'Your profile picture has been updated successfully');
      } else {
        const errorData = await response.json();
        showError('Upload Failed', errorData.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showError('Upload Failed', 'An error occurred while uploading your avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;

    setUploadingAvatar(true);
    try {
      const response = await fetch('/api/user/profile/avatar', {
        method: 'DELETE',
      });

      if (response.ok) {
        setAvatarUrl(null);
        await refreshUser();
        success('Avatar Removed', 'Your profile picture has been removed');
      } else {
        showError('Remove Failed', 'Failed to remove avatar');
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      showError('Remove Failed', 'An error occurred while removing your avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const profileContent = (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <Avatar
                src={avatarUrl}
                userId={user?.id || ''}
                size="xl"
                className="border-4 border-white shadow-lg"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                title="Change avatar"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-md"
                  title="Remove avatar"
                  disabled={uploadingAvatar}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {formData.name || user?.name || 'User'}
              </h2>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              {user?.createdAt && (
                <p className="text-sm text-gray-500 mt-2">
                  Member since{' '}
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Personal Information</span>
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <DatePicker
                date={formData.dateOfBirth}
                onDateChange={(date) => handleInputChange('dateOfBirth', date)}
                placeholder="Select date of birth"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => handleInputChange('occupation', e.target.value)}
                placeholder="Enter your occupation"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="w-5 h-5" />
            <span>Contact Information</span>
          </CardTitle>
          <CardDescription>Update your contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-gray-100"
            />
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your phone number (10 digits)"
              maxLength={10}
            />
            <p className="text-xs text-gray-500">Indian phone number format (10 digits)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Location Information</span>
          </CardTitle>
          <CardDescription>Your address and location details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={formData.addressLine1}
              onChange={(e) => handleInputChange('addressLine1', e.target.value)}
              placeholder="Street address, P.O. Box"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2}
              onChange={(e) => handleInputChange('addressLine2', e.target.value)}
              placeholder="Apartment, suite, unit, building, floor, etc."
            />
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label htmlFor="pincode" className="flex items-center gap-2">
                <span>Pincode</span>
                {fetchingLocation && (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                )}
              </Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    handleInputChange('pincode', value);
                    if (value !== formData.pincode) {
                      lastLookupPincodeRef.current = null;
                    }
                  }}
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                />
              <p className="text-xs text-gray-500">Enter pincode to auto-fill city and state</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your personal information and preferences
            </p>
          </div>
          {profileContent}
        </div>
      </div>
    );
  }

  return profileContent;
}

export default ProfileSettingsSection;

