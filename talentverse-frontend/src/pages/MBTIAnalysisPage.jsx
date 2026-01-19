import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdaptiveTheme } from "../hooks/useAdaptiveTheme";

const MBTIAnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useAdaptiveTheme();
  
  const { mbtiType, scores, isLocal } = location.state || {};
  
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!mbtiType) {
      navigate("/mbti");
      return;
    }

    const analyzeMBTI = async () => {
      try {
        const response = await fetch("http://localhost:5000/analyze-mbti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mbti_type: mbtiType })
        });
        
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
        } else {
          // استخدام بيانات محلية
          setAnalysis(getLocalAnalysis(mbtiType));
        }
      } catch (error) {
        console.error("Error fetching MBTI analysis:", error);
        setAnalysis(getLocalAnalysis(mbtiType));
      } finally {
        setLoading(false);
      }
    };

    analyzeMBTI();
  }, [mbtiType, navigate]);

  const getLocalAnalysis = (type) => {
    const mbtiData = {
      "INTJ": {
        title: "المخطط الاستراتيجي",
        description: "تحليلية، مستقلة، تحب التخطيط طويل المدى",
        strengths: ["التخطيط الاستراتيجي", "التحليل المنطقي", "الاستقلالية"],
        weaknesses: ["قلة الصبر مع الأخطاء", "الانطوائية المفرطة", "التشكيك الدائم"],
        learning_style: "تفضل التعلم الذاتي، النظريات المعقدة، والتفكير المنطقي",
        career_suggestions: ["مهندس برمجيات", "محلل بيانات", "استشاري استراتيجي"],
        compatibility: ["ENFP", "ENTP"],
        famous_examples: ["إيلون ماسك", "مارك زوكربيرج"]
      },
      "INTP": {
        title: "المفكر",
        description: "فضولية، منطقية، تركّز على النظريات والمفاهيم",
        strengths: ["التحليل العميق", "الفضول الفكري", "التفكير النقدي"],
        weaknesses: ["التسويف", "الانعزال", "صعوبة التنفيذ العملي"],
        learning_style: "تعلم النظريات، البحث المستقل، حل المشكلات المعقدة",
        career_suggestions: ["عالم أبحاث", "مطور نظم", "فيلسوف"],
        compatibility: ["ENTJ", "ESTJ"],
        famous_examples: ["ألبرت أينشتاين", "بيل غيتس"]
      },
      "ENTJ": {
        title: "القائد",
        description: "حاسمة، منظمة، تستمتع بالتحدي والقيادة",
        strengths: ["القيادة", "التنظيم", "اتخاذ القرارات"],
        weaknesses: ["الاستبدادية", "قلة الصبر", "إهمال المشاعر"],
        learning_style: "التعلم العملي، القيادة، التحديات الاستراتيجية",
        career_suggestions: ["مدير تنفيذي", "رائد أعمال", "محامي"],
        compatibility: ["INTP", "INFP"],
        famous_examples: ["ستيف جوبز", "مارغريت تاتشر"]
      },
      "ENTP": {
        title: "المبتكر",
        description: "ذكية، مرنة، تحب النقاش واكتشاف الاحتمالات",
        strengths: ["الإبداع", "المرونة", "المهارات النقاشية"],
        weaknesses: ["عدم الالتزام", "الملل السريع", "الجدال المفرط"],
        learning_style: "التعلم بالمشاريع، التجربة والخطأ، النقاشات",
        career_suggestions: ["مسوق", "مخترع", "محامي دفاع"],
        compatibility: ["INFJ", "INTJ"],
        famous_examples: ["ريتشارد فاينمان", "مارك توين"]
      },
      "INFJ": {
        title: "المستشار",
        description: "مثالية، خلاقة، تركّز على مساعدة الآخرين",
        strengths: ["التعاطف", "الإبداع", "الرؤية المستقبلية"],
        weaknesses: ["الكمالية", "الحساسية المفرطة", "الصعوبة في وضع الحدود"],
        learning_style: "التعلم بالمعنى، القراءة، التأمل والتفكر",
        career_suggestions: ["معالج نفسي", "كاتب", "مستشار روحي"],
        compatibility: ["ENFP", "ENTP"],
        famous_examples: ["نيلسون مانديلا", "مارتن لوثر كينغ"]
      },
      "INFP": {
        title: "المثالي",
        description: "حالمة، متعاطفة، تبحث عن المعنى والقيم",
        strengths: ["الإبداع", "التعاطف", "الأصالة"],
        weaknesses: ["المثالية المفرطة", "الحساسية", "صعوبة اتخاذ القرارات"],
        learning_style: "التعلم بالفنون، الكتابة، استكشاف القيم والمعاني",
        career_suggestions: ["شاعر", "فنان", "عامل اجتماعي"],
        compatibility: ["ENFJ", "ENTJ"],
        famous_examples: ["جون لينون", "ويليام شكسبير"]
      },
      "ENFJ": {
        title: "المعلم",
        description: "كاريزمية، ملهمة، تركّز على تطوير الآخرين",
        strengths: ["الإلهام", "القدرة على التواصل", "القيادة بالتعاطف"],
        weaknesses: ["الحاجة للإعجاب", "التضحية بالنفس", "تجنب الصراع"],
        learning_style: "التعلم بالتوجيه، التعليم، العمل الجماعي",
        career_suggestions: ["معلم", "مدرب", "سياسي"],
        compatibility: ["INFP", "ISFP"],
        famous_examples: ["باراك أوباما", "أوبرا وينفري"]
      },
      "ENFP": {
        title: "البطل",
        description: "حماسية، إبداعية، تحب التنوع والتجارب الجديدة",
        strengths: ["الطاقة", "الإبداع", "القدرة على الإقناع"],
        weaknesses: ["عدم التنظيم", "الاندفاعية", "صعوبة إنهاء المشاريع"],
        learning_style: "التعلم بالتجارب الجديدة، الاجتماعات، الاستكشاف",
        career_suggestions: ["ممثل", "صحفي", "منظم فعاليات"],
        compatibility: ["INTJ", "INFJ"],
        famous_examples: ["روبن ويليامز", "والت ديزني"]
      },
      "ISTJ": {
        title: "المشرف",
        description: "واقعية، مسؤولة، تحب النظام والدقة",
        strengths: ["الموثوقية", "التنظيم", "الالتزام"],
        weaknesses: ["الجمود", "المقاومة للتغيير", "الصرامة"],
        learning_style: "التعلم بالخطوات المنظمة، التكرار، التطبيق العملي",
        career_suggestions: ["محاسب", "مدير عمليات", "ضابط شرطة"],
        compatibility: ["ESFP", "ESTP"],
        famous_examples: ["جورج واشنطن", "الملكة إليزابيث الثانية"]
      },
      "ISFJ": {
        title: "الحامي",
        description: "داعمة، مخلصة، تركّز على الراحة والاستقرار",
        strengths: ["الرعاية", "الموثوقية", "الانتباه للتفاصيل"],
        weaknesses: ["تجنب الصراع", "الصعوبة في قول لا", "المقاومة للتغيير"],
        learning_style: "التعلم بالعمل اليدوي، المساعدة، التطبيق العملي",
        career_suggestions: ["ممرض", "معلم", "أمين مكتبة"],
        compatibility: ["ESFP", "ESTP"],
        famous_examples: ["الأميرة ديانا", "جورج بوش الأب"]
      },
      "ESTJ": {
        title: "المدير",
        description: "عملية، منظمة، تفضل الكفاءة والهيكل",
        strengths: ["الكفاءة", "القيادة", "التنظيم"],
        weaknesses: ["الاستبدادية", "قلة المرونة", "إهمال المشاعر"],
        learning_style: "التعلم بالتطبيق العملي، القيادة، الأنظمة المنظمة",
        career_suggestions: ["مدير مشروع", "قاض", "ضابط عسكري"],
        compatibility: ["ISFP", "ISTP"],
        famous_examples: ["جيمي كارتر", "سونيا سوتومايور"]
      },
      "ESFJ": {
        title: "مقدم الرعاية",
        description: "اجتماعية، دافئة، تحب العناية بالآخرين",
        strengths: ["الودية", "المساعدة", "التنظيم الاجتماعي"],
        weaknesses: ["الحساسية للنقد", "الإفراط في الاهتمام", "تجنب الصراع"],
        learning_style: "التعلم بالتفاعل الاجتماعي، المساعدة، التطبيق العملي",
        career_suggestions: ["معلم", "مدير موارد بشرية", "اختصاصي اجتماعي"],
        compatibility: ["ISFP", "ISTP"],
        famous_examples: ["بيل كلينتون", "تايلور سويفت"]
      },
      "ISTP": {
        title: "الحرفي",
        description: "واقعية، مرنة، تحب حل المشكلات العملية",
        strengths: ["حل المشكلات", "المرونة", "البراعة اليدوية"],
        weaknesses: ["المخاطرة", "الانعزال", "صعوبة الالتزام"],
        learning_style: "التعلم بالممارسة، التجربة، العمل اليدوي",
        career_suggestions: ["ميكانيكي", "مهندس", "رياضي محترف"],
        compatibility: ["ESFJ", "ESTJ"],
        famous_examples: ["مايكل جوردان", "توم كروز"]
      },
      "ISFP": {
        title: "الفنان",
        description: "حساسة، فنية، تعيش اللحظة وتقدر الجمال",
        strengths: ["الإبداع", "المرونة", "التعاطف"],
        weaknesses: ["تجنب الصراع", "الصعوبة في التخطيط", "الحساسية المفرطة"],
        learning_style: "التعلم بالفنون، التجربة الحسية، التعبير الإبداعي",
        career_suggestions: ["مصمم", "موسيقي", "معالج طبيعي"],
        compatibility: ["ENFJ", "ESFJ"],
        famous_examples: ["مايكل جاكسون", "فريديريك شوبان"]
      },
      "ESTP": {
        title: "المقنع",
        description: "نشيطة، مرحة، تستمتع بالمخاطرة والعمل",
        strengths: ["المرونة", "الكاريزما", "سرعة البديهة"],
        weaknesses: ["الاندفاعية", "عدم الصبر", "التسرع"],
        learning_style: "التعلم بالمغامرة، التجربة المباشرة، التحديات",
        career_suggestions: ["رجل مبيعات", "رياضي", "رائد أعمال"],
        compatibility: ["ISFJ", "ISTJ"],
        famous_examples: ["دونالد ترامب", "إرنست همنغواي"]
      },
      "ESFP": {
        title: "المؤدي",
        description: "عفوية، مرحة، تحب المرح والتجارب الحسية",
        strengths: ["المرح", "الكاريزما", "التكيف الاجتماعي"],
        weaknesses: ["عدم التنظيم", "قلة التخطيط", "الانشغال بالمظهر"],
        learning_style: "التعلم بالتجربة الحسية، التفاعل الاجتماعي، المرح",
        career_suggestions: ["ممثل", "منظم فعاليات", "مقدم برامج"],
        compatibility: ["ISFJ", "ISTJ"],
        famous_examples: ["مارلين مونرو", "إلفيس بريسلي"]
      }
    };

    return mbtiData[type] || mbtiData["INTP"];
  };

  const getLearningRecommendations = () => {
    if (!analysis) return [];
    
    const recommendations = {
      "INTJ": [
        "📚 اقرأ كتب الاستراتيجية والتخطيط",
        "🧩 تعلم البرمجة والخوارزميات",
        "📊 تخصص في تحليل البيانات",
        "🎯 اعمل على مشاريع طويلة المدى"
      ],
      "INTP": [
        "🔬 ادرس النظريات العلمية المعقدة",
        "💻 تعلم لغات البرمجة المنطقية",
        "📖 اقرأ في الفلسفة والعلوم",
        "🤔 مارس حل المشكلات المعقدة"
      ],
      "ENTJ": [
        "🎯 خذ دورات في القيادة والإدارة",
        "💼 تعلم إدارة المشاريع",
        "📈 ادرس الاستثمار والأعمال",
        "🗣️ مارس مهارات الخطابة"
      ],
      "ENTP": [
        "💡 اخترع مشاريع إبداعية جديدة",
        "🗣️ تعلم فن النقاش والإقناع",
        "🎨 جرب تقنيات إبداعية مختلفة",
        "🚀 ابدأ مشروعك الخاص"
      ]
    };
    
    return recommendations[mbtiType] || [
      "📚 اقرأ في مجال تخصصك",
      "💻 مارس التطبيق العملي",
      "🤝 تعلم مع مجموعة",
      "🎯 ضع أهدافاً واضحة"
    ];
  };

  const getProjectSuggestions = () => {
    if (!analysis) return [];
    
    const suggestions = {
      "INTJ": ["بناء نظام تخطيط شخصي", "تحليل بيانات مالية", "تطوير استراتيجية عمل"],
      "INTP": ["بناء محرك بحث بسيط", "تحليل خوارزمية معقدة", "بحث علمي في مجال مثير"],
      "ENTJ": ["تأسيس نادي نقاشي", "تنظيم فعالية مجتمعية", "إدارة فريق تطوعي"],
      "ENTP": ["إنشاء بودكاست تعليمي", "تصميم لعبة تعليمية", "تطوير تطبيق اجتماعي"]
    };
    
    return suggestions[mbtiType] || ["موقع شخصي", "تطبيق بسيط", "مدونة تقنية"];
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-xl font-space">جاري تحليل نتائجك...</h3>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`min-h-screen ${theme.pageBgClass} flex items-center justify-center ${theme.textPrimary}`}>
        <div className="text-center">
          <h1 className="text-2xl mb-4">لم يتم العثور على النتائج</h1>
          <button
            onClick={() => navigate("/mbti")}
            className={`px-6 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white hover:scale-[1.03] transition`}
          >
            العودة للاختبار
          </button>
        </div>
      </div>
    );
  }

  const dimensions = [
    { letter: "E", name: "انبساطي", score: scores?.E || 0, total: 20, color: "from-blue-500 to-cyan-400" },
    { letter: "I", name: "انطوائي", score: scores?.I || 0, total: 20, color: "from-indigo-500 to-purple-400" },
    { letter: "S", name: "حسي", score: scores?.S || 0, total: 20, color: "from-green-500 to-emerald-400" },
    { letter: "N", name: "حدسي", score: scores?.N || 0, total: 20, color: "from-teal-500 to-cyan-400" },
    { letter: "T", name: "مفكر", score: scores?.T || 0, total: 10, color: "from-red-500 to-pink-400" },
    { letter: "F", name: "شعوري", score: scores?.F || 0, total: 10, color: "from-rose-500 to-red-400" },
    { letter: "J", name: "حاكم", score: scores?.J || 0, total: 10, color: "from-amber-500 to-yellow-400" },
    { letter: "P", name: "مدرك", score: scores?.P || 0, total: 10, color: "from-lime-500 to-green-400" }
  ];

  return (
    <div className={`relative min-h-screen ${theme.pageBgClass} ${theme.textPrimary} font-inter overflow-hidden`}>
      <div className={`absolute top-1/4 left-1/2 w-[700px] h-[700px] ${theme.pageGlowClass} rounded-full blur-[200px] -translate-x-1/2`}></div>

      <div className="relative z-10 max-w-6xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* شريط الإشعار */}
        {isLocal && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/40">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium">النتائج مخزنة محلياً</p>
                <p className={`${theme.textSecondary} text-sm`}>لتخزين النتائج بشكل دائم، يرجى تسجيل الدخول</p>
              </div>
            </div>
          </div>
        )}

        {/* العنوان الرئيسي */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center text-3xl font-bold shadow-lg`}>
              {mbtiType}
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-space font-bold">{analysis.title}</h1>
              <p className={`${theme.textSecondary} text-lg mt-1`}>{analysis.description}</p>
            </div>
          </div>
          <p className={`${theme.textSecondary} mt-4`}>
            أنت من نوع <span className={`${theme.textAccent} font-bold`}>{mbtiType}</span> - {analysis.title}
          </p>
        </div>

        {/* التبويبات */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
          {["overview", "dimensions", "learning", "career", "compatibility"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition ${activeTab === tab
                  ? `bg-gradient-to-r ${theme.buttonGradient} text-white`
                  : `${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/10`
                }`}
            >
              {tab === "overview" && "📊 نظرة عامة"}
              {tab === "dimensions" && "📈 الأبعاد الشخصية"}
              {tab === "learning" && "🎓 التعلم المناسب"}
              {tab === "career" && "💼 المسار المهني"}
              {tab === "compatibility" && "🤝 التوافق"}
            </button>
          ))}
        </div>

        {/* محتوى التبويب النشط */}
        <div className={`${theme.cardBgClass} border ${theme.cardBorderClass} rounded-2xl p-6 md:p-8 ${theme.backdropBlur} shadow-xl`}>
          {/* نظرة عامة */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* نقاط القوة */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                  <h3 className="text-xl font-space mb-4 text-green-300">✅ نقاط القوة</h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* نقاط الضعف */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30">
                  <h3 className="text-xl font-space mb-4 text-red-300">⚠️ نقاط الضعف</h3>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* نمط التعلم */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                <h3 className="text-xl font-space mb-4 text-blue-300">🎓 نمط التعلم المفضل</h3>
                <p className="text-lg">{analysis.learning_style}</p>
              </div>

              {/* أمثلة مشهورة */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <h3 className="text-xl font-space mb-4 text-purple-300">🌟 شخصيات مشهورة من نفس النوع</h3>
                <div className="flex flex-wrap gap-3">
                  {analysis.famous_examples.map((person, index) => (
                    <span key={index} className="px-4 py-2 rounded-full bg-white/10 border border-white/20">
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* الأبعاد الشخصية */}
          {activeTab === "dimensions" && (
            <div className="space-y-8">
              <h3 className="text-2xl font-space mb-6">📈 تحليل الأبعاد الشخصية</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dimensions.map((dim, index) => {
                  const percentage = dim.total > 0 ? Math.round((dim.score / dim.total) * 100) : 0;
                  return (
                    <div key={index} className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${dim.color} flex items-center justify-center font-bold text-lg`}>
                            {dim.letter}
                          </div>
                          <div>
                            <h4 className="font-space text-lg">{dim.name}</h4>
                            <p className={`${theme.textSecondary} text-sm`}>{dim.score}/{dim.total} نقطة</p>
                          </div>
                        </div>
                        <span className={`text-xl font-bold ${percentage > 50 ? theme.textAccent : theme.textSecondary}`}>
                          {percentage}%
                        </span>
                      </div>
                      
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`h-full bg-gradient-to-r ${dim.color} transition-all duration-1000`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      
                      <p className={`${theme.textSecondary} text-sm`}>
                        {dim.letter === "E" && "الميل للتفاعل الاجتماعي وتبادل الأفكار"}
                        {dim.letter === "I" && "الميل للتفكير الداخلي والعزلة الإيجابية"}
                        {dim.letter === "S" && "التركيز على الحقائق الملموسة والتفاصيل"}
                        {dim.letter === "N" && "التركيز على الأنماط والإمكانيات المستقبلية"}
                        {dim.letter === "T" && "اتخاذ القرارات بناءً على المنطق والعدالة"}
                        {dim.letter === "F" && "اتخاذ القرارات بناءً على القيم والمشاعر"}
                        {dim.letter === "J" && "الميل للنظام والتخطيط واتخاذ القرارات"}
                        {dim.letter === "P" && "الميل للمرونة والعفوية وترك الخيارات مفتوحة"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* تفسير النتيجة */}
              <div className={`p-5 rounded-xl bg-gradient-to-r ${theme.gradientFrom}/20 ${theme.gradientTo}/20 border ${theme.cardBorderClass}`}>
                <h4 className="text-xl font-space mb-3">💡 تفسير النتيجة {mbtiType}</h4>
                <p className="mb-4">
                  نوع شخصيتك <strong>{mbtiType}</strong> يمثل مزيجاً فريداً من:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <div className="text-2xl mb-1">{mbtiType[0]}</div>
                    <div className="text-sm">مصدر الطاقة</div>
                    <div className="text-xs text-white/60">{mbtiType[0] === "E" ? "الانبساط" : "الانطواء"}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <div className="text-2xl mb-1">{mbtiType[1]}</div>
                    <div className="text-sm">طريقة الإدراك</div>
                    <div className="text-xs text-white/60">{mbtiType[1] === "S" ? "الحس" : "الحدس"}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <div className="text-2xl mb-1">{mbtiType[2]}</div>
                    <div className="text-sm">اتخاذ القرارات</div>
                    <div className="text-xs text-white/60">{mbtiType[2] === "T" ? "التفكير" : "الشعور"}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <div className="text-2xl mb-1">{mbtiType[3]}</div>
                    <div className="text-sm">نمط الحياة</div>
                    <div className="text-xs text-white/60">{mbtiType[3] === "J" ? "الحكم" : "الإدراك"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* التعلم المناسب */}
          {activeTab === "learning" && (
            <div className="space-y-8">
              <h3 className="text-2xl font-space mb-6">🎓 استراتيجيات التعلم المناسبة لك</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* توصيات التعلم */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                  <h4 className="text-xl font-space mb-4 text-cyan-300">📚 طرق التعلم المفضلة</h4>
                  <ul className="space-y-3">
                    {getLearningRecommendations().map((rec, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/30 flex items-center justify-center text-sm mt-0.5">
                          {index + 1}
                        </div>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* بيئة التعلم المثالية */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                  <h4 className="text-xl font-space mb-4 text-emerald-300">🏫 بيئة التعلم المثالية</h4>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span>الوقت: {mbtiType[0] === "E" ? "صباحاً مع الآخرين" : "مساءً بمفردك"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span>المكان: {mbtiType[3] === "J" ? "مكتب منظم" : "مكان مرن"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span>الطريقة: {mbtiType[1] === "S" ? "تطبيق عملي" : "نظريات وإبداع"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span>التقييم: {mbtiType[2] === "T" ? "نتائج ملموسة" : "تقدم شخصي"}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* مشاريع مقترحة */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <h4 className="text-xl font-space mb-4 text-purple-300">🚀 مشاريع تعلمية مقترحة</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getProjectSuggestions().map((project, index) => (
                    <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-2xl mb-2">
                        {index === 0 ? "🎯" : index === 1 ? "💡" : "🚀"}
                      </div>
                      <h5 className="font-medium mb-2">{project}</h5>
                      <p className={`${theme.textSecondary} text-sm`}>
                        مشروع يناسب مهاراتك {mbtiType} بشكل مثالي
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* المسار المهني */}
          {activeTab === "career" && (
            <div className="space-y-8">
              <h3 className="text-2xl font-space mb-6">💼 المسارات المهنية المناسبة</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* مجالات العمل */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                  <h4 className="text-xl font-space mb-4 text-amber-300">🎯 مجالات العمل المثالية</h4>
                  <div className="space-y-4">
                    {analysis.career_suggestions.map((career, index) => (
                      <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div>
                            <h5 className="font-medium">{career}</h5>
                            <p className={`${theme.textSecondary} text-xs`}>
                              {mbtiType === "INTJ" && "يتطلب تحليلاً واستراتيجية"}
                              {mbtiType === "INTP" && "يتطلب تفكيراً عميقاً"}
                              {mbtiType === "ENTJ" && "يتطلب قيادة وتنظيماً"}
                              {mbtiType === "ENTP" && "يتطلب إبداعاً ومرونة"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* مهارات مطلوبة */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                  <h4 className="text-xl font-space mb-4 text-blue-300">🛠️ المهارات المطلوبة</h4>
                  <div className="space-y-3">
                    {analysis.strengths.map((skill, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <span>{skill}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div
                              key={star}
                              className={`w-2 h-2 rounded-full ${star <= 4 ? "bg-blue-400" : "bg-white/20"}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* نصائح مهنية */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                <h4 className="text-xl font-space mb-4 text-green-300">💡 نصائح للتطور المهني</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5">
                    <h5 className="font-medium mb-2">📈 لتطوير نقاط القوة</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• مارس مهاراتك بانتظام</li>
                      <li>• ابحث عن تحديات جديدة</li>
                      <li>• شارك معرفتك مع الآخرين</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <h5 className="font-medium mb-2">🔄 لتحسين نقاط الضعف</h5>
                    <ul className="space-y-2 text-sm">
                      <li>• اطلب تغذية راجعة</li>
                      <li>• تعلم من أخطائك</li>
                      <li>• تدرب على المهارات الناعمة</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* التوافق */}
          {activeTab === "compatibility" && (
            <div className="space-y-8">
              <h3 className="text-2xl font-space mb-6">🤝 التوافق مع الآخرين</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* التوافق العالي */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                  <h4 className="text-xl font-space mb-4 text-green-300">✅ أعلى توافق</h4>
                  <p className="mb-4">هذه الأنواع تكمل شخصيتك بشكل ممتاز:</p>
                  <div className="space-y-4">
                    {analysis.compatibility.map((type, index) => (
                      <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-lg font-bold">
                            {type}
                          </div>
                          <div>
                            <h5 className="font-medium">{type}</h5>
                            <p className={`${theme.textSecondary} text-xs`}>
                              {type === "ENFP" && "يكمل حماسك بتفكير استراتيجي"}
                              {type === "ENTP" && "يكمل إبداعك بتنظيم عملي"}
                              {type === "INTJ" && "يكمل تحليلك بحماسة تنفيذية"}
                              {type === "INFJ" && "يكمل رؤيتك بتفاصيل عملية"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: "85%" }}></div>
                          </div>
                          <span className="text-sm">85%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* نصائح للتعامل */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                  <h4 className="text-xl font-space mb-4 text-blue-300">💬 نصائح للتواصل</h4>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5">
                      <h5 className="font-medium mb-2">مع الانبساطيين (E)</h5>
                      <p className="text-sm">كن صبوراً مع كلامهم الكثير، شاركهم أنشطة اجتماعية</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5">
                      <h5 className="font-medium mb-2">مع الانطوائيين (I)</h5>
                      <p className="text-sm">أعطهم مساحة للتفكير، لا تضغطهم بالمحادثات</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5">
                      <h5 className="font-medium mb-2">مع الحكميين (J)</h5>
                      <p className="text-sm">احترم جدولهم الزمني، كن منظماً في تعاملك</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5">
                      <h5 className="font-medium mb-2">مع المدركين (P)</h5>
                      <p className="text-sm">كن مرناً، استمتع بعفويّتهم، لا تحاول تنظيم كل شيء</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* توصيات للتعاون */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <h4 className="text-xl font-space mb-4 text-purple-300">👥 توصيات للتعاون</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <h5 className="font-medium mb-2">دورك في الفريق</h5>
                    <p className="text-sm">
                      {mbtiType[2] === "T" ? "المحلل والمنظم" : "المبدع والمتحدث"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 text-center">
                    <div className="text-3xl mb-2">🤝</div>
                    <h5 className="font-medium mb-2">أنسب شريك</h5>
                    <p className="text-sm">
                      {analysis.compatibility[0]} - يكمل نقاط ضعفك
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 text-center">
                    <div className="text-3xl mb-2">🚀</div>
                    <h5 className="font-medium mb-2">إنتاجيتك القصوى</h5>
                    <p className="text-sm">
                      {mbtiType[0] === "E" ? "في مجموعات صغيرة" : "بمفردك مع تواصل دوري"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

            {/* أزرار التنقل */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button
            onClick={() => navigate("/profile")}
            className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold hover:scale-[1.03] transition`}
        >
        📝 أكمل ملفك الشخصي
        </button>
        <button
           onClick={() => navigate("/dashboard")}
           className={`flex-1 py-3 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} ${theme.textPrimary} hover:bg-white/10 transition`}
        >
        🏠 الانتقال للرئيسية
        </button>
        </div>  

        {/* ملاحظة */}
        <div className={`mt-8 p-4 rounded-xl ${theme.cardBgClass} border ${theme.cardBorderClass} text-center`}>
          <p className={`${theme.textSecondary} text-sm`}>
            💡 <strong>تذكر:</strong> شخصيتك ليست قيداً بل دليل. استخدم هذه المعلومات لفهم نفسك بشكل أفضل،
            ولا تسمح لها بتحديد ما يمكنك أو لا يمكنك تحقيقه.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MBTIAnalysisPage;