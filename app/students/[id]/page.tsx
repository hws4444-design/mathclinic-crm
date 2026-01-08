"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// ✅ supabase 연결
import { supabase } from "../../supabase";

// ---------------------------------------------------------
// 1. 유틸리티 & 타입
// ---------------------------------------------------------
const WEAKNESS_KEYWORDS = [
  { key: "제곱근", label: "제곱근" }, { key: "분수", label: "분수" }, { key: "역수", label: "역수" },
  { key: "느림", label: "연산속도" }, { key: "빠르지", label: "연산속도" }, { key: "어설픔", label: "개념부족" },
  { key: "설명", label: "서술형" }, { key: "이유", label: "서술형" }, { key: "헷갈", label: "개념혼동" },
  { key: "오답", label: "오답패턴" }, { key: "실수", label: "단순실수" }, { key: "숙제", label: "숙제미흡" },
];

function extractTags(text: string) {
  const found: Set<string> = new Set();
  WEAKNESS_KEYWORDS.forEach(({ key, label }) => { if (text.includes(key)) found.add(label); });
  return Array.from(found);
}

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

type Log = { id: number; created_at: string; text: string; tags: string[]; image?: string; log_type?: string; };
type Profile = { 
    id: number; 
    name: string; 
    school: string; 
    grade: string; 
    goals: string; 
    student_phone?: string;
    father_name?: string;
    father_phone?: string;
    mother_name?: string;
    mother_phone?: string;
    start_date?: string;
    consultation_notes?: string;
    class_type?: string; 
    total_sessions: number;
    end_date?: string;
};

