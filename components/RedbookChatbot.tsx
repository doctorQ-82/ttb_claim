import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, Car, RotateCcw, Loader2, Database, Sparkles } from 'lucide-react';
import { ChatMessage, RedbookMatch, RedbookQuery, RedbookRecord } from '../types';
import { loadRedbook } from '../services/redbookApi';
import { findMatches, distinctBrands, parseFreeText, normalize } from '../services/redbookMatch';

/** Conversation steps for the guided lookup. */
type Step = 'brand' | 'model' | 'year' | 'result';

let msgSeq = 0;
const newMsg = (role: ChatMessage['role'], text: string, matches?: RedbookMatch[]): ChatMessage => ({
  id: `m${msgSeq++}`,
  role,
  text,
  matches,
});

const formatBaht = (v: number | null): string =>
  v == null ? '-' : v.toLocaleString('th-TH', { maximumFractionDigits: 0 }) + ' บาท';

const confidenceLabel = (score: number): { text: string; cls: string } => {
  if (score >= 0.85) return { text: 'ตรงมาก', cls: 'bg-green-100 text-green-700' };
  if (score >= 0.6) return { text: 'ใกล้เคียง', cls: 'bg-amber-100 text-amber-700' };
  return { text: 'ใกล้เคียงบางส่วน', cls: 'bg-gray-100 text-gray-600' };
};

