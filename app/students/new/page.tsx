"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// ✅ app 폴더에 있는 supabase.ts를 찾기 위해 두 단계(../..) 올라갑니다.
import { supabase } from "../../supabase"; 

export default function NewStudentPage() {
  const router = useRouter();
  
  // 입력 폼 상태 관리
  const [form, setForm] = useState({
    name: "",
    school: "",
    grade: "",
    goals: "",
    totalSessions: "8" // 기본값 8회
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장 버튼 클릭 시 실행
  const handleSubmit = async () => {
    // 1. 유효성 검사 (이름은 필수)
    if (!form.name.trim()) return alert("이름을 입력해주세요.");
    
    setIsSubmitting(true);

    // 2. Supabase DB에 데이터 추가 (Insert)
    const { error } = await supabase
      .from('students')
      .insert([
        { 
          name: form.name, 
          school: form.school, 
          grade: form.grade, 
          goals: form.goals,
          // 숫자로 변환해서 저장 (DB에는 total_sessions 라는 이름으로 저장됨)
          total_sessions: Number(form.totalSessions)
        }
      ]);

    // 3. 결과 처리
    if (error) {
      console.error("등록 에러:", error);
      alert("등록에 실패했습니다: " + error.message);
      setIsSubmitting(false);
    } else {
      alert("학생이 DB에 등록되었습니다! 🎉");
      router.push("/"); // 메인 화면으로 이동
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">☁️ 신규 학생 등록 (DB)</h1>
        
        <div className="space-y-4">
          {/* 이름 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
            <input 
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="예: 김철수"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
          </div>
          
          {/* 학교 & 학년 (가로 정렬) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학교</label>
              <input 
                className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="예: 대안중"
                value={form.school}
                onChange={(e) => setForm({...form, school: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
              <input 
                className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="예: 중1"
                value={form.grade}
                onChange={(e) => setForm({...form, grade: e.target.value})}
              />
            </div>
          </div>

          {/* 학습 목표 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학습 목표</label>
            <input 
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="예: 함수 완전 정복"
              value={form.goals}
              onChange={(e) => setForm({...form, goals: e.target.value})}
            />
          </div>

          {/* 수업 횟수 설정 */}
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">총 수업 횟수 (결제 기준)</label>
             <input 
               type="number"
               className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
               value={form.totalSessions}
               onChange={(e) => setForm({...form, totalSessions: e.target.value})}
             />
             <p className="text-xs text-gray-400 mt-1">설정한 횟수가 차면 '결제 필요' 알림이 뜹니다.</p>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="mt-8 flex gap-3">
          <Link href="/" className="flex-1 py-3 text-center text-gray-500 hover:bg-gray-50 rounded-lg transition font-medium">
            취소
          </Link>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition shadow-md disabled:bg-gray-400"
          >
            {isSubmitting ? "저장 중..." : "등록 완료"}
          </button>
        </div>
      </div>
    </main>
  );
}