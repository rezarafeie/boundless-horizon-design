import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { VpnService, VpnServicesService } from '@/services/vpnServicesService';
import { ServicesForm } from '@/components/admin/ServicesForm';
import { AdminLayout } from '@/components/admin/AdminLayout';

const AdminServices = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [services, setServices] = useState<VpnService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<VpnService | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; service: VpnService | null }>({
    isOpen: false,
    service: null
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await VpnServicesService.getServices();
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در بارگذاری سرویس‌ها' : 'Failed to load services',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    setEditingService(null);
    setIsFormOpen(true);
  };

  const handleEditService = (service: VpnService) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleDeleteService = (service: VpnService) => {
    setDeleteDialog({ isOpen: true, service });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.service) return;

    setDeleting(true);
    try {
      await VpnServicesService.deleteService(deleteDialog.service.id);
      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: language === 'fa' ? 'سرویس با موفقیت حذف شد' : 'Service deleted successfully'
      });
      await loadServices();
    } catch (error) {
      console.error('Failed to delete service:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete service',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
      setDeleteDialog({ isOpen: false, service: null });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' ' + (language === 'fa' ? 'تومان' : 'Toman');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {language === 'fa' ? 'مدیریت سرویس‌ها' : 'Services Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'fa' ? 
                'سرویس‌های از پیش تعریف شده VPN را مدیریت کنید' : 
                'Manage predefined VPN service packages'
              }
            </p>
          </div>
          <Button onClick={handleAddService} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'fa' ? 'افزودن سرویس' : 'Add Service'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'fa' ? 'لیست سرویس‌ها' : 'Services List'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'fa' ? 'هیچ سرویسی یافت نشد' : 'No services found'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'fa' ? 'نام سرویس' : 'Service Name'}</TableHead>
                    <TableHead>{language === 'fa' ? 'مدت' : 'Duration'}</TableHead>
                    <TableHead>{language === 'fa' ? 'حجم' : 'Data Limit'}</TableHead>
                    <TableHead>{language === 'fa' ? 'قیمت' : 'Price'}</TableHead>
                    <TableHead>{language === 'fa' ? 'پلن متصل' : 'Connected Plan'}</TableHead>
                    <TableHead>{language === 'fa' ? 'وضعیت' : 'Status'}</TableHead>
                    <TableHead>{language === 'fa' ? 'عملیات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>
                        {service.duration_days} {language === 'fa' ? 'روز' : 'days'}
                      </TableCell>
                      <TableCell>
                        {service.data_limit_gb} {language === 'fa' ? 'گیگابایت' : 'GB'}
                      </TableCell>
                      <TableCell>{formatPrice(service.price_toman)}</TableCell>
                      <TableCell>
                        {service.subscription_plans 
                          ? (language === 'fa' ? service.subscription_plans.name_fa : service.subscription_plans.name_en)
                          : (language === 'fa' ? 'نامشخص' : 'Unknown')
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                          {service.status === 'active' 
                            ? (language === 'fa' ? 'فعال' : 'Active')
                            : (language === 'fa' ? 'غیرفعال' : 'Inactive')
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditService(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteService(service)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ServicesForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          service={editingService}
          onSuccess={loadServices}
        />

        <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => 
          !open && setDeleteDialog({ isOpen: false, service: null })
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {language === 'fa' ? 'تأیید حذف' : 'Confirm Deletion'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {language === 'fa' 
                  ? `آیا مطمئن هستید که می‌خواهید سرویس "${deleteDialog.service?.name}" را حذف کنید؟ این عمل قابل بازگشت نیست.`
                  : `Are you sure you want to delete the service "${deleteDialog.service?.name}"? This action cannot be undone.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {language === 'fa' ? 'لغو' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {language === 'fa' ? 'حذف' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminServices;