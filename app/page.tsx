"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// ✅ 같은 폴더(app)에 있는 supabase.ts를 가져옵니다.
import { supabase } from "./supabase"; 

// ---------------------------------------------------------
// 1. 유틸리티 (약점 분석 로직)
// ---------------------------------------------------------
const WEAKNESS_KEYWORDS = [
  { key: "제곱근", label: "제곱근" },
  { key: "분수", label: "분수" },
  { key: "역수", label: "역수" },
  { key: "느림", label: "속도" },
  { key: "실수", label: "실수" },
  { key: "설명", label: "서술형" },
];

function analyzeWeakness(logs: any[]) {
  if (!logs || logs.length === 0) return [];
  const allText = logs.map((l) => l.text ?? "").join(" ");
  const counts: Record<string, number> = {};

  WEAKNESS_KEYWORDS.forEach(({ key, label }) => {
    const hits = allText.split(key).length - 1;
    if (hits > 0) counts[label] = (counts[label] || 0) + hits;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

// ---------------------------------------------------------
// 2. 타입 정의
// ---------------------------------------------------------
type Student = {
  id: number; 
  name: string;
  school: string;
  grade: string;
  goals: string;
  logs?: any[]; 
};

// ---------------------------------------------------------
// 3. 메인 컴포넌트
// ---------------------------------------------------------
export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ [DB] 데이터 불러오기 함수
  const loadData = async () => {
    setLoading(true);
    
    // 1. 학생 명부 가져오기 (최신 등록순)
    const { data: studentData, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("데이터 불러오기 실패:", error);
      alert("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    // 2. 각 학생의 로그 가져오기 (약점 태그 분석용)
    const studentsWithLogs = await Promise.all(
      (studentData || []).map(async (s) => {
        const { data: logs } = await supabase
          .from('logs')
          .select('text')
          .eq('student_id', s.id);
        return { ...s, logs: logs || [] };
      })
    );

    setStudents(studentsWithLogs);
    setLoading(false);
  };

  // 화면이 켜지면 데이터 불러오기
  useEffect(() => {
    loadData();
  }, []);

  // 검색 필터 적용
  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || 
    (s.school && s.school.includes(searchTerm))
  );

  return (
    <main className="p-6 max-w-5xl mx-auto min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학생 관리 (DB연동됨) ☁️</h1>
          <p className="text-gray-500 text-sm mt-1">이 데이터는 인터넷 서버(Supabase)에 안전하게 저장됩니다.</p>
        </div>
        <Link 
          href="/students/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm flex items-center gap-2 justify-center"
        >
          + 신규 등록
        </Link>
      </div>

      {/* 검색창 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="학생 이름 검색..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* 리스트 출력 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">☁️ 서버에서 데이터를 가져오고 있습니다...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStudents.map((s) => {
            const weaknesses = analyzeWeakness(s.logs || []);
            return (
              <Link key={s.id} href={`/students/${s.id}`} className="block group">
                <div className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition duration-200 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        {s.name}
                        <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {s.grade}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{s.school} · {s.goals}</p>
                    </div>
                    <span className="text-gray-300 group-hover:text-blue-500 transition">→</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-1.5">
                      {weaknesses.length > 0 ? (
                        weaknesses.map(tag => (
                          <span key={tag} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-medium">{tag}</span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-300">기록 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      
      {!loading && filteredStudents.length === 0 && (
         <div className="text-center py-20">
           <p className="text-gray-400 mb-2">등록된 학생이 없습니다.</p>
           <p className="text-sm text-gray-400">신규 등록 버튼을 눌러 첫 학생을 DB에 저장해보세요!</p>
         </div>
      )}
    </main>
  );
}