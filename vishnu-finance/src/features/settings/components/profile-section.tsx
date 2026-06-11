'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { X, Camera, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { DatePicker } from '@/components/ui/date-picker';
import RazorpayTest from '@/features/settings/components/razorpay-test';
import {
  SettingsPageLayout,
  SettingsSectionHeader,
  SettingsGroup,
  SettingsFormField,
  SettingsSaveBar,
  SettingsProfileHeader,
} from '@/features/settings/components/settings-ui';
import { useAuth } from '@/contexts/AuthContext';
import type { User as AuthUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fetchLocationByPincode, validateIndianPhoneNumber } from '@/lib/pincode-api';
import { validateImageFile } from '@/lib/avatar-utils';

import type { UserProfilePayload } from '@/features/settings/loaders-profile';

type ProfileSectionMode = 'standalone' | 'embedded';

interface ProfileSectionProps {
  mode?: ProfileSectionMode;
  initialProfile?: Partial<AuthUser> | UserProfilePayload | null;
  includePayments?: boolean;
}

export function ProfileSettingsSection({
  mode = 'embedded',
  initialProfile = null,
  includePayments = false,
}: ProfileSectionProps) {
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

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : undefined;

  const profileContent = (
    <SettingsPageLayout>
      <SettingsGroup>
        <SettingsProfileHeader
          name={formData.name || user?.name || 'User'}
          email={user?.email}
          avatarUrl={avatarUrl}
          memberSince={memberSince}
          avatarSlot={
            <>
              <Avatar
                src={avatarUrl}
                userId={user?.id || ''}
                size="xl"
                className="border-4 border-background shadow-md"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary p-2 text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
                title="Change avatar"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
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
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute right-0 top-0 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md transition-colors hover:bg-destructive/90"
                  title="Remove avatar"
                  disabled={uploadingAvatar}
                >
                  <X className="size-3" />
                </button>
              )}
            </>
          }
        />
      </SettingsGroup>

      <div className="space-y-1.5">
        <SettingsSectionHeader>Personal</SettingsSectionHeader>
        <SettingsGroup>
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 lg:p-4">
            <SettingsFormField id="name" label="Full name">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
              />
            </SettingsFormField>
            <SettingsFormField id="gender" label="Gender" bordered>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange('gender', value)}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </SettingsFormField>
            <SettingsFormField id="dateOfBirth" label="Date of birth" bordered>
              <DatePicker
                date={formData.dateOfBirth}
                onDateChange={(date) => handleInputChange('dateOfBirth', date)}
                placeholder="Select date of birth"
              />
            </SettingsFormField>
            <SettingsFormField id="occupation" label="Occupation" bordered>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => handleInputChange('occupation', e.target.value)}
                placeholder="Enter your occupation"
              />
            </SettingsFormField>
            <SettingsFormField id="bio" label="Bio" stack bordered className="lg:col-span-2">
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself…"
                rows={3}
              />
            </SettingsFormField>
          </div>
        </SettingsGroup>
      </div>

      <div className="space-y-1.5">
        <SettingsSectionHeader>Contact</SettingsSectionHeader>
        <SettingsGroup>
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 lg:p-4">
            <SettingsFormField id="email" label="Email" hint="Email cannot be changed">
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted lg:bg-muted"
              />
            </SettingsFormField>
            <SettingsFormField id="phone" label="Phone number" bordered>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            </SettingsFormField>
          </div>
        </SettingsGroup>
      </div>

      <div className="space-y-1.5">
        <SettingsSectionHeader>Address</SettingsSectionHeader>
        <SettingsGroup>
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 lg:p-4">
            <SettingsFormField id="addressLine1" label="Address line 1" className="lg:col-span-2">
              <Input
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                placeholder="Street address, P.O. box"
              />
            </SettingsFormField>
            <SettingsFormField id="addressLine2" label="Address line 2" bordered className="lg:col-span-2">
              <Input
                id="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                placeholder="Apartment, suite, unit, etc."
              />
            </SettingsFormField>
            <SettingsFormField
              id="pincode"
              label="Pincode"
              bordered
              hint="Auto-fills city and state"
            >
              <div className="relative">
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
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
                {fetchingLocation && (
                  <Loader2 className="pointer-events-none absolute right-0 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-primary lg:right-3" />
                )}
              </div>
            </SettingsFormField>
            <SettingsFormField id="city" label="City" bordered>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
              />
            </SettingsFormField>
            <SettingsFormField id="state" label="State" bordered>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="State"
              />
            </SettingsFormField>
            <SettingsFormField id="country" label="Country" bordered>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Country"
              />
            </SettingsFormField>
          </div>
        </SettingsGroup>
      </div>

      {includePayments && (
        <div className="space-y-1.5">
          <SettingsSectionHeader>Payments</SettingsSectionHeader>
          <SettingsGroup>
            <div className="space-y-4 px-4 py-4">
              <p className="text-xs text-muted-foreground">
                Run a ₹1.00 test payment via Razorpay to verify integration. By proceeding you agree to our{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms
                </Link>
                ,{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                , and{' '}
                <Link href="/refunds" className="text-primary hover:underline">
                  Refunds Policy
                </Link>
                .
              </p>
              <RazorpayTest />
            </div>
          </SettingsGroup>
        </div>
      )}

      <SettingsSaveBar onSave={handleSave} loading={saving} />
    </SettingsPageLayout>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="mt-2 text-sm text-muted-foreground">
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

