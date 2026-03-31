
import React, { useState, useCallback } from 'react';
import { ShieldCheck, UserCheck, FileText, CheckCircle, ChevronRight, Menu, HelpCircle } from 'lucide-react';
import EntitlementForm from './components/EntitlementForm';
import ConsentModal from './components/ConsentModal';
import ResultView from './components/ResultView';
import UploadSection from './components/UploadSection';
import ConfirmationView from './components/ConfirmationView';
import { UserData, UploadedFile, VerificationResult, ClaimType } from './types';

const App: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showConsent, setShowConsent] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  const handleEntitlementSubmit = (data: UserData) => {
    setUserData(data);
    setShowConsent(true);
  };

  const handleConsentAccept = () => {
    setShowConsent(false);
    // Simulate API delay
    const isEligible = Math.random() > 0.3; // 70% chance of eligibility
    setVerificationResult({
      eligible: isEligible,
      message: isEligible 
        ? "คุณได้รับสิทธิ์ความคุ้มครองประกันอุบัติเหตุกลุ่ม" 
        : "ขออภัย คุณไม่เข้าเงื่อนไขการรับสิทธิ์ความคุ้มครอง โปรดตรวจสอบเงื่อนไขบัญชีอีกครั้ง"
    });
    setStep(2);
  };

  const handleNextToUpload = () => {
    setStep(3);
  };

  const handleFinish = () => {
    const ref = 'TTB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setReferenceNumber(ref);
    setStep(4);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <EntitlementForm onSubmit={handleEntitlementSubmit} />;
      case 2:
        return verificationResult && (
          <ResultView 
            result={verificationResult} 
            onNext={handleNextToUpload} 
            onBack={() => setStep(1)} 
          />
        );
      case 3:
        return (
          <UploadSection 
            files={uploadedFiles}
            setFiles={setUploadedFiles}
            onFinish={handleFinish}
          />
        );
      case 4:
        return (
          <ConfirmationView 
            userData={userData}
            files={uploadedFiles}
            referenceNumber={referenceNumber}
            onReset={() => {
              setStep(1);
              setUserData(null);
              setUploadedFiles([]);
              setVerificationResult(null);
            }}
          />
        );
      default:
        return <EntitlementForm onSubmit={handleEntitlementSubmit} />;
    }
  };

  const steps = [
    { id: 1, name: 'ตรวจสอบสิทธิ์', icon: UserCheck },
    { id: 2, name: 'ผลการตรวจสอบ', icon: ShieldCheck },
    { id: 3, name: 'ส่งเอกสารเคลม', icon: FileText },
    { id: 4, name: 'เสร็จสิ้น', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="ttb-blue text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center font-bold text-ttb-blue text-2xl">
              ttb
            </div>
            <h1 className="text-xl font-medium tracking-wide">Verification & Claims</h1>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <span className="text-sm opacity-80 cursor-pointer hover:opacity-100">บริการลูกค้า</span>
            <HelpCircle size={20} className="cursor-pointer" />
            <Menu size={24} className="cursor-pointer" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-ttb-orange -translate-y-1/2 z-0 transition-all duration-500 ease-in-out"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            ></div>
            
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = s.id <= step;
              return (
                <div key={s.id} className="relative z-10 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'ttb-orange text-white shadow-lg scale-110' : 'bg-white border-2 border-gray-200 text-gray-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <span className={`absolute top-12 whitespace-nowrap text-xs font-medium ${
                    isActive ? 'text-ttb-blue' : 'text-gray-400'
                  }`}>
                    {s.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 md:p-10">
            {renderStep()}
          </div>
        </div>
      </main>

      {/* Consent Modal Overlay */}
      {showConsent && (
        <ConsentModal 
          onAccept={handleConsentAccept} 
          onClose={() => setShowConsent(false)} 
        />
      )}

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2026 บริษัท ฟอลคอนประกันภัย จำกัด (มหาชน). สงวนลิขสิทธิ์</p>
          <div className="mt-2 flex justify-center gap-4">
            <a href="#" className="hover:text-ttb-blue underline">ข้อกำหนดและเงื่อนไข</a>
            <a href="#" className="hover:text-ttb-blue underline">นโยบายความเป็นส่วนตัว</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
