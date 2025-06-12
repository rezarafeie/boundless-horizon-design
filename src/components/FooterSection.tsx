
import { Button } from "@/components/ui/button";

const FooterSection = () => {
  return (
    <footer className="bg-gray-900 text-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold mb-4 text-gradient">
              شبکه بدون مرز
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              امن، سریع و بدون محدودیت – برای کاربران حرفه‌ای که به بهترین کیفیت اعتماد دارند.
            </p>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl"
              onClick={() => window.open('https://t.me/getbnbot', '_blank')}
            >
              ورود به ربات تلگرام
            </Button>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">سرویس‌ها</h4>
            <ul className="space-y-2 text-gray-300">
              <li>پلن Lite</li>
              <li>پلن Pro</li>
              <li>پلن Pro Plus</li>
              <li>تونل ایرانی</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">پشتیبانی</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://t.me/getbnbot" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  ربات تلگرام
                </a>
              </li>
              <li>راهنمای نصب</li>
              <li>سوالات متداول</li>
              <li>تماس با ما</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 mb-4 md:mb-0">
            © ۲۰۲۴ BNETS.CO - تمامی حقوق محفوظ است
          </div>
          <div className="flex space-x-4 space-x-reverse">
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              قوانین و مقررات
            </a>
            <a href="#" className="text-gray-400 hover:text-primary transition-colors">
              حریم خصوصی
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
