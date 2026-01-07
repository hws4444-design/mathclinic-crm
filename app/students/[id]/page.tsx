"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// ✅ app 폴더에 있는 supabase.ts를 찾기 위해 두 단계(../..) 올라갑니다.
import { supabase } from "../../supabase";

// ---------------------------------------------------------
// 1. 유틸리티 & 타입
// ---------------------------------------------------------
const WEAKNESS_KEYWORDS = [
  { key: "제곱근", label: "제곱근" }, { key: "분수", label: "분수" }, { key: "역수", label: "역수" },
  { key: "느림", label: "연산속도" }, { key: "빠르지", label: "연산속도" }, { key: "어설픔", label: "개념부족" },
  { key: "설명", label: "서술형" }, { key: "이유", label: "서술형" }, { key: "헷갈", label: "개념혼동" },
  { key: "오답", label: "오답패턴" }, { key: "실수", label: "단순실수" },
];

// 텍스트에서 태그 추출
function extractTags(text: string) {
  const found: Set<string> = new Set();
  WEAKNESS_KEYWORDS.forEach(({ key, label }) => { if (text.includes(key)) found.add(label); });
  return Array.from(found);
}

// 이미지 압축 (DB 용량 절약)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600; 
        const scale = MAX_WIDTH / img.width;
        canvas.width = (scale < 1) ? MAX_WIDTH : img.width;
        canvas.height = (scale < 1) ? img.height * scale : img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// DB 데이터 타입 정의
type Log = { id: number; created_at: string; text: string; tags: string[]; image?: string; };
type Profile = { id: number; name: string; school: string; grade: string; goals: string; total_sessions: number; };

