import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";

// جميع أسئلة MBTI الحقيقية (60 سؤال)
const mbtiQuestions = [
  // الانبساط (E) vs الانطواء (I) - 20 سؤال
  { id: 1, dimension: "EI", text: "تشعر بالطاقة والنشاط عندما تكون مع مجموعة من الناس", A: "نعم", B: "لا" },
  { id: 2, dimension: "EI", text: "تستمتع بقضاء الوقت وحيداً للتفكير والتأمل", A: "نعم", B: "لا" },
  { id: 3, dimension: "EI", text: "تفضل الحفلات والتجمعات الاجتماعية الكبيرة", A: "نعم", B: "لا" },
  { id: 4, dimension: "EI", text: "تحتاج وقتاً للاسترخاء بعد التفاعل الاجتماعي", A: "نعم", B: "لا" },
  { id: 5, dimension: "EI", text: "تتحدث بطلاقة في المناقشات الجماعية", A: "نعم", B: "لا" },
  { id: 6, dimension: "EI", text: "تفكر قبل التحدث، وتفضل الاستماع أولاً", A: "نعم", B: "لا" },
  { id: 7, dimension: "EI", text: "تشعر بالراحة عند مقابلة أشهر جدد", A: "نعم", B: "لا" },
  { id: 8, dimension: "EI", text: "تستمتع بالأنشطة الفردية أكثر من الجماعية", A: "نعم", B: "لا" },
  { id: 9, dimension: "EI", text: "تعبّر عن أفكارك ومشاعرك بصراحة", A: "نعم", B: "لا" },
  { id: 10, dimension: "EI", text: "تحتفظ بمشاعرك وأفكارك لنفسك", A: "نعم", B: "لا" },
  { id: 11, dimension: "EI", text: "تستمتع بكونك مركز الاهتمام", A: "نعم", B: "لا" },
  { id: 12, dimension: "EI", text: "تشعر بالإرهاق بعد فترات طويلة من التفاعل الاجتماعي", A: "نعم", B: "لا" },
  { id: 13, dimension: "EI", text: "تتعرف على أشخاص جدد بسهولة", A: "نعم", B: "لا" },
  { id: 14, dimension: "EI", text: "تتفكر كثيراً قبل اتخاذ قرارات اجتماعية", A: "نعم", B: "لا" },
  { id: 15, dimension: "EI", text: "تستمتع بالعمل في فرق", A: "نعم", B: "لا" },
  { id: 16, dimension: "EI", text: "تفضل العمل الفردي", A: "نعم", B: "لا" },
  { id: 17, dimension: "EI", text: "تشارك آرائك بسرعة في النقاشات", A: "نعم", B: "لا" },
  { id: 18, dimension: "EI", text: "تنتظر دورك للتحدث", A: "نعم", B: "لا" },
  { id: 19, dimension: "EI", text: "تشعر بالملل عندما تكون بمفردك لفترة طويلة", A: "نعم", B: "لا" },
  { id: 20, dimension: "EI", text: "تستمتع بيوم هادئ في المنزل", A: "نعم", B: "لا" },
  
  // الحس (S) vs الحدس (N) - 20 سؤال
  { id: 21, dimension: "SN", text: "تميل إلى التركيز على الحقائق والتفاصيل بدلاً من الصورة الكبيرة", A: "نعم", B: "لا" },
  { id: 22, dimension: "SN", text: "تستمتع بالتخيل والتفكير في الإمكانيات المستقبلية", A: "نعم", B: "لا" },
  { id: 23, dimension: "SN", text: "تثق أكثر بالتجارب الملموسة والمثبتة", A: "نعم", B: "لا" },
  { id: 24, dimension: "SN", text: "تهتم بالمعاني الخفية والرموز", A: "نعم", B: "لا" },
  { id: 25, dimension: "SN", text: "تفضل اتباع الإجراءات المثبتة والناجحة", A: "نعم", B: "لا" },
  { id: 26, dimension: "SN", text: "تحب ابتكار طرق جديدة للقيام بالأمور", A: "نعم", B: "لا" },
  { id: 27, dimension: "SN", text: "تركز على ما هو موجود هنا والآن", A: "نعم", B: "لا" },
  { id: 28, dimension: "SN", text: "تفكر كثيراً في المستقبل وما يمكن أن يكون", A: "نعم", B: "لا" },
  { id: 29, dimension: "SN", text: "تعتبر نفسك شخصاً عملياً وواقعياً", A: "نعم", B: "لا" },
  { id: 30, dimension: "SN", text: "تعتبر نفسك شخصاً خيالياً ومبدعاً", A: "نعم", B: "لا" },
  { id: 31, dimension: "SN", text: "تتبع التعليمات بدقة", A: "نعم", B: "لا" },
  { id: 32, dimension: "SN", text: "تعدل التعليمات لتتناسب مع رؤيتك", A: "نعم", B: "لا" },
  { id: 33, dimension: "SN", text: "تستمتع بالمشاريع التي لها نتائج ملموسة", A: "نعم", B: "لا" },
  { id: 34, dimension: "SN", text: "تستمتع بالمشاريع النظرية والفكرية", A: "نعم", B: "لا" },
  { id: 35, dimension: "SN", text: "تعتمد على خبراتك السابقة في اتخاذ القرارات", A: "نعم", B: "لا" },
  { id: 36, dimension: "SN", text: "تعتمد على حدسك وتوقعاتك", A: "نعم", B: "لا" },
  { id: 37, dimension: "SN", text: "تفضل المعلومات الدقيقة والموثقة", A: "نعم", B: "لا" },
  { id: 38, dimension: "SN", text: "تفضل الأفكار الجديدة والمبتكرة", A: "نعم", B: "لا" },
  { id: 39, dimension: "SN", text: "تنجذب إلى الوظائف التقليدية المثبتة", A: "نعم", B: "لا" },
  { id: 40, dimension: "SN", text: "تنجذب إلى الوظائف الإبداعية والمبتكرة", A: "نعم", B: "لا" },
  
  // التفكير (T) vs الشعور (F) - 10 سؤال
  { id: 41, dimension: "TF", text: "تتخذ القرارات بناءً على المنطق والعدالة أكثر من المشاعر", A: "نعم", B: "لا" },
  { id: 42, dimension: "TF", text: "تهتم بمشاعر الآخرين وتأثير القرارات عليهم", A: "نعم", B: "لا" },
  { id: 43, dimension: "TF", text: "تعتبر الحقيقة أكثر أهمية من المشاعر", A: "نعم", B: "لا" },
  { id: 44, dimension: "TF", text: "تعتبر الانسجام والعلاقات أكثر أهمية من الحقيقة المطلقة", A: "نعم", B: "لا" },
  { id: 45, dimension: "TF", text: "تنتقد بصراحة عندما ترى خطأً", A: "نعم", B: "لا" },
  { id: 46, dimension: "TF", text: "تنتقد بلطف لتجنب إيذاء مشاعر الآخرين", A: "نعم", B: "لا" },
  { id: 47, dimension: "TF", text: "تضع المعايير والقواعد فوق الاعتبارات الشخصية", A: "نعم", B: "لا" },
  { id: 48, dimension: "TF", text: "تضع العلاقات الإنسانية فوق القواعد الصارمة", A: "نعم", B: "لا" },
  { id: 49, dimension: "TF", text: "تعتبر النجاح العملي هو الهدف الأساسي", A: "نعم", B: "لا" },
  { id: 50, dimension: "TF", text: "تعتبر السعادة والانسجام هما الهدف الأساسي", A: "نعم", B: "لا" },
  
  // الحكم (J) vs الإدراك (P) - 10 سؤال
  { id: 51, dimension: "JP", text: "تحب التخطيط المسبق والالتزام بالجدول الزمني", A: "نعم", B: "لا" },
  { id: 52, dimension: "JP", text: "تستمتع بالمرونة والانفتاح على الفرص الجديدة", A: "نعم", B: "لا" },
  { id: 53, dimension: "JP", text: "تضع قوائم للمهام وتتابع تنفيذها", A: "نعم", B: "لا" },
  { id: 54, dimension: "JP", text: "تفضل العفوية والاستجابة للمتغيرات", A: "نعم", B: "لا" },
  { id: 55, dimension: "JP", text: "تحب إنهاء المشاريع قبل بدء مشاريع جديدة", A: "نعم", B: "لا" },
  { id: 56, dimension: "JP", text: "تستمتع بتعدد المهام والتبديل بين المشاريع", A: "نعم", B: "لا" },
  { id: 57, dimension: "JP", text: "تتخذ القرارات بسرعة وتحسم الأمور", A: "نعم", B: "لا" },
  { id: 58, dimension: "JP", text: "تترك القرارات مفتوحة للخيارات المتعددة", A: "نعم", B: "لا" },
  { id: 59, dimension: "JP", text: "تشعر بالراحة عندما يكون كل شيء منظمًا", A: "نعم", B: "لا" },
  { id: 60, dimension: "JP", text: "تشعر بالحرية عندما يكون هناك مجال للارتجال", A: "نعم", B: "لا" }
];

