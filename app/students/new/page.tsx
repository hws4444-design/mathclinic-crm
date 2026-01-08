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
    studentPhone: "",
    parentName: "",
    parentPhone: "",
    goals: "",
    classType: "count", 
    totalSessions: "8", 
    endDate: "",
    startDate: "",        
    consultationNotes: "" 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장 버튼 클릭 시 실행
  const handleSubmit = async () => {
    // 1. 유효성 검사 (이름은 필수)
    if (!form.name.trim()) return alert("이름을 입력해주세요.");
    
    // 날짜제인데 종료 날짜 없으면 경고
    if (form.classType === "date" && !form.endDate) {
        return alert("수강 종료 날짜를 선택해주세요.");
    }

    setIsSubmitting(true);

    // 2. Supabase DB에 데이터 추가
    const { error } = await supabase
      .from('students')
      .insert([
        { 
          name: form.name, 
          school: form.school, 
          grade: form.grade, 
          student_phone: form.studentPhone,
          parent_name: form.parentName,
          parent_phone: form.parentPhone,
          goals: form.goals,
          class_type: form.classType,
          total_sessions: form.classType === "count" ? Number(form.totalSessions) : 0,
          end_date: form.classType === "date" ? form.endDate : "",
          start_date: form.startDate,
          consultation_notes: form.consultationNotes
        }
      ]);

    // 3. 결과 처리
    if (error) {
      console.error("등록 에러:", error);
      alert("등록에 실패했습니다: " + error.message);
      setIsSubmitting(false);
    } else {
      alert("학생이 등록되었습니다! 🎉");
      router.push("/"); 
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">☁️ 신규 학생 등록</h1>
        
        <div className="space-y-4">
          {/* 이름 & 첫 등원일 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input 
                className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="예: 김철수"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">첫 등원일</label>
                <input 
                type="date"
                className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={form.startDate}
                onChange={(e) => setForm({...form, startDate: e.target.value})}
                />
            </div>
          </div>
          
          {/* 학교 & 학년 */}
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

          {/* 학생 연락처 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학생 연락처</label>
            <input 
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="010-0000-0000"
              value={form.studentPhone}
              onChange={(e) => setForm({...form, studentPhone: e.target.value})}
            />
          </div>

          {/* 학부모 정보 (여기를 가로 정렬로 변경!) */}
          <div className="pt-4 mt-2 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3">👨‍👩‍👧 학부모 정보</h3>
            {/* grid-cols-2 를 사용하여 가로로 배치 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">성함</label>
                    <input 
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                    placeholder="예: 홍길동"
                    value={form.parentName}
                    onChange={(e) => setForm({...form, parentName: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">연락처</label>
                    <input 
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                    placeholder="010-0000-0000"
                    value={form.parentPhone}
                    onChange={(e) => setForm({...form, parentPhone: e.target.value})}
                    />
                </div>
            </div>
          </div>

          {/* 수업 방식 선택 */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-bold text-gray-900 mb-2">📅 수업 방식</label>
            <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" name="classType" value="count" 
                        checked={form.classType === "count"}
                        onChange={() => setForm({...form, classType: "count"})}
                        className="w-4 h-4 text-blue-600"
                    />
                    <span>횟수제</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" name="classType" value="date" 
                        checked={form.classType === "date"}
                        onChange={() => setForm({...form, classType: "date"})}
                        className="w-4 h-4 text-blue-600"
                    />
                    <span>기간제</span>
                </label>
            </div>

            {form.classType === "count" ? (
                <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-blue-800 mb-1">총 수업 횟수</label>
                    <input 
                        type="number"
                        className="w-full p-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                        value={form.totalSessions}
                        onChange={(e) => setForm({...form, totalSessions: e.target.value})}
                    />
                </div>
            ) : (
                <div className="bg-green-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-green-800 mb-1">수강 종료 날짜</label>
                    <input 
                        type="date"
                        className="w-full p-2 border border-green-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition"
                        value={form.endDate}
                        onChange={(e) => setForm({...form, endDate: e.target.value})}
                    />
                </div>
            )}
          </div>

          {/* 상담 내용 및 목표 */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-bold text-gray-900 mb-2">📝 상담 및 목표</label>
            
            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">학습 목표</label>
                    <input 
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="예: 함수 완전 정복"
                    value={form.goals}
                    onChange={(e) => setForm({...form, goals: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">초기 상담 기록</label>
                    <textarea 
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition min-h-[100px]"
                    placeholder="학생의 성향, 고민, 특이사항 등을 자유롭게 적어주세요."
                    value={form.consultationNotes}
                    onChange={(e) => setForm({...form, consultationNotes: e.target.value})}
                    />
                </div>
            </div>
          </div>

        </div>

        {/* 버튼 */}
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