// ---------------------------------------------------------
// 2. 메인 컴포넌트
// ---------------------------------------------------------
export default function StudentDetail() {
  const params = useParams();
  const id = Number(params?.id); // URL에서 ID 가져오기 (숫자로 변환)
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<any>(new Date());
  
  // 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // ✅ [DB] 데이터 불러오기
  const loadData = async () => {
    if (!id) return;
    setLoading(true);

    // 1. 학생 정보 가져오기
    const { data: student, error: sError } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (sError) { 
        console.error(sError);
        alert("학생 정보를 찾을 수 없습니다."); 
        router.push("/"); 
        return; 
    }
    setProfile(student);
    setEditForm(student);

    // 2. 수업 기록 가져오기 (최신순)
    const { data: logData } = await supabase
      .from('logs')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false });

    setLogs(logData || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  // ✅ [DB] 기록 저장 (Insert)
  const handleSaveLog = async () => {
    if (!input.trim() && !selectedImage) return;
    
    // 횟수 초과 경고
    if (profile && profile.total_sessions > 0 && logs.length >= profile.total_sessions) {
        if (!confirm("이미 정해진 수업 횟수가 끝났습니다! 그래도 추가하시겠습니까?")) return;
    }

    const newLog = { 
      student_id: id, 
      text: input, 
      tags: extractTags(input), 
      image: selectedImage 
    };

    const { error } = await supabase.from('logs').insert([newLog]);
    
    if (error) {
        alert("저장 실패: " + error.message);
    } else {
        setInput("");
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadData(); // 목록 새로고침
    }
  };

  // ✅ [DB] 기록 삭제 (Delete)
  const handleDeleteLog = async (logId: number) => {
    if (!confirm("정말 이 기록을 삭제하시겠습니까?")) return;
    await supabase.from('logs').delete().eq('id', logId);
    loadData();
  };

  // ✅ [DB] 학생 정보 수정 (Update)
  const handleUpdateProfile = async () => {
    const { error } = await supabase
      .from('students')
      .update({ 
        name: editForm.name, 
        school: editForm.school, 
        grade: editForm.grade, 
        goals: editForm.goals,
        total_sessions: Number(editForm.total_sessions)
      })
      .eq('id', id);

    if (!error) {
        alert("정보가 수정되었습니다.");
        setIsEditModalOpen(false);
        loadData();
    } else {
        alert("수정 실패: " + error.message);
    }
  };

  // ✅ [DB] 학생 삭제 (Delete)
  const handleDeleteStudent = async () => {
    if (!confirm("정말 이 학생을 삭제하시겠습니까? (기록도 모두 삭제됩니다)")) return;
    
    const { error } = await supabase.from('students').delete().eq('id', id);
    
    if (!error) {
        alert("삭제되었습니다.");
        router.push("/");
    } else {
        alert("삭제 실패: " + error.message);
    }
  };

  // 출석 확인 로직
  const isAttended = (date: Date) => {
    const dateString = date.toLocaleDateString();
    return logs.some(log => new Date(log.created_at).toLocaleDateString() === dateString);
  };

  // 이미지 선택 핸들러
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setSelectedImage(compressed);
    }
  };

  // 차트 데이터 가공
  const chartData = Object.entries(logs.reduce((acc: any, log) => {
      const date = new Date(log.created_at).toLocaleDateString("ko-KR", { month: 'numeric', day: 'numeric' });
      acc[date] = (acc[date] || 0) + (log.tags?.length || 0);
      return acc;
  }, {})).map(([date, count]) => ({ date, count })).reverse();

  if (loading) return <div className="p-10 text-center text-gray-500">데이터 로딩중...</div>;
  if (!profile) return <div className="p-10">정보 없음</div>;

  const currentSessions = logs.length;
  const totalSessions = profile.total_sessions || 0;
  const remainSessions = totalSessions - currentSessions;

  return (
    <main className="min-h-screen bg-gray-50 p-6 relative">
      <style jsx global>{` .react-calendar { border: none; width: 100%; } .dot { height: 6px; width: 6px; background-color: #3B82F6; border-radius: 50%; margin: 0 auto; } `}</style>

      <div className="max-w-6xl mx-auto">
        {/* 상단 헤더 */}
        <header className="flex justify-between items-center mb-6">
            <div>
                <Link href="/" className="text-gray-500 text-sm">← 목록으로 돌아가기</Link>
                <div className="flex items-center gap-3 mt-1">
                    <h1 className="text-3xl font-bold">{profile.name}</h1>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{profile.grade}</span>
                    
                    {/* 회차 정보 */}
                    {totalSessions > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${remainSessions <= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            {remainSessions <= 0 ? "🚨 결제 필요" : `${currentSessions}/${totalSessions}회 진행`}
                        </span>
                    )}
                    
                    <button onClick={() => setIsEditModalOpen(true)} className="text-gray-400 underline text-xs ml-2 hover:text-gray-600">⚙️ 설정</button>
                </div>
                <p className="text-gray-600 text-sm mt-1">{profile.school} · {profile.goals}</p>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 왼쪽: 입력창 + 달력 */}
            <section className="space-y-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h2 className="font-bold mb-3">✍️ 오늘 수업 기록</h2>
                    <textarea 
                        className="w-full p-2 border rounded resize-none h-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        placeholder="수업 내용, 숙제, 코멘트 등을 입력하세요." 
                    />
                    
                    {/* 이미지 미리보기 */}
                    {selectedImage && (
                        <div className="mt-2 relative h-32 bg-gray-100 rounded border">
                            <img src={selectedImage} className="h-full w-full object-contain mx-auto" alt="미리보기" />
                            <button onClick={() => setSelectedImage(null)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">X</button>
                        </div>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                        <label className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded cursor-pointer text-sm transition flex items-center gap-1">
                            📷 사진
                            <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageSelect} />
                        </label>
                        <button onClick={handleSaveLog} className="bg-blue-600 text-white flex-1 rounded font-bold hover:bg-blue-700 transition">
                            기록 저장
                        </button>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold mb-2 text-sm text-gray-700">📅 출석 달력</h3>
                    <Calendar 
                        onChange={setDate} 
                        value={date} 
                        locale="ko-KR" 
                        formatDay={(_, date) => date.getDate().toString()} 
                        tileContent={({ date, view }) => view === 'month' && isAttended(date) ? <div className="dot"></div> : null} 
                    />
                </div>
            </section>

            {/* 오른쪽: 그래프 + 기록 리스트 */}
            <section className="lg:col-span-2 space-y-4">
                {chartData.length > 0 && (
                    <div className="bg-white p-5 rounded-xl shadow-sm h-48 border">
                        <h3 className="font-bold mb-2 text-sm text-gray-700">📉 약점 발견 추이</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{fontSize:12}} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{fontSize:12}} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} activeDot={{r:6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border p-5 min-h-[400px] flex flex-col">
                    <h2 className="font-bold mb-4 text-lg">📚 누적 기록 ({logs.length})</h2>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto flex-1">
                        {logs.length === 0 ? <p className="text-center text-gray-400 py-10">아직 기록이 없습니다.</p> : logs.map(log => (
                            <div key={log.id} className="border-l-4 border-blue-200 pl-4 py-1 hover:border-blue-500 transition">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span className="font-bold text-gray-600">{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <button onClick={() => handleDeleteLog(log.id)} className="text-gray-300 hover:text-red-500 px-2">🗑️ 삭제</button>
                                </div>
                                {log.image && (
                                    <div className="mb-2 mt-1 w-40 rounded border overflow-hidden">
                                        <img src={log.image} className="w-full h-auto" alt="첨부사진" />
                                    </div>
                                )}
                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{log.text}</p>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    {log.tags?.map((t, i) => <span key={i} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">#{t}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
      </div>
      
      {/* 수정 모달 */}
      {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
                  <h2 className="font-bold text-lg mb-4">학생 정보 수정</h2>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-500">이름</label>
                          <input className="w-full border p-2 rounded" value={editForm.name || ""} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500">학교</label>
                          <input className="w-full border p-2 rounded" value={editForm.school || ""} onChange={(e) => setEditForm({...editForm, school: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500">학년</label>
                          <input className="w-full border p-2 rounded" value={editForm.grade || ""} onChange={(e) => setEditForm({...editForm, grade: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500">목표</label>
                          <input className="w-full border p-2 rounded" value={editForm.goals || ""} onChange={(e) => setEditForm({...editForm, goals: e.target.value})} />
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                          <span className="text-xs font-bold text-blue-600 block mb-1">총 수업 횟수 (결제 알림용)</span>
                          <input type="number" className="w-full border p-1 rounded" value={editForm.total_sessions || 0} onChange={(e) => setEditForm({...editForm, total_sessions: e.target.value})} />
                      </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                      <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 py-2 rounded text-sm hover:bg-gray-200">취소</button>
                      <button onClick={handleUpdateProfile} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700">수정 완료</button>
                  </div>
                  <button onClick={handleDeleteStudent} className="w-full mt-4 text-red-500 text-xs underline hover:text-red-700">⚠️ 학생 삭제하기</button>
              </div>
          </div>
      )}
    </main>
  );
}