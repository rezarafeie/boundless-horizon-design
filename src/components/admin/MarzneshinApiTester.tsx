
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TestResult {
  endpoint: string;
  method: string;
  status: number | null;
  success: boolean;
  data?: any;
  error?: string;
  responseTime?: number;
  headers?: Record<string, string>;
}

interface PanelCredentials {
  panelUrl: string;
  username: string;
  password: string;
}

export const MarzneshinApiTester = () => {
  const [credentials, setCredentials] = useState<PanelCredentials>({
    panelUrl: 'https://p.rain.rest',
    username: '',
    password: ''
  });
  const [token, setToken] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const logTest = (result: TestResult) => {
    console.log(`[MARZNESHIN-API-TEST] ${result.endpoint}:`, result);
    setTestResults(prev => [result, ...prev]);
  };

  const testAuthentication = async () => {
    setIsLoading(true);
    setCurrentTest('Testing Authentication');
    const startTime = Date.now();

    try {
      const authUrl = `${credentials.panelUrl}/api/admins/token`;
      console.log('[MARZNESHIN-API-TEST] Testing authentication at:', authUrl);

      const formData = new URLSearchParams({
        grant_type: 'password',
        username: credentials.username,
        password: credentials.password
      });

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData.toString(),
      });

      const responseTime = Date.now() - startTime;
      const responseHeaders = Object.fromEntries(response.headers.entries());

      if (response.ok) {
        const data = await response.json();
        const accessToken = data.access_token;

        if (accessToken) {
          setToken(accessToken);
          logTest({
            endpoint: '/api/admins/token',
            method: 'POST',
            status: response.status,
            success: true,
            data: { 
              token_type: data.token_type,
              expires_in: data.expires_in,
              token_length: accessToken.length,
              token_preview: `${accessToken.substring(0, 20)}...`
            },
            responseTime,
            headers: responseHeaders
          });
        } else {
          logTest({
            endpoint: '/api/admins/token',
            method: 'POST',
            status: response.status,
            success: false,
            error: 'No access_token in response',
            data,
            responseTime,
            headers: responseHeaders
          });
        }
      } else {
        const errorText = await response.text();
        logTest({
          endpoint: '/api/admins/token',
          method: 'POST',
          status: response.status,
          success: false,
          error: `${response.status} - ${errorText}`,
          responseTime,
          headers: responseHeaders
        });
      }
    } catch (error) {
      logTest({
        endpoint: '/api/admins/token',
        method: 'POST',
        status: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setIsLoading(false);
      setCurrentTest('');
    }
  };

  const testGetRezaUser = async () => {
    if (!token) {
      alert('Please authenticate first to get a token');
      return;
    }

    setIsLoading(true);
    setCurrentTest('Testing Get Reza User');
    const startTime = Date.now();

    try {
      const userUrl = `${credentials.panelUrl}/api/users/reza`;
      console.log('[MARZNESHIN-API-TEST] Testing get reza user at:', userUrl);

      const response = await fetch(userUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      const responseHeaders = Object.fromEntries(response.headers.entries());

      if (response.ok) {
        const userData = await response.json();
        logTest({
          endpoint: '/api/users/reza',
          method: 'GET',
          status: response.status,
          success: true,
          data: {
            username: userData.username,
            service_ids: userData.service_ids,
            service_ids_count: userData.service_ids?.length || 0,
            id: userData.id,
            status: userData.status,
            data_limit: userData.data_limit,
            expire_date: userData.expire_date
          },
          responseTime,
          headers: responseHeaders
        });
      } else {
        const errorText = await response.text();
        logTest({
          endpoint: '/api/users/reza',
          method: 'GET',
          status: response.status,
          success: false,
          error: `${response.status} - ${errorText}`,
          responseTime,
          headers: responseHeaders
        });
      }
    } catch (error) {
      logTest({
        endpoint: '/api/users/reza',
        method: 'GET',
        status: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setIsLoading(false);
      setCurrentTest('');
    }
  };

  const testGetInbounds = async () => {
    if (!token) {
      alert('Please authenticate first to get a token');
      return;
    }

    setIsLoading(true);
    setCurrentTest('Testing Get Inbounds');
    const startTime = Date.now();

    try {
      const inboundsUrl = `${credentials.panelUrl}/api/inbounds`;
      console.log('[MARZNESHIN-API-TEST] Testing get inbounds at:', inboundsUrl);

      const response = await fetch(inboundsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      const responseHeaders = Object.fromEntries(response.headers.entries());

      if (response.ok) {
        const inboundsData = await response.json();
        const inbounds = inboundsData.items || inboundsData || [];
        
        logTest({
          endpoint: '/api/inbounds',
          method: 'GET',
          status: response.status,
          success: true,
          data: {
            total_inbounds: Array.isArray(inbounds) ? inbounds.length : 0,
            inbound_ids: Array.isArray(inbounds) ? inbounds.map((i: any) => i.id) : [],
            inbound_tags: Array.isArray(inbounds) ? inbounds.map((i: any) => i.tag) : [],
            inbound_protocols: Array.isArray(inbounds) ? inbounds.map((i: any) => i.protocol) : [],
            response_structure: typeof inboundsData,
            has_items_property: 'items' in inboundsData,
            raw_count: Array.isArray(inboundsData) ? inboundsData.length : 'not_array'
          },
          responseTime,
          headers: responseHeaders
        });
      } else {
        const errorText = await response.text();
        logTest({
          endpoint: '/api/inbounds',
          method: 'GET',
          status: response.status,
          success: false,
          error: `${response.status} - ${errorText}`,
          responseTime,
          headers: responseHeaders
        });
      }
    } catch (error) {
      logTest({
        endpoint: '/api/inbounds',
        method: 'GET',
        status: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setIsLoading(false);
      setCurrentTest('');
    }
  };

  const testGetServices = async () => {
    if (!token) {
      alert('Please authenticate first to get a token');
      return;
    }

    setIsLoading(true);
    setCurrentTest('Testing Get Services');
    const startTime = Date.now();

    try {
      const servicesUrl = `${credentials.panelUrl}/api/services`;
      console.log('[MARZNESHIN-API-TEST] Testing get services at:', servicesUrl);

      const response = await fetch(servicesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      const responseHeaders = Object.fromEntries(response.headers.entries());

      if (response.ok) {
        const servicesData = await response.json();
        const services = servicesData.items || servicesData || [];
        
        logTest({
          endpoint: '/api/services',
          method: 'GET',
          status: response.status,
          success: true,
          data: {
            total_services: Array.isArray(services) ? services.length : 0,
            service_ids: Array.isArray(services) ? services.map((s: any) => s.id) : [],
            service_names: Array.isArray(services) ? services.map((s: any) => s.name) : [],
            response_structure: typeof servicesData,
            has_items_property: 'items' in servicesData
          },
          responseTime,
          headers: responseHeaders
        });
      } else {
        const errorText = await response.text();
        logTest({
          endpoint: '/api/services',
          method: 'GET',
          status: response.status,
          success: false,
          error: `${response.status} - ${errorText}`,
          responseTime,
          headers: responseHeaders
        });
      }
    } catch (error) {
      logTest({
        endpoint: '/api/services',
        method: 'GET',
        status: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setIsLoading(false);
      setCurrentTest('');
    }
  };

  const runFullTest = async () => {
    setTestResults([]);
    await testAuthentication();
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (token) {
      await testGetRezaUser();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testGetInbounds();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testGetServices();
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setToken('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marzneshin API Endpoint Tester</CardTitle>
          <CardDescription>
            Test the Marzneshin panel API endpoints to diagnose inbound detection issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="individual">Individual Tests</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="credentials" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="panelUrl">Panel URL</Label>
                  <Input
                    id="panelUrl"
                    value={credentials.panelUrl}
                    onChange={(e) => setCredentials(prev => ({ ...prev, panelUrl: e.target.value }))}
                    placeholder="https://p.rain.rest"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Admin Username</Label>
                  <Input
                    id="username"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="admin username"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Admin Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="admin password"
                  />
                </div>
                
                {token && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Authentication token obtained: {token.substring(0, 20)}...
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="individual" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={testAuthentication} 
                  disabled={isLoading || !credentials.username || !credentials.password}
                  className="w-full"
                >
                  {isLoading && currentTest === 'Testing Authentication' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
                  ) : (
                    'Test Authentication'
                  )}
                </Button>
                
                <Button 
                  onClick={testGetRezaUser} 
                  disabled={isLoading || !token}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading && currentTest === 'Testing Get Reza User' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
                  ) : (
                    'Test Get Reza User'
                  )}
                </Button>
                
                <Button 
                  onClick={testGetInbounds} 
                  disabled={isLoading || !token}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading && currentTest === 'Testing Get Inbounds' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
                  ) : (
                    'Test Get Inbounds'
                  )}
                </Button>
                
                <Button 
                  onClick={testGetServices} 
                  disabled={isLoading || !token}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading && currentTest === 'Testing Get Services' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
                  ) : (
                    'Test Get Services'
                  )}
                </Button>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={runFullTest} 
                  disabled={isLoading || !credentials.username || !credentials.password}
                  className="flex-1"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {currentTest || 'Running Tests...'}</>
                  ) : (
                    'Run Full Test Suite'
                  )}
                </Button>
                
                <Button onClick={clearResults} variant="outline">
                  Clear Results
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="results" className="space-y-4">
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No test results yet. Run some tests to see results here.
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <Card key={index} className={result.success ? 'border-green-200' : 'border-red-200'}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-mono text-sm">
                              {result.method} {result.endpoint}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.success ? 'default' : 'destructive'}>
                              {result.status || 'FAILED'}
                            </Badge>
                            {result.responseTime && (
                              <Badge variant="outline">
                                {result.responseTime}ms
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {result.error && (
                          <Alert className="mb-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="font-mono text-sm">
                              {result.error}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {result.data && (
                          <div>
                            <Label className="text-xs text-gray-600">Response Data:</Label>
                            <Textarea
                              value={JSON.stringify(result.data, null, 2)}
                              readOnly
                              className="mt-1 font-mono text-xs h-32"
                            />
                          </div>
                        )}
                        
                        {result.headers && Object.keys(result.headers).length > 0 && (
                          <div className="mt-3">
                            <Label className="text-xs text-gray-600">Headers:</Label>
                            <Textarea
                              value={JSON.stringify(result.headers, null, 2)}
                              readOnly
                              className="mt-1 font-mono text-xs h-20"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
