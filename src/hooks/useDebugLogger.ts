
import { useState, useCallback } from 'react';
import { DebugLog } from '@/components/admin/reports/DebugLogger';

export const useDebugLogger = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);

  const addLog = useCallback((
    type: DebugLog['type'],
    title: string,
    details: any,
    duration?: number
  ) => {
    const log: DebugLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      title,
      details,
      duration
    };
    
    setLogs(prev => [log, ...prev].slice(0, 100)); // Keep only last 100 logs
    
    // Enhanced console logging for development
    const logPrefix = `[DEBUG ${type.toUpperCase()}]`;
    const logMessage = `${logPrefix} ${title}`;
    
    if (type === 'error') {
      console.error(logMessage, details);
    } else if (type === 'api') {
      console.log(`${logMessage} - API Call`, details);
    } else {
      console.log(logMessage, details);
    }
  }, []);

  const logApiCall = useCallback(async <T>(
    title: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      addLog('api', `${title} - Starting`, { 
        startTime: new Date().toISOString(),
        requestDetails: 'API call initiated'
      });
      
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      addLog('success', `${title} - Success`, {
        result,
        responseTime: `${duration}ms`,
        completedAt: new Date().toISOString()
      }, duration);
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorDetails = {
        error: error.message || 'Unknown error',
        stack: error.stack,
        name: error.name,
        responseTime: `${duration}ms`,
        failedAt: new Date().toISOString()
      };
      
      addLog('error', `${title} - Failed`, errorDetails, duration);
      throw error;
    }
  }, [addLog]);

  const logInfo = useCallback((title: string, details: any) => {
    addLog('info', title, {
      ...details,
      timestamp: new Date().toISOString()
    });
  }, [addLog]);

  const logError = useCallback((title: string, error: any) => {
    const errorDetails = {
      error: error.message || error,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    };
    addLog('error', title, errorDetails);
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    console.log('[DEBUG] Logs cleared');
  }, []);

  return {
    logs,
    addLog,
    logApiCall,
    logInfo,
    logError,
    clearLogs
  };
};
