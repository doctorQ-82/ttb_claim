
import React, { useRef } from 'react';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  onAccept: () => void;
  onClose: () => void;
}

const ConsentModal: React.FC<Props> = ({ onAccept, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Validation logic removed as per user request to have the button work without validation

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="ttb-blue p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} />
            <h3 className="text-xl font-medium">ข้อกำหนดและเงื่อนไขการใช้ข้อมูล</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div 
          ref={scrollRef}
          className="p-8 overflow-y-auto text-gray-600 leading-relaxed text-sm md:text-base space-y-6"
        >
          <div className="space-y-4">
            <p className="font-semibold text-gray-800">
              ข้าพเจ้ายินยอมให้บริษัทฯ และคู่ค้า เก็บรวบรวม ใช้ข้อมูลส่วนบุคคลในการดำเนินการตามสัญญาประกันภัย แนะนำผลิตภัณฑ์ บริการแจ้งข่าวสารอื่นๆ และเปิดเผยข้อเท็จจริงเกี่ยวกับสุขภาพและข้อมูลของผู้เอาประกันภัยต่อสำนักงานคณะกรรมการกำกับและส่งเสริมการประกอบธุรกิจประกันภัย (คปภ.) เพื่อประโยชน์ในการกำกับดูแลธุรกิจประกันภัย
            </p>
            
            <p>
              บริษัทมีสิทธิ์ตรวจสอบประวัติการรักษาพยาบาลและการตรวจวินิจฉัยของผู้เอาประกันภัยเท่าที่จำเป็นกับการประกันภัยนี้ และมีสิทธิ์ทำการชันสูตรพลิกศพในกรณีที่มีเหตุจำเป็นและไม่เป็นการขัดต่อกฎหมายโดยค่าใช้จ่ายของบริษัท
            </p>

            <p>
              ในกรณีที่ผู้เอาประกันภัยไม่ยินยอมให้บริษัทตรวจสอบประวัติการรักษาพยาบาลและการตรวจวินิจฉัยของผู้เอาประกันภัยเพื่อประกอบการพิจารณาจ่ายค่าทดแทนนั้น บริษัทสามารถปฏิเสธการให้ความคุ้มครองแก่ผู้เอาประกันภัยได้
            </p>
          </div>

          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 space-y-3">
            <h4 className="flex items-center gap-2 font-bold text-ttb-orange">
              <AlertCircle size={18} />
              คำเตือนของสำนักงานคณะกรรมการกำกับและส่งเสริมการประกอบธุรกิจประกันภัย (คปภ.)
            </h4>
            <p className="text-gray-700 italic">
              ให้ตอบคำถามข้างต้นตามความเป็นจริงทุกข้อ หากผู้เอาประกันภัยปกปิดข้อความจริง หรือแถลงข้อความอันเป็นเท็จจะมีผลให้สัญญาประกันภัยนี้ตกเป็นโมฆะ ซึ่งบริษัทมีสิทธิบอกล้างสัญญาประกันภัย ตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 865
            </p>
          </div>
          
          <p className="text-center text-xs text-gray-400 pb-4">
            การกดปุ่มยืนยัน ถือว่าท่านได้รับทราบและตกลงตามเงื่อนไขที่ระบุไว้ข้างต้นทุกประการ
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 bg-white text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl font-medium transition-all ttb-orange text-white shadow-lg hover:brightness-110 active:scale-95"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
