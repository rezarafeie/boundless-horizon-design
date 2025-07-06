
import { useSupabaseConnection } from '@/hooks/useSupabaseConnection';

export const ConnectionIndicator = () => {
  const { isConnected } = useSupabaseConnection();

  return (
    <div className="flex items-center">
      <div 
        className={`w-2 h-2 rounded-full ${
          isConnected 
            ? 'bg-green-500 shadow-green-500/50' 
            : 'bg-red-500 shadow-red-500/50'
        } shadow-lg animate-pulse`}
        title={isConnected ? 'Connected' : 'Connection issues'}
      />
    </div>
  );
};
