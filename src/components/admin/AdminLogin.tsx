
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
      
      // Simple credential validation
      if (username !== 'bnets' || password !== 'reza1234') {
        setError('Invalid credentials');
        setLoading(false);
        return;
      }

      // Verify the existing admin user
      const { data: existingAdmin, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', 'a4148578-bcbd-4512-906e-4832f94bdb46')
        .single();

      if (adminError || !existingAdmin) {
        console.error('Admin user not found:', adminError);
        setError('Admin user not found');
        setLoading(false);
        return;
      }

      console.log('Admin login successful');
      
      // Set session in localStorage
      localStorage.setItem('admin_session', JSON.stringify({
        isLoggedIn: true,
        username: 'bnets',
        loginTime: new Date().toISOString()
      }));

      // Try to establish Supabase auth session for admin
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: 'admin@boundless.network',
          password: 'admin_temp_password_12345'
        });
        
        if (authData?.session) {
          console.log('Admin Supabase auth session established');
        } else {
          console.log('Could not establish Supabase auth session, but admin login successful');
        }
      } catch (authErr) {
        console.log('Auth session setup failed, but admin login successful');
      }
      
      toast.success('Login successful');
      
      // Redirect to admin dashboard
      window.location.href = '/admin/dashboard';

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