const MBTIPage = () => {
  const navigate = useNavigate();
  const theme = useAdaptiveTheme();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDimensionInfo, setShowDimensionInfo] = useState(null);

  useEffect(() => {
    // تحميل الإجابات المحفوظة إذا وجدت
    const savedAnswers = localStorage.getItem('mbti_answers');
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
  }, []);

  useEffect(() => {
    // حفظ الإجابات تلقائياً
    localStorage.setItem('mbti_answers', JSON.stringify(answers));
  }, [answers]);

  const calculateMBTI = useCallback(async () => {
    setLoading(true);
    
    // حساب النتيجة
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    
    mbtiQuestions.forEach(q => {
      if (answers[q.id]) {
        if (q.dimension === "EI") {
          answers[q.id] === "A" ? scores.E++ : scores.I++;
        } else if (q.dimension === "SN") {
          answers[q.id] === "A" ? scores.S++ : scores.N++;
        } else if (q.dimension === "TF") {
          answers[q.id] === "A" ? scores.T++ : scores.F++;
        } else if (q.dimension === "JP") {
          answers[q.id] === "A" ? scores.J++ : scores.P++;
        }
      }
    });

    const mbtiType = 
      (scores.E > scores.I ? "E" : "I") +
      (scores.S > scores.N ? "S" : "N") +
      (scores.T > scores.F ? "T" : "F") +
      (scores.J > scores.P ? "J" : "P");

    // حفظ النتيجة في localStorage أولاً
    localStorage.setItem('mbti_completed', 'true');
    localStorage.setItem('mbti_type', mbtiType);
    localStorage.setItem('mbti_scores', JSON.stringify(scores));
    
    // حفظ النتيجة في backend (محاولة فقط)
    const user = auth.currentUser;
    if (user) {
      try {
        const response = await fetch("http://localhost:5000/save-mbti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebase_uid: user.uid,
            email: user.email,
            mbti_type: mbtiType,
            scores: scores,
            answers: answers,
            percentages: {
              E: Math.round((scores.E / 20) * 100),
              I: Math.round((scores.I / 20) * 100),
              S: Math.round((scores.S / 20) * 100),
              N: Math.round((scores.N / 20) * 100),
              T: Math.round((scores.T / 10) * 100),
              F: Math.round((scores.F / 10) * 100),
              J: Math.round((scores.J / 10) * 100),
              P: Math.round((scores.P / 10) * 100)
            }
          }),
        });

        if (!response.ok) {
          throw new Error("Backend error");
        }

        // الانتقال لصفحة التحليل
        navigate("/mbti-analysis", { 
          state: { 
            mbtiType, 
            scores,
            answersCount: Object.keys(answers).length,
            totalQuestions: mbtiQuestions.length
          } 
        });
      } catch (error) {
        console.error("Error saving MBTI to backend:", error);
        // الانتقال للنتائج المحلية فقط (بدون رسالة خطأ)
        navigate("/mbti-analysis", { 
          state: { 
            mbtiType, 
            scores,
            answersCount: Object.keys(answers).length,
            totalQuestions: mbtiQuestions.length,
            isLocal: true
          } 
        });
      }
    } else {
      // إذا لم يكن مستخدم، انتقل مباشرة
      navigate("/mbti-analysis", { 
        state: { 
          mbtiType, 
          scores,
          answersCount: Object.keys(answers).length,
          totalQuestions: mbtiQuestions.length,
          isLocal: true
        } 
      });
    }
    
    // مسح الإجابات المحفوظة
    localStorage.removeItem('mbti_answers');
    setLoading(false);
  }, [answers, navigate]);

  // تتبع إكمال جميع الأسئلة
  useEffect(() => {
    if (Object.keys(answers).length === mbtiQuestions.length) {
      // الانتقال التلقائي للنتائج بعد ثانيتين
      const timer = setTimeout(() => {
        calculateMBTI();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [answers, calculateMBTI]);

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    
    // الانتقال التلقائي بعد 300ms
    if (currentQuestion < mbtiQuestions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    }
  };

  const handleSkip = () => {
    // وضع إجابة محايدة (لا تحتسب في النتيجة)
    setAnswers(prev => ({ ...prev, [mbtiQuestions[currentQuestion].id]: "neutral" }));
    
    if (currentQuestion < mbtiQuestions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    }
  };

  const handleNavigation = (direction) => {
    if (direction === 'next' && currentQuestion < mbtiQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const getDimensionInfo = (dimension) => {
    const info = {
      "EI": {
        title: "💬 الانبساط (E) مقابل الانطواء (I)",
        description: "كيف تستمد طاقتك وتتفاعل مع العالم",
        E: "الانبساطيون: يشعرون بالطاقة في التجمعات، يتحدثون ويتعلمون بالممارسة",
        I: "الانطوائيون: يشعرون بالطاقة في العزلة، يفكرون ويتعلمون بالملاحظة"
      },
      "SN": {
        title: "🔍 الحس (S) مقابل الحدس (N)",
        description: "كيف تدرك المعلومات وتعالجها",
        S: "الحسيون: يركزون على الحقائق، التفاصيل، والواقع الملموس",
        N: "الحدسيون: يركزون على الأنماط، الإمكانيات، والمعاني الخفية"
      },
      "TF": {
        title: "⚖️ التفكير (T) مقابل الشعور (F)",
        description: "كيف تتخذ القرارات وتحكم على الأمور",
        T: "المفكرون: يعتمدون على المنطق، الموضوعية، والعدالة",
        F: "الشعوريون: يعتمدون على القيم، الانسجام، وتأثير القرارات على الآخرين"
      },
      "JP": {
        title: "📅 الحكم (J) مقابل الإدراك (P)",
        description: "كيف تتعامل مع العالم الخارجي",
        J: "الحاكمون: يحبون النظام، التخطيط، واتخاذ القرارات",
        P: "المدركون: يحبون المرونة، العفوية، وترك الخيارات مفتوحة"
      }
    };
    return info[dimension];
  };

  const progressPercentage = (Object.keys(answers).length / mbtiQuestions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentQuestion === mbtiQuestions.length - 1;
  const currentDimensionInfo = getDimensionInfo(mbtiQuestions[currentQuestion]?.dimension);
  
  // حساب عدد الأسئلة المتبقية الصحيحة (باستثناء المحايدة)
  const remainingQuestions = mbtiQuestions.length - Object.keys(answers).length;

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      {/* Glow Effects - نفس تصميم Login */}
      <div className="absolute top-10 left-20 w-96 h-96 bg-[#2b62d1]/70 rounded-full blur-[120px]"></div>
      <div className="absolute top-1/4 right-24 w-80 h-80 bg-[#2b62d1]/70 rounded-full blur-[130px]"></div>
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-[#2b62d1]/60 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-10 right-1/5 w-96 h-96 bg-[#2b62d1]/60 rounded-full blur-[130px]"></div>
      <div className="absolute top-[20%] left-2/5 w-72 h-72 bg-[#2b62d1]/50 rounded-full blur-[110px]"></div>

      <div className="relative z-10 max-w-4xl mx-auto py-6 md:py-10 px-4 md:px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-space font-bold mb-4">🧠 اختبار تحليل الشخصية MBTI</h1>
          <p className={`${theme.textSecondary} text-lg`}>
            اكتشف نمط شخصيتك لنساعدك في بناء خطة تعلم مخصصة تناسبك
          </p>
        </div>

        {/* شريط التقدم الرئيسي */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className={`${theme.textSecondary} text-sm`}>
              {answeredCount} / {mbtiQuestions.length} سؤال
            </span>
            <span className={`${theme.textAccent} font-medium`}>
              {Math.min(100, Math.round(progressPercentage))}% مكتمل
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${theme.buttonGradient} transition-all duration-500`}
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* سؤال MBTI */}
        {currentQuestion < mbtiQuestions.length && (
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 md:p-8 ${theme.backdropBlur} shadow-xl`}>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 mb-4">
                <span className="text-sm">
                  {mbtiQuestions[currentQuestion].dimension === "EI" ? "💬 اجتماعية" :
                   mbtiQuestions[currentQuestion].dimension === "SN" ? "🔍 إدراكية" :
                   mbtiQuestions[currentQuestion].dimension === "TF" ? "⚖️ قرارات" :
                   "📅 تنظيمية"}
                </span>
                <span className={`${theme.textSecondary} text-xs`}>
                  سؤال {currentQuestion + 1} من {mbtiQuestions.length}
                  {isLastQuestion && " (آخر سؤال)"}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-space mb-6 leading-relaxed">
                {mbtiQuestions[currentQuestion].text}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <button
                onClick={() => handleAnswer(mbtiQuestions[currentQuestion].id, "A")}
                className={`p-5 md:p-6 rounded-xl border-2 transition-all duration-300 ${
                  answers[mbtiQuestions[currentQuestion].id] === "A" 
                    ? `bg-gradient-to-r ${theme.buttonGradient} border-transparent scale-[1.02] shadow-lg` 
                    : `${theme.cardBgClass} border ${theme.cardBorderClass} hover:border-cyan-400 hover:shadow-md`
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">✅</div>
                  <div className="text-lg md:text-xl font-medium">{mbtiQuestions[currentQuestion].A}</div>
                </div>
                <p className="text-sm text-white/60 text-right">
                  يميل نحو {mbtiQuestions[currentQuestion].dimension[0] === "E" ? "الانبساط" : 
                    mbtiQuestions[currentQuestion].dimension[0] === "S" ? "الحس" : 
                    mbtiQuestions[currentQuestion].dimension[0] === "T" ? "التفكير" : "الحكم"}
                </p>
              </button>

              <button
                onClick={() => handleAnswer(mbtiQuestions[currentQuestion].id, "B")}
                className={`p-5 md:p-6 rounded-xl border-2 transition-all duration-300 ${
                  answers[mbtiQuestions[currentQuestion].id] === "B" 
                    ? `bg-gradient-to-r ${theme.buttonGradient} border-transparent scale-[1.02] shadow-lg` 
                    : `${theme.cardBgClass} border ${theme.cardBorderClass} hover:border-purple-400 hover:shadow-md`
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">💭</div>
                  <div className="text-lg md:text-xl font-medium">{mbtiQuestions[currentQuestion].B}</div>
                </div>
                <p className="text-sm text-white/60 text-right">
                  يميل نحو {mbtiQuestions[currentQuestion].dimension[1] === "I" ? "الانطواء" : 
                    mbtiQuestions[currentQuestion].dimension[1] === "N" ? "الحدس" : 
                    mbtiQuestions[currentQuestion].dimension[1] === "F" ? "الشعور" : "الإدراك"}
                </p>
              </button>

              <button
                onClick={handleSkip}
                className={`p-5 md:p-6 rounded-xl border-2 transition-all duration-300 ${
                  answers[mbtiQuestions[currentQuestion].id] === "neutral" 
                    ? `bg-gradient-to-r from-gray-500 to-gray-700 border-transparent scale-[1.02] shadow-lg` 
                    : `${theme.cardBgClass} border ${theme.cardBorderClass} hover:border-gray-400 hover:shadow-md`
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">⏭️</div>
                  <div className="text-lg md:text-xl font-medium">حيادي / تخطي</div>
                </div>
                <p className="text-sm text-white/60 text-right">
                  لا أستطيع الإجابة / ليس لدي رأي واضح
                </p>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
              <button
                onClick={() => handleNavigation('prev')}
                disabled={currentQuestion === 0}
                className={`px-5 py-2.5 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} transition ${currentQuestion === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"} w-full sm:w-auto`}
              >
                ← السابق
              </button>

              <div className="text-center">
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const questionIndex = Math.floor(currentQuestion / 6) * 6 + i;
                    return questionIndex < mbtiQuestions.length ? (
                      <div
                        key={i}
                        className={`h-2 w-3 md:w-4 rounded-full ${
                          questionIndex < currentQuestion
                            ? `bg-gradient-to-r ${theme.buttonGradient}`
                            : questionIndex === currentQuestion
                            ? "bg-cyan-400"
                            : "bg-white/10"
                        }`}
                        title={`سؤال ${questionIndex + 1}`}
                      ></div>
                    ) : null;
                  })}
                </div>
                <p className={`${theme.textSecondary} text-xs`}>
                  {Math.min(100, Math.round(progressPercentage))}% مكتمل
                  {isLastQuestion && " - آخر سؤال!"}
                </p>
              </div>

              {isLastQuestion ? (
                <button
                  onClick={calculateMBTI}
                  disabled={answeredCount < mbtiQuestions.length}
                  className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-medium transition ${answeredCount < mbtiQuestions.length ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.03] shadow-lg"} w-full sm:w-auto`}
                >
                  {remainingQuestions > 0 
                    ? `أجب على ${remainingQuestions} سؤالاً` 
                    : "📊 عرض النتائج"}
                </button>
              ) : (
                <button
                  onClick={() => handleNavigation('next')}
                  className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-medium transition hover:scale-[1.03]} w-full sm:w-auto`}
                >
                  {answers[mbtiQuestions[currentQuestion].id] ? "التالي →" : "تخطي السؤال →"}
                </button>
              )}
            </div>

            {/* معلومات البعد */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowDimensionInfo(currentDimensionInfo)}
                className={`w-full p-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} hover:bg-white/10 transition`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">ℹ️</span>
                    <span className="text-sm">معلومات عن بعد {mbtiQuestions[currentQuestion].dimension}</span>
                  </div>
                  <span className="text-xs text-white/60">انقر للتفاصيل</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* تقدم الأبعاد */}
        <div className={`mt-8 ${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 ${theme.backdropBlur}`}>
          <h3 className="text-xl font-space mb-4">📊 تقدمك في الأبعاد</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { dim: "EI", title: "💬 اجتماعية", color: "from-blue-500 to-cyan-400" },
              { dim: "SN", title: "🔍 إدراكية", color: "from-green-500 to-emerald-400" },
              { dim: "TF", title: "⚖️ قرارات", color: "from-purple-500 to-pink-400" },
              { dim: "JP", title: "📅 تنظيمية", color: "from-orange-500 to-yellow-400" }
            ].map((item) => {
              const questionsInDim = mbtiQuestions.filter(q => q.dimension === item.dim);
              const answeredInDim = questionsInDim.filter(q => answers[q.id] && answers[q.id] !== "neutral").length;
              const totalInDim = questionsInDim.length;
              const percentage = totalInDim > 0 ? Math.round((answeredInDim / totalInDim) * 100) : 0;
              
              return (
                <div key={item.dim} className="text-center p-3 rounded-xl bg-white/5">
                  <div className="text-lg mb-1">{item.title}</div>
                  <div className="text-2xl font-bold mb-2">{percentage}%</div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs mt-1 text-white/60">
                    {answeredInDim}/{totalInDim}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* تلميحات */}
        <div className={`mt-6 p-4 rounded-xl bg-gradient-to-r ${theme.gradientFrom}/20 ${theme.gradientTo}/20 border ${theme.cardBorderClass}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-medium mb-1">نصائح للاختبار:</p>
              <p className={`${theme.textSecondary} text-sm`}>
                • أجب بسرعة بناءً على شعورك الأول
                • فكر في نفسك في معظم الأوقات، ليس في لحظات استثنائية
                • لا يوجد إجابة صحيحة أو خاطئة، بل إجابة تعبر عنك
                • استخدم زر "حيادي" إذا كنت متردداً
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* معلومات البعد (مودال) */}
      {showDimensionInfo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-space">{showDimensionInfo.title}</h3>
              <button
                onClick={() => setShowDimensionInfo(null)}
                className={`p-2 rounded-lg ${theme.cardBgClass} border ${theme.cardBorderClass} hover:bg-white/10`}
              >
                ✕
              </button>
            </div>
            
            <p className={`${theme.textSecondary} mb-6`}>{showDimensionInfo.description}</p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-medium text-blue-300 mb-2">
                  {showDimensionInfo.title.includes("انبساط") ? "الانبساط (E)" : 
                   showDimensionInfo.title.includes("حس") ? "الحس (S)" : 
                   showDimensionInfo.title.includes("تفكير") ? "التفكير (T)" : "الحكم (J)"}
                </h4>
                <p className="text-sm">{showDimensionInfo[Object.keys(showDimensionInfo)[2]]}</p>
              </div>
              
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <h4 className="font-medium text-purple-300 mb-2">
                  {showDimensionInfo.title.includes("انطواء") ? "الانطواء (I)" : 
                   showDimensionInfo.title.includes("حدس") ? "الحدس (N)" : 
                   showDimensionInfo.title.includes("شعور") ? "الشعور (F)" : "الإدراك (P)"}
                </h4>
                <p className="text-sm">{showDimensionInfo[Object.keys(showDimensionInfo)[3]]}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-sm text-white/60">
                <strong>💡 نصيحة:</strong> اختر الإجابة التي تعبر عنك في معظم الأوقات، ليس في لحظات استثنائية.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-8 text-center max-w-sm`}>
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-space mb-3">جاري تحليل شخصيتك...</h3>
            <p className={`${theme.textSecondary} mb-2`}>نحسب نتائجك بناءً على {answeredCount} إجابة</p>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MBTIPage;