// ---------------------------------------------------------
// 2. 메인 컴포넌트
// ---------------------------------------------------------
export default function StudentDetail() {
  const params = useParams();
  const id = Number(params?.id);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<any>(new Date());
  
  // 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  
  // 상담 입력 상태
  const [consultInput, setConsultInput] = useState("");
  const [consultGoal, setConsultGoal] = useState(""); // 🆕 상담창용 목표 상태

  // ✅ 데이터 불러오기
  const loadData = async () => {
    if (!id) return;
    setLoading(true);

    const { data: student, error: sError } = await supabase.from('students').select('*').eq('id', id).single();
    if (sError) { console.error(sError); alert("학생 없음"); router.push("/"); return; }
    setProfile(student);
    setEditForm(student);
    setConsultGoal(student.goals || ""); // 목표 초기값 설정

    const { data: logData } = await supabase.from('logs').select('*').eq('student_id', id).order('created_at', { ascending: false });
    setLogs(logData || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  // ✅ 수업 기록 저장
  const handleSaveLessonLog = async () => {
    if (!input.trim() && !selectedImage) return;
    
    if (profile?.class_type === 'count' && profile.total_sessions > 0 && logs.filter(l => l.log_type !== 'consultation').length >= profile.total_sessions) {
        if (!confirm("이미 정해진 수업 횟수가 끝났습니다! 그래도 추가하시겠습니까?")) return;
    }

    const newLog = { 
      student_id: id, text: input, tags: extractTags(input), image: selectedImage, log_type: 'lesson' 
    };
    const { error } = await supabase.from('logs').insert([newLog]);
    if (!error) { setInput(""); setSelectedImage(null); if(fileInputRef.current) fileInputRef.current.value = ""; loadData(); }
    else alert(error.message);
  };

  // ✅ 상담 및 목표 저장 (핵심 기능 변경!)
  const handleSaveConsultLog = async () => {
    // 1. 목표 변경 감지
    const isGoalChanged = profile && consultGoal !== profile.goals;
    let goalMsg = "";

    if (isGoalChanged) {
        // DB 업데이트
        await supabase.from('students').update({ goals: consultGoal }).eq('id', id);
        // 목표 변경 로그 생성 (consultation 타입으로 저장하여 히스토리에 표시)
        await supabase.from('logs').insert([{ 
            student_id: id, 
            text: `🎯 학습 목표 변경: ${profile?.goals} → ${consultGoal}`, 
            tags: ['목표변경'], 
            log_type: 'consultation' 
        }]);
        goalMsg = "목표가 변경되었습니다.";
    }

    // 2. 상담 내용 저장 (내용이 있을 때만)
    if (consultInput.trim()) {
        const { error } = await supabase.from('logs').insert([{ 
            student_id: id, 
            text: consultInput, 
            tags: [], 
            log_type: 'consultation' 
        }]);
        if (error) return alert(error.message);
    } else if (!isGoalChanged) {
        return; // 내용도 없고 목표도 안 바꿨으면 아무것도 안 함
    }

    setConsultInput(""); 
    loadData(); 
    alert(`저장되었습니다. ${goalMsg}`);
  };

  const handleDeleteLog = async (logId: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from('logs').delete().eq('id', logId);
    loadData();
  };

  // ✅ 정보 수정 (목표 관련 로직 삭제 -> 상담창으로 이동)
  const handleUpdateProfile = async () => {
    const { error } = await supabase.from('students').update({
        name: editForm.name,
        school: editForm.school,
        grade: editForm.grade,
        // goals는 여기서 수정 안 함
        student_phone: editForm.student_phone,
        father_name: editForm.father_name,
        father_phone: editForm.father_phone,
        mother_name: editForm.mother_name,
        mother_phone: editForm.mother_phone,
        class_type: editForm.class_type,
        total_sessions: Number(editForm.total_sessions),
        end_date: editForm.end_date,
    }).eq('id', id);

    if (!error) { setIsEditModalOpen(false); loadData(); alert("수정 완료"); }
    else { alert("수정 실패: " + error.message); }
  };

  const handleDeleteStudent = async () => {
    if (!confirm("정말 삭제합니까?")) return;
    await supabase.from('students').delete().eq('id', id);
    router.push("/");
  };

  const isAttended = (date: Date) => {
    return logs.some(log => log.log_type !== 'consultation' && new Date(log.created_at).toLocaleDateString() === date.toLocaleDateString());
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setSelectedImage(compressed);
    }
  };

  const lessonLogs = logs.filter(l => l.log_type !== 'consultation');
  const consultLogs = logs.filter(l => l.log_type === 'consultation');

  const getRecommendation = () => {
    if (!profile) return "로딩 중...";
    const lastConsult = consultLogs[0];
    const summary = lastConsult 
        ? `지난 상담 (${new Date(lastConsult.created_at).toLocaleDateString()}) 요약:\n"${lastConsult.text.substring(0, 50)}${lastConsult.text.length > 50 ? '...' : ''}"` 
        : "아직 상담 기록이 없습니다.";

    const recentTags = lessonLogs.slice(0, 5).flatMap(l => l.tags);
    const uniqueTags = Array.from(new Set(recentTags));
    
    let recommendation = "";
    if (uniqueTags.length > 0) {
        recommendation = `💡 최근 수업에서 [${uniqueTags.join(', ')}] 관련 이슈가 있었습니다.`;
    } else {
        recommendation = `💡 최근 수업 이슈가 없습니다. 진로 목표에 대해 이야기해보세요.`;
    }
    return { summary, recommendation };
  };

  const smartData = getRecommendation();
  
  const chartData = Object.entries(lessonLogs.reduce((acc: any, log) => {
      const date = new Date(log.created_at).toLocaleDateString("ko-KR", { month: 'numeric', day: 'numeric' });
      acc[date] = (acc[date] || 0) + (log.tags?.length || 0);
      return acc;
  }, {})).map(([date, count]) => ({ date, count })).reverse();

  if (loading) return <div className="p-10 text-center text-gray-500">데이터 로딩중...</div>;
  if (!profile) return <div className="p-10">정보 없음</div>;

  const currentSessions = lessonLogs.length;
  const totalSessions = profile.total_sessions || 0;
  const remainSessions = totalSessions - currentSessions;

  return (
    <main className="min-h-screen bg-gray-50 p-6 relative">
      <style jsx global>{` .react-calendar { border: none; width: 100%; } .dot { height: 6px; width: 6px; background-color: #3B82F6; border-radius: 50%; margin: 0 auto; } `}</style>

      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6">
            <div>
                <Link href="/" className="text-gray-500 text-sm">← 목록으로 돌아가기</Link>
                <div className="flex items-center gap-3 mt-1">
                    <h1 className="text-3xl font-bold">{profile.name}</h1>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{profile.grade}</span>
                    
                    {profile.class_type === 'date' ? (
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-green-100 text-green-700">📅 {profile.end_date} 종료</span>
                    ) : (
                        totalSessions > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${remainSessions <= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                {remainSessions <= 0 ? "🚨 결제 필요" : `${currentSessions}/${totalSessions}회 진행`}
                            </span>
                        )
                    )}
                    
                    <button onClick={() => setIsEditModalOpen(true)} className="text-gray-400 underline text-xs ml-2 hover:text-gray-600">⚙️ 정보 수정</button>
                </div>
                <p className="text-gray-600 text-sm mt-1">{profile.school} · 🎯 {profile.goals}</p>
            </div>
            
            <button onClick={() => setIsConsultModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 flex items-center gap-2">
                💬 상담 기록 & 분석
            </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="space-y-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h2 className="font-bold mb-3">✍️ 오늘 수업 기록</h2>
                    <textarea 
                        className="w-full p-2 border rounded resize-none h-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={input} onChange={(e) => setInput(e.target.value)} placeholder="수업 내용 입력..." 
                    />
                    {selectedImage && (
                        <div className="mt-2 relative h-32 bg-gray-100 rounded border">
                            <img src={selectedImage} className="h-full w-full object-contain mx-auto" />
                            <button onClick={() => setSelectedImage(null)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">X</button>
                        </div>
                    )}
                    <div className="flex gap-2 mt-3">
                        <label className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded cursor-pointer text-sm transition flex items-center gap-1">
                            📷 <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageSelect} />
                        </label>
                        <button onClick={handleSaveLessonLog} className="bg-blue-600 text-white flex-1 rounded font-bold hover:bg-blue-700 transition">기록 저장</button>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold mb-2 text-sm text-gray-700">📅 출석 달력</h3>
                    <Calendar onChange={setDate} value={date} locale="ko-KR" formatDay={(_, date) => date.getDate().toString()} tileContent={({ date, view }) => view === 'month' && isAttended(date) ? <div className="dot"></div> : null} />
                </div>
            </section>

            <section className="lg:col-span-2 space-y-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold mb-3 text-sm text-gray-700">📞 연락처 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded">
                            <span className="block text-xs text-gray-500 mb-1">학생</span>
                            <span className="font-bold">{profile.student_phone || "-"}</span>
                        </div>
                        <div className="p-3 bg-blue-50 rounded">
                            <span className="block text-xs text-blue-500 mb-1">부 (아버지)</span>
                            <span className="block font-bold">{profile.father_name || "-"}</span>
                            <span className="block text-gray-600 text-xs">{profile.father_phone || "-"}</span>
                        </div>
                        <div className="p-3 bg-pink-50 rounded">
                            <span className="block text-xs text-pink-500 mb-1">모 (어머니)</span>
                            <span className="block font-bold">{profile.mother_name || "-"}</span>
                            <span className="block text-gray-600 text-xs">{profile.mother_phone || "-"}</span>
                        </div>
                    </div>
                </div>

                {chartData.length > 0 && (
                    <div className="bg-white p-5 rounded-xl shadow-sm h-48 border">
                        <h3 className="font-bold mb-2 text-sm text-gray-700">📉 약점 발견 추이</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{fontSize:12}} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{fontSize:12}} axisLine={false} tickLine={false} /><Tooltip /><Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} activeDot={{r:6}} /></LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border p-5 min-h-[400px] flex flex-col">
                    <h2 className="font-bold mb-4 text-lg">📚 수업 기록 ({lessonLogs.length})</h2>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto flex-1">
                        {lessonLogs.length === 0 ? <p className="text-center text-gray-400 py-10">기록 없음</p> : lessonLogs.map(log => {
                            const isGoalChange = log.tags?.includes('목표변경');
                            return (
                                <div key={log.id} className={`border-l-4 pl-4 py-3 transition rounded-r-lg ${isGoalChange ? 'border-yellow-400 bg-yellow-50' : 'border-blue-200 hover:border-blue-500'}`}>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span className="font-bold text-gray-600">{new Date(log.created_at).toLocaleDateString()}</span>
                                        <button onClick={() => handleDeleteLog(log.id)} className="text-gray-300 hover:text-red-500 px-2">🗑️</button>
                                    </div>
                                    {log.image && <div className="mb-2 mt-1 w-40 rounded border overflow-hidden"><img src={log.image} className="w-full h-auto" /></div>}
                                    <p className={`text-sm whitespace-pre-wrap ${isGoalChange ? 'font-bold' : ''}`}>{log.text}</p>
                                    {!isGoalChange && <div className="flex gap-1 mt-2 flex-wrap">{log.tags?.map((t, i) => <span key={i} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">#{t}</span>)}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
      </div>
      
      {/* 🆕 상담 전용 모달 */}
      {isConsultModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 md:p-4">
            <div className="bg-white w-full h-full md:max-w-4xl md:h-[85vh] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 bg-gray-50 border-r p-6 overflow-y-auto hidden md:block">
                    <h3 className="font-bold text-lg mb-4 text-gray-800">📂 상담 히스토리</h3>
                    <div className="space-y-4">
                        {consultLogs.length === 0 ? <p className="text-gray-400 text-sm">기록이 없습니다.</p> : consultLogs.map(log => {
                            // 목표 변경 로그인지 확인
                            const isGoalLog = log.tags?.includes('목표변경');
                            return (
                                <div key={log.id} className={`p-4 rounded-lg shadow-sm border ${isGoalLog ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${isGoalLog ? 'text-yellow-700 bg-yellow-100' : 'text-indigo-600 bg-indigo-50'}`}>{new Date(log.created_at).toLocaleDateString()}</span>
                                        <button onClick={() => handleDeleteLog(log.id)} className="text-gray-300 hover:text-red-500 text-xs">삭제</button>
                                    </div>
                                    <p className={`text-sm whitespace-pre-wrap ${isGoalLog ? 'font-bold text-gray-800' : 'text-gray-700'}`}>{log.text}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="w-full md:w-2/3 p-6 flex flex-col bg-white h-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">💬 상담 기록 & 목표 설정</h2>
                        <button onClick={() => setIsConsultModalOpen(false)} className="text-gray-500 hover:text-gray-800 p-2">✕ 닫기</button>
                    </div>
                    
                    {/* 🆕 목표 설정 (여기로 이동됨!) */}
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4 shadow-sm shrink-0">
                        <label className="text-xs text-yellow-800 font-bold mb-1 block">🎯 현재 학습 목표 (변경 후 저장하면 자동 기록)</label>
                        <input 
                            className="w-full border border-yellow-300 p-2 rounded font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                            value={consultGoal} 
                            onChange={(e) => setConsultGoal(e.target.value)} 
                        />
                    </div>

                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 mb-6 shrink-0">
                        <div className="mb-4 pb-4 border-b border-indigo-100">
                            <h4 className="text-xs font-bold text-indigo-500 uppercase mb-1">Summary (지난 상담)</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-2">{typeof smartData === 'object' ? smartData.summary : smartData}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-purple-500 uppercase mb-1">AI Recommendation (추천 질문)</h4>
                            <p className="text-sm font-bold text-purple-800 line-clamp-3">{typeof smartData === 'object' ? smartData.recommendation : ""}</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col min-h-0">
                        <label className="text-sm font-bold text-gray-700 mb-2">오늘 상담 내용</label>
                        <textarea className="flex-1 w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50 text-base mb-4" placeholder="상담 내용을 기록하세요..." value={consultInput} onChange={(e) => setConsultInput(e.target.value)} />
                        <button onClick={handleSaveConsultLog} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition flex justify-center items-center gap-2">✨ 상담 및 목표 저장하기</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 수정 모달 (목표 삭제됨) */}
      {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl h-[90vh] overflow-y-auto">
                  <h2 className="font-bold text-lg mb-4">학생 정보 수정</h2>
                  
                  <div className="bg-gray-50 p-3 rounded mb-3 space-y-2">
                      <h3 className="text-xs font-bold text-gray-500">학생 정보</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs text-gray-400">이름</label><input className="w-full border p-2 rounded" value={editForm.name || ""} onChange={(e) => setEditForm({...editForm, name: e.target.value})} /></div>
                        <div><label className="text-xs text-gray-400">학생 폰</label><input className="w-full border p-2 rounded" value={editForm.student_phone || ""} onChange={(e) => setEditForm({...editForm, student_phone: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <div><label className="text-xs text-gray-400">학교</label><input className="w-full border p-2 rounded" value={editForm.school || ""} onChange={(e) => setEditForm({...editForm, school: e.target.value})} /></div>
                          <div><label className="text-xs text-gray-400">학년</label><input className="w-full border p-2 rounded" value={editForm.grade || ""} onChange={(e) => setEditForm({...editForm, grade: e.target.value})} /></div>
                      </div>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded mb-3 space-y-2 border border-orange-100">
                    <h3 className="text-xs font-bold text-orange-600">학부모 정보</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs text-gray-400">부(父) 성함</label><input className="w-full border p-2 rounded" value={editForm.father_name || ""} onChange={(e) => setEditForm({...editForm, father_name: e.target.value})} /></div>
                        <div><label className="text-xs text-gray-400">부 연락처</label><input className="w-full border p-2 rounded" value={editForm.father_phone || ""} onChange={(e) => setEditForm({...editForm, father_phone: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs text-gray-400">모(母) 성함</label><input className="w-full border p-2 rounded" value={editForm.mother_name || ""} onChange={(e) => setEditForm({...editForm, mother_name: e.target.value})} /></div>
                        <div><label className="text-xs text-gray-400">모 연락처</label><input className="w-full border p-2 rounded" value={editForm.mother_phone || ""} onChange={(e) => setEditForm({...editForm, mother_phone: e.target.value})} /></div>
                    </div>
                  </div>

                  {/* 🚫 목표 입력칸 삭제됨 */}

                  <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-3">
                      <label className="text-xs text-blue-700 font-bold mb-1 block">💰 수업 방식</label>
                      <div className="flex gap-2 mb-2">
                        <label className="text-xs flex items-center gap-1 cursor-pointer"><input type="radio" checked={editForm.class_type === 'count'} onChange={() => setEditForm({...editForm, class_type: 'count'})} /> 횟수제</label>
                        <label className="text-xs flex items-center gap-1 cursor-pointer"><input type="radio" checked={editForm.class_type === 'date'} onChange={() => setEditForm({...editForm, class_type: 'date'})} /> 기간제</label>
                      </div>
                      {editForm.class_type === 'date' ? (
                         <div><label className="text-xs text-gray-500">종료 날짜</label><input type="date" className="w-full border p-1 rounded" value={editForm.end_date || ""} onChange={(e) => setEditForm({...editForm, end_date: e.target.value})} /></div>
                      ) : (
                         <div><label className="text-xs text-gray-500">총 횟수</label><input type="number" className="w-full border p-1 rounded" value={editForm.total_sessions || 0} onChange={(e) => setEditForm({...editForm, total_sessions: e.target.value})} /></div>
                      )}
                  </div>
                  
                  <div className="mt-6 flex gap-2">
                      <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 py-2 rounded text-sm hover:bg-gray-200">취소</button>
                      <button onClick={handleUpdateProfile} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700">저장</button>
                  </div>
                  <button onClick={handleDeleteStudent} className="w-full mt-4 text-red-500 text-xs underline hover:text-red-700">학생 삭제</button>
              </div>
          </div>
      )}
    </main>
  );
}