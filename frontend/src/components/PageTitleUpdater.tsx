import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const routeTitles: Record<string, string> = {
  '/login': 'Tizimga kirish',
  '/app/dashboard': 'Boshqaruv paneli',
  '/app/addresses': 'Manzillar',
  '/app/abonent-card': 'Abonent kartasi',
  '/app/collectors': 'Inspektorlar',
  '/app/legal-entities': 'Yuridik shaxslar',
  '/app/collections': 'Tushumlar',
  '/app/billing': 'Hisob-kitob (Billing)',
  '/app/payments': 'To\'lovlar',
  '/app/reports': 'Hisobotlar',
  '/app/sms': 'SMS xabarnomalar',
  '/app/audit-logs': 'Tizim jurnali',
  '/superadmin/dashboard': 'Superadmin - Boshqaruv paneli',
  '/superadmin/tenants': 'Korxonalar (Tenants)',
  '/superadmin/saas-payments': 'SaaS To\'lovlar',
  '/superadmin/notifications': 'Bildirishnomalar',
  '/superadmin/sms-report': 'SMS Hisobot',
  '/superadmin/tariffs': 'Ta\'riflar',
  '/superadmin/audit-logs': 'Superadmin - Tizim jurnali',
  '/superadmin/abonents': 'Barcha abonentlar',
  '/twa/dashboard': 'TWA - Boshqaruv paneli',
  '/twa/invoices': 'TWA - Hisob-fakturalar',
  '/twa/payments': 'TWA - To\'lovlar',
  '/twa/meters': 'TWA - Hisoblagichlar',
};

const PageTitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    // Dynamic matching for routes with params like /app/abonents/:id
    let title = 'SuvControl.uz - Suv hisobini onlayn nazorat qilish';
    
    if (routeTitles[location.pathname]) {
      title = `${routeTitles[location.pathname]} | SuvControl`;
    } else if (location.pathname.startsWith('/app/abonents/') || location.pathname.startsWith('/app/abonent/')) {
      title = 'Abonent ma\'lumotlari | SuvControl';
    } else if (location.pathname !== '/') {
      title = 'Sahifa topilmadi | SuvControl';
    }

    document.title = title;
  }, [location]);

  return null;
};

export default PageTitleUpdater;
