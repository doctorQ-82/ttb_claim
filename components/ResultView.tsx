
import React from 'react';
import { CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { VerificationResult } from '../types';

interface Props {
  result: VerificationResult;
  onNext: () => void;
  onBack: () => void;
}

const ResultView: React.FC<Props> = ({ result, onNext, onBack }) => {
  return (
    <div className="max-w-xl mx-auto text-center py-4">
      <div className={`mb-8 inline-flex p-4 rounded-full ${
        result.eligible ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
      }`}>
        {result.eligible ? <CheckCircle2 size={64} /> : <AlertCircle size={64} />}
      </div>

      <h2 className={`text-3xl font-bold mb-4 ${
        result.eligible ? 'text-green-700' : 'text-red-700'
      }`}>
        {result.eligible ? 'ยินดีด้วย!' : 'ขออภัย...'}
      </h2>
      
      <p className="text-xl text-gray-700 mb-8 leading-relaxed">
        {result.message}
      </p>

      {result.eligible && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-left mb-10">
          <h4 className="font-semibold text-ttb-blue mb-2 flex items-center gap-2">
            <CheckCircle2 size={18} /> สรุปสิทธิประโยชน์ของท่าน
          </h4>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex gap-2">• คุ้มครองอุบัติเหตุ 24 ชม. ทั่วโลก</li>
            <li className="flex gap-2">• ค่ารักษาพยาบาลสูงสุด 3,000 บาท/อุบัติเหตุ (ไม่จำกัดครั้ง)</li>
            <li className="flex gap-2">• กรณีเสียชีวิต/ทุพพลภาพ สูงสุด 20 เท่าของเงินฝาก</li>
            <li className="flex gap-2">• ไม่ต้องสำรองจ่าย ณ โรงพยาบาลคู่สัญญา</li>
          </ul>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={onBack}
          className="flex-1 px-8 py-4 border border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft size={20} /> กลับไปแก้ไขข้อมูล
        </button>
        <button
          onClick={onNext}
          disabled={!result.eligible}
          className={`flex-1 px-8 py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            result.eligible 
            ? 'ttb-blue hover:shadow-xl hover:brightness-110 active:scale-95' 
            : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          ไปขั้นตอนถัดไป <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default ResultView;
