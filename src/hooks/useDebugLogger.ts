
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
    
    // Also log to console for development
    console.log(`[DEBUG ${type.toUpperCase()}] ${title}:`, details);
  }, []);

  const logApiCall = useCallback(async <T>(
    title: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      addLog('api', `${title} - Starting`, { startTime: new Date().toISOString() });
      
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      addLog('success', `${title} - Success`, result, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      addLog('error', `${title} - Failed`, error, duration);
      throw error;
    }
  }, [addLog]);

  const logInfo = useCallback((title: string, details: any) => {
    addLog('info', title, details);
  }, [addLog]);

  const logError = useCallback((title: string, error: any) => {
    addLog('error', title, error);
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
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
