
import React, { useState, useEffect } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { generateCaptcha, validateThaiId } from '../utils';
import { UserData, AccountType } from '../types';

interface Props {
  onSubmit: (data: UserData) => void;
}

const EntitlementForm: React.FC<Props> = ({ onSubmit }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('บัญชีเงินฝากออมทรัพย์ ทีทีบี ออลล์ฟรี');
  const [captcha, setCaptcha] = useState('');
  const [userInputCaptcha, setUserInputCaptcha] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setUserInputCaptcha('');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'กรุณาระบุชื่อ';
    if (!lastName.trim()) newErrors.lastName = 'กรุณาระบุนามสกุล';
    if (!validateThaiId(nationalId)) newErrors.nationalId = 'หมายเลขบัตรประชาชนไม่ถูกต้อง';
    if (userInputCaptcha.toUpperCase() !== captcha.toUpperCase()) newErrors.captcha = 'รหัสความปลอดภัยไม่ถูกต้อง';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ firstName, lastName, nationalId, accountType });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-ttb-blue mb-2">ตรวจสอบสิทธิ์ความคุ้มครอง</h2>
        <p className="text-gray-500">กรอกข้อมูลเพื่อตรวจสอบสิทธิ์การรับประกันอุบัติเหตุฟรี สำหรับลูกค้า ttb</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ (ภาษาไทย)</label>
            <input
              type="text"
              className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-ttb-blue focus:border-transparent outline-none transition-all ${
                errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="เช่น สมชาย"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล (ภาษาไทย)</label>
            <input
              type="text"
              className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-ttb-blue focus:border-transparent outline-none transition-all ${
                errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="เช่น ใจดี"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">เลขบัตรประจำตัวประชาชน (13 หลัก)</label>
          <input
            type="text"
            maxLength={13}
            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-ttb-blue focus:border-transparent outline-none transition-all ${
              errors.nationalId ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
            placeholder="X-XXXX-XXXXX-XX-X"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
          />
          {errors.nationalId && <p className="mt-1 text-xs text-red-500">{errors.nationalId}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทบัญชี</label>
          <select
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-ttb-blue focus:border-transparent outline-none appearance-none bg-no-repeat bg-[right_1rem_center]"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")' }}
          >
            <option value="บัญชีเงินฝากออมทรัพย์ ทีทีบี ออลล์ฟรี">บัญชีเงินฝากออมทรัพย์ ทีทีบี ออลล์ฟรี</option>
            <option value="ทีทีบี เซฟวิ่ง แคร์">ทีทีบี เซฟวิ่ง แคร์</option>
          </select>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-3">การตรวจสอบความปลอดภัย</label>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="bg-white border-2 border-dashed border-gray-300 px-6 py-2 rounded font-mono text-2xl tracking-widest text-ttb-blue select-none shadow-sm">
                {captcha}
              </div>
              <button
                type="button"
                onClick={refreshCaptcha}
                className="p-2 text-ttb-blue hover:bg-white rounded-full transition-colors"
                title="Refresh Captcha"
              >
                <RefreshCw size={24} />
              </button>
            </div>
            <div className="flex-grow w-full">
              <input
                type="text"
                className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-ttb-blue focus:border-transparent outline-none ${
                  errors.captcha ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="พิมพ์รหัสที่เห็นข้างต้น"
                value={userInputCaptcha}
                onChange={(e) => setUserInputCaptcha(e.target.value)}
              />
              {errors.captcha && <p className="mt-1 text-xs text-red-500">{errors.captcha}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 text-xs text-gray-500 bg-blue-50 p-4 rounded-lg">
          <Info size={16} className="text-ttb-blue shrink-0 mt-0.5" />
          <p>ข้อมูลของท่านจะถูกส่งไปยังระบบตรวจสอบเพื่อเช็คสิทธิ์ความคุ้มครองประกันอุบัติเหตุที่แฝงมากับบัญชีเงินฝากของท่าน โดยความคุ้มครองเป็นไปตามเงื่อนไขที่ธนาคารกำหนด</p>
        </div>

        <button
          type="submit"
          className="w-full ttb-blue text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all"
        >
          ตรวจสอบสิทธิ์
        </button>
      </form>
    </div>
  );
};

export default EntitlementForm;
