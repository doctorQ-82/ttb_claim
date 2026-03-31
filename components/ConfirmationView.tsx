
import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { UserData, UploadedFile, ClaimType } from '../types';

interface Props {
  userData: UserData | null;
  claimType: ClaimType;
  files: UploadedFile[];
  referenceNumber: string;
  onReset: () => void;
}

const ConfirmationView: React.FC<Props> = ({ userData, claimType, files, referenceNumber, onReset }) => {
  return (
    <div className="max-w-xl mx-auto py-4 text-center">
      <div className="mb-6 inline-flex p-5 bg-green-100 text-green-600 rounded-full">
        <CheckCircle size={72} />
      </div>

      <h2 className="text-3xl font-bold text-gray-800 mb-2">ส่งคำขอสำเร็จ!</h2>
      <p className="text-gray-500 mb-8">ธนาคารได้รับข้อมูลการเรียกร้องค่าสินไหมของท่านเรียบร้อยแล้ว</p>

      <div className="bg-gray-50 rounded-3xl p-8 text-left mb-8 border border-gray-100 shadow-inner">
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
          <span className="text-gray-500 text-sm">เลขที่อ้างอิง (Reference No.)</span>
          <span className="text-ttb-blue font-bold text-lg">{referenceNumber}</span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">ชื่อ-นามสกุล</span>
            <span className="font-medium text-gray-800">{userData?.firstName} {userData?.lastName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">ประเภทบัญชี</span>
            <span className="font-medium text-gray-800">{userData?.accountType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">ประเภทการเคลม</span>
            <span className="font-medium text-ttb-orange">{
              claimType === 'Medical Expense' ? 'ค่ารักษาพยาบาล' : 
              claimType === 'Permanent Disability' ? 'ทุพพลภาพถาวร' : 'เสียชีวิต'
            }</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">จำนวนเอกสารที่อัปโหลด</span>
            <span className="font-medium text-gray-800">{files.length} ไฟล์</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-orange-50 rounded-xl text-ttb-orange text-sm mb-10 flex gap-3 text-left border border-orange-100">
        <CheckCircle size={18} className="shrink-0" />
        <p>เจ้าหน้าที่จะตรวจสอบเอกสารและติดต่อกลับหาท่านภายใน 3-5 วันทำการ ผ่านเบอร์โทรศัพท์ที่ท่านให้ไว้กับธนาคาร</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onReset}
          className="w-full ttb-blue text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          กลับสู่หน้าหลัก <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default ConfirmationView;
