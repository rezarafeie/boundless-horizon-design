import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, Info } from 'lucide-react';

interface TestResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  responseTime: number;
}

interface MarzbanApiTesterProps {
  initialUrl?: string;
  initialUsername?: string;
  initialPassword?: string;
}

export const MarzbanApiTester = ({ 
  initialUrl = '', 
  initialUsername = '', 
  initialPassword = '' 
}: MarzbanApiTesterProps) => {
  const [panelUrl, setPanelUrl] = useState(initialUrl);
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState(initialPassword);
  const [testUsername, setTestUsername] = useState('test_user');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const addResult = (testName: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [testName]: result }));
  };

  const testAuthentication = async () => {
    if (!panelUrl || !username || !password) {
      addResult('auth', {
        success: false,
        error: 'Panel URL, username, and password are required',
        responseTime: 0
      });
      return null;
    }

    const startTime = Date.now();
    try {
      // Use the correct Marzban authentication format with grant_type
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', username);
      params.append('password', password);

      const response = await fetch(`${panelUrl}/api/admin/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        addResult('auth', {
          success: false,
          status: response.status,
          error: `Authentication failed: ${response.status} - ${errorText}`,
          responseTime
        });
        return null;
      }

      const data = await response.json();
      addResult('auth', {
        success: true,
        status: response.status,
        data: {
          access_token: data.access_token ? '[TOKEN_RECEIVED]' : 'No token',
          token_type: data.token_type
        },
        responseTime
      });

      return data.access_token;
    } catch (error) {
      addResult('auth', {
        success: false,
        error: `Authentication error: ${error.message}`,
        responseTime: Date.now() - startTime
      });
      return null;
    }
  };

  const testEndpoint = async (
    testName: string,
    endpoint: string,
    method: string = 'GET',
    body?: any,
    token?: string
  ) => {
    const startTime = Date.now();
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (method !== 'GET' && body) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${panelUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      const responseTime = Date.now() - startTime;
      let data;
      
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      addResult(testName, {
        success: response.ok,
        status: response.status,
        data: response.ok ? data : undefined,
        error: !response.ok ? `${response.status}: ${JSON.stringify(data)}` : undefined,
        responseTime
      });

      return response.ok ? data : null;
    } catch (error) {
      addResult(testName, {
        success: false,
        error: `Request error: ${error.message}`,
        responseTime: Date.now() - startTime
      });
      return null;
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResults({});

    try {
      // Test 1: Authentication
      const token = await testAuthentication();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Test 2: System Info
      await testEndpoint('system', '/api/system', 'GET', undefined, token);

      // Test 3: Inbounds
      await testEndpoint('inbounds', '/api/inbounds', 'GET', undefined, token);

      // Test 4: Get User (should return 404 for non-existent user)
      await testEndpoint('getUser', `/api/user/${testUsername}`, 'GET', undefined, token);

      // Test 5: Create Test User
      const userPayload = {
        username: testUsername,
        proxies: {},
        data_limit: 1073741824, // 1GB in bytes
        expire: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000), // 1 day from now
        data_limit_reset_strategy: "no_reset",
        status: "active",
        note: "API Test User - Will be deleted"
      };

      const createdUser = await testEndpoint('createUser', '/api/user', 'POST', userPayload, token);

      // Test 6: Get Created User
      if (createdUser) {
        await testEndpoint('getUserAfterCreate', `/api/user/${testUsername}`, 'GET', undefined, token);
        
        // Test 7: Delete Test User (cleanup)
        await testEndpoint('deleteUser', `/api/user/${testUsername}`, 'DELETE', undefined, token);
      }

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.success) {
      return <Badge className="bg-green-100 text-green-800">Success</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Marzban API Configuration
          </CardTitle>
          <CardDescription>
            Configure Marzban panel connection details for API testing. Uses correct authentication format with grant_type=password and URL-encoded content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="panelUrl">Panel URL</Label>
              <Input
                id="panelUrl"
                placeholder="https://panel.example.com"
                value={panelUrl}
                onChange={(e) => setPanelUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="testUsername">Test Username</Label>
              <Input
                id="testUsername"
                placeholder="test_user"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Admin Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={isLoading || !panelUrl || !username || !password}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run All API Tests'
            )}
          </Button>
        </CardContent>
      </Card>

      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Results from Marzban API endpoint testing with correct authentication format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {Object.entries(results).map(([testName, result]) => (
                  <div key={testName} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result)}
                        <span className="font-medium capitalize">
                          {testName.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result)}
                        <Badge variant="outline">
                          {result.responseTime}ms
                        </Badge>
                        {result.status && (
                          <Badge variant="outline">
                            {result.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {result.error && (
                      <div className="mt-2">
                        <Label className="text-red-600">Error:</Label>
                        <Textarea
                          value={result.error}
                          readOnly
                          className="mt-1 text-red-600 bg-red-50 border-red-200"
                          rows={2}
                        />
                      </div>
                    )}
                    
                    {result.data && (
                      <div className="mt-2">
                        <Label>Response Data:</Label>
                        <Textarea
                          value={JSON.stringify(result.data, null, 2)}
                          readOnly
                          className="mt-1 bg-green-50 border-green-200"
                          rows={4}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
