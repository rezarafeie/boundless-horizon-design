
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { isAdmin, loading: authLoading } = useAdminAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Admin login attempt for username:', username);
      
      // Only allow bnets login
      if (username !== 'bnets') {
        setError('Invalid username');
        setLoading(false);
        return;
      }

      if (password !== 'reza1234') {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      // Use email format for backend authentication
      const adminEmail = 'bnets@admin.local';
      
      // Try to sign in first
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: password,
      });

      // If login fails because user doesn't exist, create the user
      if (authError && authError.message.includes('Invalid login credentials')) {
        console.log('Admin user not found, creating...');
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: adminEmail,
          password: password,
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
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
          } else {
            console.log('Admin user created successfully');
          }

          toast.success('Admin account created and logged in successfully');
        }
      } else if (authError) {
        console.error('Auth error:', authError);
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

          console.log('Admin login successful');
          toast.success('Login successful');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
      toast.error('Login failed: ' + (err.message || 'Unknown error'));
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
            Enter your admin credentials to access the admin panel
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
