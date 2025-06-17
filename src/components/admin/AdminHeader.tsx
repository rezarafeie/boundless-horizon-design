
import { Card } from '@/components/ui/card';

export const AdminHeader = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage your VPN service</p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="px-3 py-1 bg-green-50 border-green-200">
            <span className="text-green-800 text-sm font-medium">
              Open Access Mode
            </span>
          </Card>
        </div>
      </div>
    </header>
  );
};
