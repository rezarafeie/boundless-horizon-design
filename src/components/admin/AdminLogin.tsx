
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { isAdmin, signIn, loading: authLoading } = useAdminAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check for hardcoded admin credentials
      if (email === 'bnets' && password === 'reza1234') {
        // Create or get the admin user
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: 'bnets@admin.local',
          password: 'reza1234',
        });

        if (authError && authError.message.includes('Invalid login credentials')) {
          // User doesn't exist, create it
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'bnets@admin.local',
            password: 'reza1234',
          });

          if (signUpError) {
            throw signUpError;
          }

          if (signUpData.user) {
            // Add to admin_users table
            const { error: adminError } = await supabase
              .from('admin_users')
              .upsert({
                user_id: signUpData.user.id,
                role: 'superadmin',
                is_active: true
              });

            if (adminError) {
              console.error('Error creating admin user:', adminError);
            }

            toast.success('Admin account created and logged in successfully');
          }
        } else if (authError) {
          throw authError;
        } else {
          // User exists and logged in successfully
          if (authData.user) {
            // Ensure user is in admin_users table
            const { error: adminError } = await supabase
              .from('admin_users')
              .upsert({
                user_id: authData.user.id,
                role: 'superadmin',
                is_active: true
              });

            if (adminError) {
              console.error('Error updating admin user:', adminError);
            }

            toast.success('Login successful');
          }
        }
      } else {
        // Regular email/password login
        const { error } = await signIn(email, password);
        
        if (error) {
          setError(error.message);
          toast.error('Login failed: ' + error.message);
        } else {
          toast.success('Login successful');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email or Username</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com or bnets"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <strong>Quick Admin Access:</strong><br />
              Username: bnets<br />
              Password: reza1234
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
