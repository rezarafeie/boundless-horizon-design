import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { 
  RotateCcw, 
  Trash2, 
  Send, 
  Eye, 
  Loader2, 
  Calendar, 
  Database, 
  Globe, 
  Phone, 
  Mail,
  User,
  Server
} from "lucide-react";

interface TestUser {
  id: string;
  email: string;
  phone_number: string;
  username: string;
  panel_id: string;
  panel_name: string;
  subscription_url: string;
  expire_date: string;
  data_limit_bytes: number;
  ip_address: string | null;
  device_info: any;
  status: 'active' | 'expired' | 'deleted';
  created_at: string;
  updated_at: string;
}

interface TestUserCardProps {
  user: TestUser;
  onUpdate: () => void;
}

export const TestUserCard = ({ user, onUpdate }: TestUserCardProps) => {
  const { toast } = useToast();
  const [isRenewing, setIsRenewing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isExpired = new Date(user.expire_date) <= new Date();
  const isDeleted = user.status === 'deleted';

  const getStatusBadge = () => {
    if (isDeleted) {
      return <Badge variant="destructive">Deleted</Badge>;
    }
    if (isExpired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>;
  };

  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      console.log('ADMIN_TESTS: Renewing test user:', user.id);

      // Extend expire_date by 1 day
      const newExpireDate = new Date(user.expire_date);
      newExpireDate.setDate(newExpireDate.getDate() + 1);

      const { error } = await supabase
        .from('test_users')
        .update({ 
          expire_date: newExpireDate.toISOString(),
          status: 'active'
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test account renewed for 1 more day",
      });

      onUpdate();
    } catch (error) {
      console.error('ADMIN_TESTS: Error renewing test user:', error);
      toast({
        title: "Error",
        description: "Failed to renew test account",
        variant: "destructive"
      });
    } finally {
      setIsRenewing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      console.log('ADMIN_TESTS: Soft deleting test user:', user.id);

      const { error } = await supabase
        .from('test_users')
        .update({ status: 'deleted' })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test account marked as deleted",
      });

      onUpdate();
    } catch (error) {
      console.error('ADMIN_TESTS: Error deleting test user:', error);
      toast({
        title: "Error",
        description: "Failed to delete test account",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      console.log('ADMIN_TESTS: Sending subscription details to test user:', user.id);

      // Call edge function to send email/SMS
      const { data, error } = await supabase.functions.invoke('send-test-notification', {
        body: {
          testUserId: user.id,
          email: user.email,
          phoneNumber: user.phone_number,
          username: user.username,
          subscriptionUrl: user.subscription_url,
          expireDate: user.expire_date
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription details sent successfully",
      });

    } catch (error) {
      console.error('ADMIN_TESTS: Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send subscription details",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className={`${isDeleted ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            {user.username}
            {getStatusBadge()}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Created: {formatDate(user.created_at)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4" />
              <span className="font-medium">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4" />
              <span className="font-medium">Phone:</span>
              <span>{user.phone_number}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Server className="w-4 h-4" />
              <span className="font-medium">Panel:</span>
              <span>{user.panel_name}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Expires:</span>
              <span className={isExpired ? 'text-red-600' : 'text-green-600'}>
                {formatDate(user.expire_date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4" />
              <span className="font-medium">Data Limit:</span>
              <span>{formatBytes(user.data_limit_bytes)}</span>
            </div>
            {user.subscription_url && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4" />
                <span className="font-medium">Subscription:</span>
                <span className="text-blue-600 truncate max-w-32">Available</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Details Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="min-h-[44px] flex-1 sm:flex-none">
                <Eye className="w-4 h-4 mr-1" />
                Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Test User Details</DialogTitle>
                <DialogDescription>
                  Complete information for test user: {user.username}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>Phone:</strong> {user.phone_number}</div>
                    <div><strong>Username:</strong> {user.username}</div>
                    <div><strong>Status:</strong> {getStatusBadge()}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Account Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Panel:</strong> {user.panel_name}</div>
                    <div><strong>Data Limit:</strong> {formatBytes(user.data_limit_bytes)}</div>
                    <div><strong>Created:</strong> {formatDate(user.created_at)}</div>
                    <div><strong>Expires:</strong> {formatDate(user.expire_date)}</div>
                  </div>
                </div>
                {user.subscription_url && (
                  <div className="col-span-full space-y-2">
                    <h4 className="font-semibold">Subscription URL</h4>
                    <div className="p-2 bg-gray-100 rounded text-sm break-all">
                      {user.subscription_url}
                    </div>
                  </div>
                )}
                {user.ip_address && (
                  <div className="col-span-full space-y-2">
                    <h4 className="font-semibold">Technical Details</h4>
                    <div className="text-sm">
                      <div><strong>IP Address:</strong> {user.ip_address}</div>
                      {user.device_info && Object.keys(user.device_info).length > 0 && (
                        <div><strong>Device Info:</strong> {JSON.stringify(user.device_info)}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Renew Button */}
          {!isDeleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRenew}
              disabled={isRenewing}
              className="border-green-200 text-green-700 hover:bg-green-50 min-h-[44px] flex-1 sm:flex-none"
            >
              {isRenewing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1" />
              )}
              Renew
            </Button>
          )}

          {/* Send Button */}
          {!isDeleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSend}
              disabled={isSending}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 min-h-[44px] flex-1 sm:flex-none"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Send
            </Button>
          )}

          {/* Delete Button */}
          {!isDeleted && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isDeleting}
                  className="min-h-[44px] flex-1 sm:flex-none"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Test Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this test account? This action will mark it as deleted but preserve the data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};