
import { ReactNode } from 'react';
import { OfflineStatus } from './admin/OfflineStatus';

interface OfflineProtectionProps {
  children: ReactNode;
  protectPurchase?: boolean;
}

export const OfflineProtection = ({ children, protectPurchase = false }: OfflineProtectionProps) => {
  if (protectPurchase) {
    return (
      <>
        <OfflineStatus showFullScreen={true} />
        {children}
      </>
    );
  }

  return <>{children}</>;
};
