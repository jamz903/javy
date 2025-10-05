import React, { useState } from 'react';
import { User, Bell, Lock, Palette, Database, Key, Globe, Save, Trash2, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Profile
    fullName: 'Dr. Sarah Chen',
    email: 'sarah.chen@example.com',
    organization: 'Earth Observatory Institute',
    bio: 'Remote sensing researcher specializing in climate change monitoring.',

    // Notifications
    emailNotifications: true,
    chatUpdates: true,
    dataAlerts: false,
    weeklyReports: true,

    // API
    apiKey: 'sk_live_a1b2c3d4e5f6g7h8i9j0',
    rateLimitTier: 'professional',

    // Preferences
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',

    // Data Sources
    defaultSource: 'sentinel2',
    autoCache: true,
    compressionEnabled: true,
  });

  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = (section) => {
    setSavedMessage(`${section} settings saved successfully!`);
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const regenerateApiKey = () => {
    const newKey = 'sk_live_' + Math.random().toString(36).substring(2, 15);
    handleInputChange('apiKey', newKey);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          </div>
          <p className="text-slate-600">Manage your account and preferences</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Success Message */}
        {savedMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            ✓ {savedMessage}
          </div>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">API Keys</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Data Sources</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details and bio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={settings.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={settings.organization}
                    onChange={(e) => handleInputChange('organization', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={settings.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                  />
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="w-5 h-5 text-slate-600" />
                    Password & Security
                  </h3>
                  <Button variant="outline">Change Password</Button>
                  <Button variant="outline" className="ml-2">Enable 2FA</Button>
                </div>

                <Separator className="my-6" />

                <div className="flex justify-between items-center">
                  <Button onClick={() => handleSave('Profile')}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what updates you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-slate-500">Receive email updates about your account</p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="chatUpdates">Chat Updates</Label>
                    <p className="text-sm text-slate-500">Get notified about new messages in your chats</p>
                  </div>
                  <Switch
                    id="chatUpdates"
                    checked={settings.chatUpdates}
                    onCheckedChange={(checked) => handleInputChange('chatUpdates', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dataAlerts">Data Availability Alerts</Label>
                    <p className="text-sm text-slate-500">Alert when new satellite data is available for your regions</p>
                  </div>
                  <Switch
                    id="dataAlerts"
                    checked={settings.dataAlerts}
                    onCheckedChange={(checked) => handleInputChange('dataAlerts', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weeklyReports">Weekly Usage Reports</Label>
                    <p className="text-sm text-slate-500">Receive a summary of your API usage every week</p>
                  </div>
                  <Switch
                    id="weeklyReports"
                    checked={settings.weeklyReports}
                    onCheckedChange={(checked) => handleInputChange('weeklyReports', checked)}
                  />
                </div>

                <div className="pt-4">
                  <Button onClick={() => handleSave('Notification')}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Access</CardTitle>
                <CardDescription>Manage your API keys and rate limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="apiKey"
                      value={settings.apiKey}
                      readOnly
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={regenerateApiKey}>
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500">Keep your API key secure. Don't share it publicly.</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="rateLimitTier">Rate Limit Tier</Label>
                  <Select
                    value={settings.rateLimitTier}
                    onValueChange={(value) => handleInputChange('rateLimitTier', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free - 100 requests/hour</SelectItem>
                      <SelectItem value="professional">Professional - 1,000 requests/hour</SelectItem>
                      <SelectItem value="enterprise">Enterprise - Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Current Usage</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>Requests this month: <strong>8,547 / 30,000</strong></p>
                      <p>Data downloaded: <strong>127 GB / 500 GB</strong></p>
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-4">
                  <Button onClick={() => handleSave('API')}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Display & Regional Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) => handleInputChange('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => handleInputChange('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => handleInputChange('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (US)</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={settings.dateFormat}
                    onValueChange={(value) => handleInputChange('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">2024-10-04</SelectItem>
                      <SelectItem value="MM/DD/YYYY">10/04/2024</SelectItem>
                      <SelectItem value="DD/MM/YYYY">04/10/2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button onClick={() => handleSave('Preferences')}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Sources Tab */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Data Source Settings</CardTitle>
                <CardDescription>Configure default data sources and processing options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultSource">Default Satellite Source</Label>
                  <Select
                    value={settings.defaultSource}
                    onValueChange={(value) => handleInputChange('defaultSource', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sentinel2">Sentinel-2</SelectItem>
                      <SelectItem value="landsat">Landsat 8/9</SelectItem>
                      <SelectItem value="modis">MODIS</SelectItem>
                      <SelectItem value="sar">SAR (Sentinel-1)</SelectItem>
                      <SelectItem value="planet">Planet Labs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoCache">Auto-cache Results</Label>
                    <p className="text-sm text-slate-500">Automatically cache frequently accessed data</p>
                  </div>
                  <Switch
                    id="autoCache"
                    checked={settings.autoCache}
                    onCheckedChange={(checked) => handleInputChange('autoCache', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="compressionEnabled">Enable Compression</Label>
                    <p className="text-sm text-slate-500">Compress downloaded data to save bandwidth</p>
                  </div>
                  <Switch
                    id="compressionEnabled"
                    checked={settings.compressionEnabled}
                    onCheckedChange={(checked) => handleInputChange('compressionEnabled', checked)}
                  />
                </div>

                <div className="pt-4">
                  <Button onClick={() => handleSave('Data Source')}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