const MatchCard: React.FC<{ match: RedbookMatch; rank: number }> = ({ match, rank }) => {
  const { record, score } = match;
  const conf = confidenceLabel(score);
  const title = [record.brand, record.model].filter(Boolean).join(' ');
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg ttb-blue text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {rank}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ttb-blue truncate">{title || '-'}</p>
            <p className="text-xs text-gray-500 truncate">
              {[record.subModel, record.year ?? null, record.bodyType].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>
        <span className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${conf.cls}`}>
          {conf.text} {Math.round(score * 100)}%
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-500">ราคากลาง (Redbook)</span>
        <span className="font-semibold text-ttb-orange">{formatBaht(record.value)}</span>
      </div>
    </div>
  );
};

const Bubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isBot = message.role === 'bot';
  return (
    <div className={`flex gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <div className="w-8 h-8 rounded-full ttb-blue text-white flex items-center justify-center shrink-0">
          <Bot size={18} />
        </div>
      )}
      <div className={`max-w-[80%] ${isBot ? '' : 'order-1'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isBot
              ? 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'
              : 'ttb-blue text-white rounded-tr-sm'
          }`}
        >
          {message.text}
        </div>
        {message.matches && message.matches.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.matches.map((m, i) => (
              <MatchCard key={`${m.record.brand}-${m.record.model}-${i}`} match={m} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RedbookChatbot: React.FC = () => {
  const [records, setRecords] = useState<RedbookRecord[]>([]);
  const [source, setSource] = useState<'api' | 'sample'>('sample');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState<Step>('brand');
  const [query, setQuery] = useState<RedbookQuery>({ brand: '', model: '', year: null });

  const scrollRef = useRef<HTMLDivElement>(null);
  const brands = useMemo(() => distinctBrands(records), [records]);

  // Load the dataset once on mount, then greet.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { records: recs, source: src } = await loadRedbook();
      if (!alive) return;
      setRecords(recs);
      setSource(src);
      setLoading(false);
      setMessages([
        newMsg(
          'bot',
          'สวัสดีครับ 👋 ผมคือผู้ช่วยค้นหาข้อมูลราคากลางรถยนต์ (Redbook)\n\nบอกผมได้เลยว่ารถคันไหน เช่น "Toyota Camry 2018" หรือเริ่มจากยี่ห้อก่อนก็ได้ครับ\n\nรถ "ยี่ห้อ" อะไรครับ?',
        ),
      ]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const pushBot = (text: string, matches?: RedbookMatch[]) =>
    setMessages((prev) => [...prev, newMsg('bot', text, matches)]);

  const runSearch = (q: RedbookQuery) => {
    const matches = findMatches(records, q, 5);
    const summary = [q.brand, q.model, q.year].filter(Boolean).join(' ');
    if (!matches.length) {
      pushBot(
        `ขออภัยครับ ไม่พบรุ่นที่ใกล้เคียงกับ "${summary}" ในฐานข้อมูล\n\nลองพิมพ์ "เริ่มใหม่" เพื่อค้นหาอีกครั้งได้ครับ`,
      );
      return;
    }
    pushBot(
      `นี่คือ ${matches.length} รุ่นที่ใกล้เคียงกับ "${summary}" มากที่สุดครับ (เรียงตามความใกล้เคียง):`,
      matches,
    );
    pushBot('อยากค้นหาคันใหม่ไหมครับ? พิมพ์ "เริ่มใหม่" ได้เลย หรือพิมพ์รถคันใหม่มาได้เลยครับ');
    setStep('result');
  };

  const restart = () => {
    setQuery({ brand: '', model: '', year: null });
    setStep('brand');
    pushBot('เริ่มค้นหาใหม่ครับ — รถ "ยี่ห้อ" อะไรครับ?');
  };

  const handleSubmit = (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, newMsg('user', text)]);
    setInput('');

    const normalizedText = normalize(text);
    if (['เริ่มใหม่', 'reset', 'ใหม่', 'ค้นหาใหม่'].includes(normalizedText)) {
      restart();
      return;
    }

    // If the user types a rich line (brand + model + year), parse it whole.
    const parsed = parseFreeText(text, brands);
    const looksComplete = parsed.brand && parsed.model;

    if (step === 'brand') {
      if (looksComplete) {
        const merged: RedbookQuery = { ...parsed };
        setQuery(merged);
        if (merged.year == null) {
          setStep('year');
          pushBot(
            `รับทราบ: ${[merged.brand, merged.model].join(' ')}\n"ปีรถ" ปีไหนครับ? (พิมพ์ตัวเลข เช่น 2018 หรือพิมพ์ "ข้าม" ได้)`,
          );
        } else {
          runSearch(merged);
        }
        return;
      }
      const merged = { ...query, brand: text };
      setQuery(merged);
      setStep('model');
      pushBot(`ยี่ห้อ "${text}" ครับ — แล้ว "รุ่นรถ" รุ่นอะไรครับ? (เช่น Camry, Civic)`);
      return;
    }

    if (step === 'model') {
      const merged = { ...query, model: text };
      setQuery(merged);
      setStep('year');
      pushBot('ได้ครับ — "ปีรถ" ปีไหนครับ? (พิมพ์ตัวเลข เช่น 2018 หรือพิมพ์ "ข้าม" หากไม่ทราบ)');
      return;
    }

    if (step === 'year') {
      let year: number | null = query.year;
      if (!['ข้าม', 'skip', 'ไม่ทราบ', '-'].includes(normalizedText)) {
        const m = text.match(/\d{4}/);
        year = m ? Number(m[0]) : null;
      } else {
        year = null;
      }
      const merged = { ...query, year };
      setQuery(merged);
      runSearch(merged);
      return;
    }

    // step === 'result': treat any new input as a fresh free-text search.
    const fresh = parseFreeText(text, brands);
    if (fresh.brand && fresh.model) {
      setQuery(fresh);
      runSearch(fresh);
    } else {
      setQuery({ brand: text, model: '', year: null });
      setStep('model');
      pushBot(`ยี่ห้อ "${text}" ครับ — แล้ว "รุ่นรถ" รุ่นอะไรครับ?`);
    }
  };

  const stepHint: Record<Step, string> = {
    brand: 'พิมพ์ยี่ห้อ หรือทั้งคัน เช่น "Toyota Camry 2018"',
    model: 'พิมพ์ชื่อรุ่น เช่น "Camry"',
    year: 'พิมพ์ปี เช่น "2018" หรือ "ข้าม"',
    result: 'พิมพ์ "เริ่มใหม่" หรือรถคันใหม่',
  };

  return (
    <div className="flex flex-col h-[70vh] min-h-[520px]">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl ttb-orange text-white flex items-center justify-center">
            <Car size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ttb-blue flex items-center gap-2">
              ผู้ช่วยค้นหาราคากลางรถ (Redbook)
              <Sparkles size={16} className="text-ttb-orange" />
            </h2>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Database size={12} />
              {loading
                ? 'กำลังโหลดฐานข้อมูล…'
                : `ฐานข้อมูล ${records.length.toLocaleString('th-TH')} รายการ • ${
                    source === 'api' ? 'จาก API' : 'ชุดข้อมูลตัวอย่าง'
                  }`}
            </p>
          </div>
        </div>
        <button
          onClick={restart}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-ttb-blue flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
          title="เริ่มค้นหาใหม่"
        >
          <RotateCcw size={16} /> <span className="hidden sm:inline">เริ่มใหม่</span>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto py-4 space-y-4 bg-gray-50/60 px-1">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400 gap-2">
            <Loader2 size={20} className="animate-spin" /> กำลังเตรียมข้อมูล…
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(input);
        }}
        className="pt-4 border-t border-gray-100"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={loading ? 'กำลังโหลด…' : stepHint[step]}
            className="flex-grow px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ttb-blue/30 focus:border-ttb-blue text-sm disabled:bg-gray-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-12 h-12 ttb-blue text-white rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default RedbookChatbot;
