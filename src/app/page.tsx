"use client";

import React, { useState, useEffect, useRef } from "react";

// --- Types & Data Static ---
type Note = { name: string; freq: number };
type Question = { q: string; a: string[]; correct: number };
type VocalKey = "A" | "I" | "U" | "E" | "O";

const NOTES: Note[] = [
  { name: "DO", freq: 261.63 },
  { name: "RE", freq: 293.66 },
  { name: "MI", freq: 329.63 },
  { name: "FA", freq: 349.23 },
  { name: "SOL", freq: 392.0 },
  { name: "LA", freq: 440.0 },
  { name: "SI", freq: 493.88 },
  { name: "DO", freq: 523.25 },
];

const VOICE_SAMPLES = {
  Sopran: { freq: 783.99, label: "G5 (Tinggi)" }, // Nada tinggi wanita
  Alto: { freq: 349.23, label: "F4 (Sedang)" }, // Nada rendah wanita
  Tenor: { freq: 261.63, label: "C4 (Tinggi Pria)" }, // Nada tinggi pria
  Bass: { freq: 130.81, label: "C3 (Rendah)" }, // Nada rendah pria
};

const QUESTIONS = [
  {
    q: "Teknik pernapasan manakah yang paling ideal untuk mendukung power dan kontrol vokal yang stabil?",
    a: [
      "Pernapasan Dada",
      "Pernapasan Perut/Diafragma",
      "Pernapasan Bahu",
      "Pernapasan Hidung",
    ],
    correct: 1,
  },
  {
    q: "Apa yang dimaksud dengan 'Artikulasi' dalam bernyanyi?",
    a: [
      "Kecepatan tempo lagu",
      "Ketepatan pengucapan kata/lirik",
      "Tinggi rendahnya nada",
      "Keras lembutnya suara",
    ],
    correct: 1,
  },
  {
    q: "Istilah untuk jangkauan suara dari nada terendah hingga tertinggi yang bisa dicapai penyanyi adalah...",
    a: ["Vocal Range", "Vocal Pitch", "Vocal Timbre", "Vocal Dynamics"],
    correct: 0,
  },
  {
    q: "Teknik menggetarkan nada di akhir kalimat lagu untuk menambah estetika disebut...",
    a: ["Belting", "Falsetto", "Vibrato", "Chest Voice"],
    correct: 2,
  },
  {
    q: "Head Voice biasanya digunakan untuk mencapai nada-nada yang...",
    a: ["Sangat Rendah", "Sangat Tinggi", "Serak", "Bisikan"],
    correct: 1,
  },
];

// Objek konstanta untuk gaya animasi mulut
const VOCAL_STYLES = {
  A: { width: "100px", height: "120px", borderRadius: "40% 40% 50% 50%" },
  I: { width: "140px", height: "40px", borderRadius: "100% 100% 100% 100%" },
  U: { width: "50px", height: "50px", borderRadius: "50%" },
  E: { width: "130px", height: "60px", borderRadius: "40% 40% 80% 80%" },
  O: { width: "90px", height: "100px", borderRadius: "50%" },
};

const VOCAL_DESC = {
  A: "Buka mulut lebar secara vertikal, jatuhkan rahang bawah.",
  I: "Tarik sudut bibir sedikit ke samping, lidah menyentuh gigi bawah.",
  U: "Majukan bibir membentuk lingkaran kecil (monyong).",
  E: "Mulut terbuka sedang, posisi lidah datar.",
  O: "Bentuk mulut bulat sempurna, ruang gema di dalam maksimal.",
};

export default function VocalApp() {
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [userName, setUserName] = useState("");
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [currentDate, setCurrentDate] = useState(""); // State baru untuk tangga

  // --- State Management ---
  const [step, setStep] = useState<number>(1);

  // Section 3: Breathing
  const [diafragmaActive, setDiafragmaActive] = useState<boolean>(false);

  // Section 4: Vocal Articulation
  const [activeVocal, setActiveVocal] = useState<VocalKey>("A");

  // Section 6: Video
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);

  // Section 7: Studio

  const [tempo, setTempo] = useState(120);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Section 9: Quiz
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // --- Logic Helpers ---

  // --- LOGIKA METRONOM ---
  useEffect(() => {
    if (isMetronomeActive) {
      const interval = (60 / tempo) * 1000;
      metronomeIntervalRef.current = setInterval(() => {
        playMetronomeClick();
      }, interval);
    } else {
      if (metronomeIntervalRef.current)
        clearInterval(metronomeIntervalRef.current);
    }
    return () => {
      if (metronomeIntervalRef.current)
        clearInterval(metronomeIntervalRef.current);
    };
  }, [isMetronomeActive, tempo]);

  const playMetronomeClick = () => {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();

    osc.frequency.value = 880; // Suara klik tinggi
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(envelope);
    envelope.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  // --- LOGIKA REKAMAN ---
  const toggleRecording = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) =>
          audioChunksRef.current.push(e.data);
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          setAudioURL(URL.createObjectURL(blob));
          stream.getTracks().forEach((t) => t.stop());
        };
        mediaRecorderRef.current.start();
        setRecording(true);
      } catch (err) {
        alert("Mikrofon tidak aktif!");
      }
    } else {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    }
  };

  // Audio Playback Utility
  const playNote = (freq: number) => {
    // Ensure AudioContext is only created on client side interactions
    if (typeof window === "undefined") return;

    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = freq;
    osc.type = "sine";

    osc.start();
    // Fade out effect
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
    osc.stop(ctx.currentTime + 1);
  };

  const handleAnswer = (selectedIdx: number) => {
    if (isChecking) return; // Mencegah klik ganda

    setSelectedAnswer(selectedIdx);
    setIsChecking(true);

    // Jika benar, tambah skor
    if (selectedIdx === QUESTIONS[currentQuestion].correct) {
      setScore((prev) => prev + 100 / QUESTIONS.length);
    }
  };

  const handleNext = () => {
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < QUESTIONS.length) {
      setCurrentQuestion(nextQuestion);
      setSelectedAnswer(null);
      setIsChecking(false);
    } else {
      setQuizFinished(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedAnswer(null);
    setIsChecking(false);
  };

  const downloadCertificate = () => {
    alert("Sertifikat berhasil diunduh ke perangkat! (Simulasi)");
  };

  useEffect(() => {
    // Set tanggal hanya setelah komponen muncul di browser
    setCurrentDate(
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  // --- Render Sections ---

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar (Visible after step 1) */}
      {step > 1 && (
       <nav className="bg-white/80 backdrop-blur-md shadow-sm p-3 md:p-4 flex justify-between items-center sticky top-0 z-50 border-b border-slate-100 print:hidden">
          {/* Sisi Kiri: Logo & Nama */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="material-icons text-white text-lg md:text-xl">
                mic_external_on
              </span>
            </div>
            {/* Teks mengecil di mobile, membesar di desktop */}
            <span className="font-black text-base md:text-xl tracking-tighter text-slate-800 uppercase">
              Mahir <span className="text-blue-600">Bernyanyi</span>
            </span>
          </div>

          {/* Sisi Kanan: Tombol Aksi */}
          <div className="flex items-center gap-2">
            {/* Indikator Step Mini (Tambahan agar user tahu progres di navbar) */}
            <div className="hidden sm:flex items-center bg-slate-100 px-3 py-1 rounded-full mr-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Progress
              </span>
              <span className="ml-2 text-xs font-bold text-blue-600">
                {step}/10
              </span>
            </div>

            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 px-3 py-2 md:px-4 rounded-xl transition-all active:scale-95 group border border-transparent hover:border-red-100"
            >
              <span className="material-icons text-xl">home</span>
              {/* Teks Home hanya muncul di layar desktop/tablet */}
              <span className="hidden md:block font-bold text-sm">BERANDA</span>
            </button>
          </div>
        </nav>
      )}

      <main className="flex-grow container mx-auto px-4 py-8">
        {step === 1 && (
          <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden px-4 py-10">
            {/* Dekorasi Latar Belakang (Aksen Artistik) */}
            <div className="absolute bottom-10 right-10 text-blue-100 -z-10 animate-bounce hidden md:block">
              <span className="material-icons text-[100px]">graphic_eq</span>
            </div>

            {/* Konten Utama */}
            <div className="text-center space-y-6 md:space-y-8 max-w-2xl w-full animate-in fade-in zoom-in duration-700">
              {/* Logo Container dengan Glassmorphism */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
                <div className="relative bg-gradient-to-br from-blue-700 to-blue-500 p-6 md:p-10 rounded-full shadow-2xl border-4 border-white/20">
                  <span className="material-icons text-white text-[60px] md:text-[90px] drop-shadow-lg">
                    mic_external_on
                  </span>
                </div>
              </div>

              {/* Judul & Tagline */}
              <div className="space-y-3 px-2">
                <h1 className="text-4xl md:text-6xl font-black text-blue-950 tracking-tighter leading-tight">
                  Mahir <span className="text-blue-600">Bernyanyi</span>
                </h1>
                <p className="text-base md:text-xl text-gray-500 font-medium max-w-md mx-auto leading-relaxed">
                  Platform edukasi vokal interaktif untuk mengasah bakat
                  menyanyi Anda dari pengetahuan dasar.
                </p>
              </div>

              {/* Tombol Navigasi Utama */}
              <div className="flex flex-col gap-3 md:gap-4 w-full max-w-sm mx-auto pt-4 md:pt-6">
                <button
                  onClick={() => setStep(2)}
                  className="group relative bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-base md:text-lg shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
                >
                  <div className="absolute inset-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                  <span className="material-icons text-xl">rocket_launch</span>
                  MULAI BELAJAR SEKARANG
                </button>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button
                    onClick={() => setShowAbout(true)}
                    className="flex items-center justify-center gap-2 bg-white border-2 border-gray-100 hover:border-blue-200 text-gray-700 py-3 rounded-xl font-semibold text-sm md:text-base transition-all hover:bg-blue-50"
                  >
                    <span className="material-icons text-blue-500 text-sm md:text-base">
                      info
                    </span>
                    Tentang
                  </button>
                  <button
                    onClick={() => setShowHelp(true)}
                    className="flex items-center justify-center gap-2 bg-white border-2 border-gray-100 hover:border-blue-200 text-gray-700 py-3 rounded-xl font-semibold text-sm md:text-base transition-all hover:bg-blue-50"
                  >
                    <span className="material-icons text-blue-500 text-sm md:text-base">
                      help_outline
                    </span>
                    Bantuan
                  </button>
                </div>
              </div>
            </div>

            {/* MODAL: Tentang Aplikasi (Responsif padding & teks) */}
            {showAbout && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 mx-auto">
                  <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-blue-900">
                      Tentang Aplikasi
                    </h3>
                    <button
                      onClick={() => setShowAbout(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-4">
                    <strong>Mahir Bernyanyi</strong> adalah aplikasi berbasis
                    kurikulum vokal modern yang dirancang untuk membantu
                    penyanyi pemula memahami teknik dasar.
                  </p>
                  <ul className="space-y-2 text-xs md:text-sm text-gray-500">
                    <li className="flex gap-2">
                      <span className="material-icons text-green-500 text-xs">
                        check
                      </span>{" "}
                      Pembelajaran Lengkap Animasi
                    </li>
                    <li className="flex gap-2">
                      <span className="material-icons text-green-500 text-xs">
                        check
                      </span>{" "}
                      Latihan Interaktif & Real-time
                    </li>
                    <li className="flex gap-2">
                      <span className="material-icons text-green-500 text-xs">
                        check
                      </span>{" "}
                      Sertifikat Penyelesaian Digital
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* MODAL: Bantuan (Responsif padding & teks) */}
            {showHelp && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 mx-auto">
                  <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-blue-900">
                      Pusat Bantuan
                    </h3>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-2xl">
                      <p className="font-bold text-blue-900 text-xs md:text-sm">
                        Butuh bantuan teknis?
                      </p>
                      <p className="text-[10px] md:text-xs text-blue-700">
                        Email: lisna@gmail.com
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="font-bold text-gray-800 text-xs md:text-sm">
                        Cara Penggunaan:
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-600 leading-relaxed">
                        Gunakan earphone saat latihan di Studio untuk kualitas
                        audio terbaik.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 2: Pengenalan Vokal */}
        {step === 2 && (
          <section className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 px-4 pb-10">
            {/* Header Materi */}
            <div className="text-center space-y-2">
              <div className="inline-block bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-xs md:text-sm font-bold mb-2">
                MODUL 1: DASAR VOKAL
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-blue-950 flex items-center justify-center gap-2 md:gap-3 leading-tight">
                <span className="material-icons text-blue-600 text-3xl md:text-4xl">
                  psychology
                </span>
                Apa Itu Bernyanyi?
              </h2>
              <p className="text-gray-500 italic text-base md:text-lg px-2">
                "Alat musik Anda adalah tubuh Anda sendiri."
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-10 items-start">
              {/* Kolom Kiri: Teks & Definisi */}
              <div className="space-y-6 order-1 lg:order-1">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-[1px] rounded-2xl shadow-lg">
                  <div className="bg-white p-5 md:p-6 rounded-[calc(1rem-1px)]">
                    <p className="text-lg md:text-xl text-blue-950 leading-relaxed font-medium">
                      Bernyanyi adalah koordinasi harmonis antara{" "}
                      <span className="text-blue-600 font-bold">
                        aliran udara
                      </span>
                      ,{" "}
                      <span className="text-purple-600 font-bold">getaran</span>
                      , dan{" "}
                      <span className="text-orange-600 font-bold">
                        ruang gema
                      </span>
                      .
                    </p>
                    <p className="mt-4 text-sm md:text-base text-gray-600">
                      Ini bukan sekadar mengeluarkan suara, melainkan seni
                      mengendalikan otot tubuh secara sadar untuk menciptakan
                      resonansi yang indah.
                    </p>
                  </div>
                </div>

                {/* Pilar Produksi Suara */}
                <div className="space-y-4">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2 px-2">
                    <span className="material-icons text-red-500">
                      auto_awesome
                    </span>
                    3 Mekanisme Utama
                  </h3>

                  {[
                    {
                      title: "Power Source (Udara)",
                      desc: "Paru-paru & Diafragma yang mendorong udara keluar sebagai bahan bakar suara.",
                      icon: "air",
                      color: "bg-blue-50 text-blue-600",
                      border: "border-blue-100",
                    },
                    {
                      title: "Vibrator (Getaran)",
                      desc: "Pita suara di dalam Laring yang bergetar sangat cepat saat dilewati udara.",
                      icon: "graphic_eq",
                      color: "bg-purple-50 text-purple-600",
                      border: "border-purple-100",
                    },
                    {
                      title: "Resonator (Ruang Gema)",
                      desc: "Mulut, tenggorokan, dan rongga hidung yang memperkuat dan mewarnai suara.",
                      icon: "campaign",
                      color: "bg-orange-50 text-orange-600",
                      border: "border-orange-100",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 md:gap-4 p-4 bg-white border ${item.border} rounded-2xl transition-all hover:shadow-md active:scale-[0.98]`}
                    >
                      <div
                        className={`${item.color} p-2 md:p-3 rounded-xl h-fit shadow-inner`}
                      >
                        <span className="material-icons text-xl md:text-2xl">
                          {item.icon}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">
                          {item.title}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-600 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kolom Kanan: Visual Anatomi */}
              <div className="lg:sticky lg:top-10 order-2 lg:order-2 overflow-hidden px-1">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-700"></div>
                  <div className="relative bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center">
                    {/* Ilustrasi Anatomi Menggunakan Ikon dan Garis - DIBUAT RESPONSIF */}
                    <div className="w-full max-w-[280px] h-[320px] md:h-[350px] relative mt-4 border-2 border-dashed border-gray-100 rounded-3xl flex items-center justify-center bg-gray-50/50">
                      {/* Kepala/Resonansi */}
                      <div className="absolute top-6 md:top-8 w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-orange-400 flex items-center justify-center bg-orange-50 animate-pulse">
                        <span className="material-icons text-orange-500 text-3xl md:text-4xl">
                          face
                        </span>
                        {/* Label Kanan - Disembunyikan di Mobile Kecil agar tidak nabrak */}
                        <div className="absolute -right-16 md:-right-24 top-4 flex items-center gap-1 md:gap-2">
                          <div className="w-6 md:w-10 h-[2px] bg-orange-300"></div>
                          <span className="text-[8px] md:text-[10px] font-bold text-orange-600 uppercase">
                            Resonansi
                          </span>
                        </div>
                      </div>

                      {/* Leher/Pita Suara */}
                      <div className="absolute top-28 md:top-32 w-7 h-10 md:w-8 md:h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                        <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-500 rounded-full animate-ping"></div>
                        <div className="absolute -left-20 md:-left-28 top-4 flex items-center gap-1 md:gap-2">
                          <span className="text-[8px] md:text-[10px] font-bold text-purple-600 uppercase text-right">
                            Laring
                          </span>
                          <div className="w-6 md:w-10 h-[2px] bg-purple-300"></div>
                        </div>
                      </div>

                      {/* Paru-paru & Diafragma */}
                      <div className="absolute bottom-8 md:bottom-10 w-32 h-28 md:w-40 md:h-32 bg-blue-100 rounded-t-[2rem] md:rounded-t-[3rem] border-b-8 border-blue-600 flex flex-col items-center justify-center p-2 md:p-4">
                        <span className="material-icons text-blue-400 text-4xl md:text-5xl">
                          lungs
                        </span>
                        <div className="absolute -right-16 md:-right-24 bottom-2 flex items-center gap-1 md:gap-2">
                          <div className="w-6 md:w-10 h-[2px] bg-blue-300"></div>
                          <span className="text-[8px] md:text-[10px] font-bold text-blue-600 uppercase">
                            Diafragma
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 md:mt-8 text-center bg-gray-50 p-3 rounded-xl w-full">
                      <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <span className="material-icons text-xs md:text-sm">
                          touch_app
                        </span>
                        Visualisasi Mekanisme Vokal
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Navigasi - Disesuaikan untuk Mobile */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-8 mt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(1)}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 text-gray-500 hover:text-blue-600 font-bold rounded-xl transition-all hover:bg-blue-50 order-2 md:order-1"
              >
                <span className="material-icons">west</span> Kembali
              </button>

              <button
                onClick={() => setStep(3)}
                className="w-full md:w-auto group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-95 order-1 md:order-2"
              >
                Lanjut: Teknik Postur
                <span className="material-icons group-hover:translate-x-1 transition-transform text-xl">
                  east
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Postur & Pernapasan */}
        {step === 3 && (
          <section className="max-w-6xl mx-auto space-y-8 md:space-y-10 animate-in fade-in slide-in-from-right-8 duration-500 px-4 pb-12">
            {/* Header Section */}
            <div className="text-center space-y-3">
              <div className="inline-block bg-green-100 text-green-700 px-5 py-1.5 rounded-full text-[10px] md:text-xs font-black tracking-widest mb-2 uppercase border border-green-200">
                Modul 2: Fondasi Fisik
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-blue-950 flex flex-wrap items-center justify-center gap-2 md:gap-4 leading-tight">
                <span className="material-icons text-blue-600 text-4xl md:text-5xl">
                  accessibility_new
                </span>
                Postur & Pernapasan
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-lg italic px-2">
                "Suara yang hebat tidak dimulai dari tenggorokan, tapi dari kaki
                dan otot diafragma yang terkontrol."
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-10 items-start">
              {/* KIRI: EDUKASI POSTUR & TEORI */}
              <div className="space-y-6 order-2 lg:order-1">
                {/* Card 1: Panduan Berdiri & Duduk */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-gray-100">
                  <h3 className="text-xl md:text-2xl font-black text-gray-800 mb-6 flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-xl material-icons text-xl md:text-2xl">
                      airline_seat_recline_normal
                    </span>
                    Posisi Tubuh Ideal
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="font-bold text-blue-900 mb-1 text-sm md:text-base">
                        Berdiri (Vokal Utama)
                      </p>
                      <p className="text-[11px] md:text-xs text-blue-700 leading-relaxed">
                        Kaki selebar bahu, satu kaki sedikit di depan untuk
                        keseimbangan maksimal.
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="font-bold text-orange-900 mb-1 text-sm md:text-base">
                        Duduk (Latihan)
                      </p>
                      <p className="text-[11px] md:text-xs text-orange-700 leading-relaxed">
                        Duduk di tepi kursi, punggung jangan menyandar, kaki
                        menapak rata di lantai.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      {
                        t: "Tulang Belakang",
                        d: "Bayangkan benang menarik ubun-ubun ke atas.",
                      },
                      {
                        t: "Bahu & Dada",
                        d: "Bahu rileks ke bawah, dada terbuka lebar.",
                      },
                      {
                        t: "Leher & Dagu",
                        d: "Dagu rileks, sejajar lantai untuk jalur udara lurus.",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        <span className="material-icons text-green-500 text-sm md:text-base">
                          task_alt
                        </span>
                        <div>
                          <p className="font-bold text-xs md:text-sm text-gray-800">
                            {item.t}
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            {item.d}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 2: 5 Tahap Pernapasan */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl text-white">
                  <h3 className="text-xl md:text-2xl font-black mb-6 flex items-center gap-3">
                    <span className="material-icons">waves</span>5 Langkah Napas
                    Perut
                  </h3>
                  <ol className="space-y-4">
                    {[
                      "Relaksasi otot perut saat mulai menarik napas.",
                      "Hirup udara melalui hidung (perut mengembang).",
                      "Diafragma mendatar, memberi ruang paru-paru.",
                      "Tahan sejenak tanpa mengunci tenggorokan.",
                      "Buang napas perlahan (sisis...) otot tetap aktif.",
                    ].map((stepText, i) => (
                      <li key={i} className="flex gap-4 items-center group">
                        <span className="w-6 h-6 md:w-7 md:h-7 bg-white/20 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-xs md:text-sm font-medium opacity-90">
                          {stepText}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* KANAN: VISUALISASI INTERAKTIF (MOBILE OPTIMIZED) */}
              <div className="bg-blue-950 text-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col items-center justify-between overflow-hidden lg:sticky lg:top-8 order-1 lg:order-2">
                <div className="text-center z-10 space-y-1 mb-4">
                  <div className="bg-cyan-500/20 text-cyan-400 text-[9px] md:text-[10px] font-black px-3 py-1 rounded-full inline-block border border-cyan-500/30 mb-1">
                    LIVE SIMULATION
                  </div>
                  <h3 className="font-bold text-xl md:text-2xl text-white">
                    Mesin Pernapasan
                  </h3>
                  <p className="text-xs text-blue-200 opacity-80">
                    Sentuh untuk simulasi organ
                  </p>
                </div>

                <div className="relative z-10 w-full flex justify-center items-center py-2 overflow-hidden">
                  <button
                    onClick={() => setDiafragmaActive(!diafragmaActive)}
                    className="relative focus:outline-none flex justify-center items-center transition-transform active:scale-95"
                    style={{ width: "260px", height: "380px" }} // Ukuran dikecilkan untuk mobile
                  >
                    {/* Glow Aura */}
                    <div
                      className={`absolute inset-0 bg-cyan-500 blur-[80px] md:blur-[120px] transition-opacity duration-1000 rounded-full ${
                        diafragmaActive ? "opacity-30" : "opacity-0"
                      }`}
                    ></div>

                    {/* Ikon Manusia - Font Size Disesuaikan Mobile */}
                    <span
                      className={`material-icons transition-all duration-700 ${
                        diafragmaActive
                          ? "text-white"
                          : "text-blue-900 opacity-30"
                      }`}
                      style={{
                        fontSize: "350px",
                        position: "absolute",
                        top: "0px",
                      }}
                    >
                      accessibility_new
                    </span>

                    {diafragmaActive && (
                      <div className="absolute inset-0 z-20 pointer-events-none">
                        {/* Udara */}
                        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className="w-1 h-12 bg-gradient-to-b from-cyan-300 to-transparent animate-pulse"></div>
                        </div>

                        {/* Paru-Paru - Skala Mobile */}
                        <div className="absolute top-[32%] left-1/2 -translate-x-1/2 w-[90px] h-[80px] flex justify-between">
                          <div className="w-[45%] h-full bg-cyan-400/40 rounded-t-full rounded-b-xl border-l-2 border-cyan-200 animate-pulse"></div>
                          <div className="w-[45%] h-full bg-cyan-400/40 rounded-t-full rounded-b-xl border-r-2 border-cyan-200 animate-pulse"></div>
                        </div>

                        {/* Diafragma - Skala Mobile */}
                        <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-[110px]">
                          <div className="relative h-2 w-full bg-cyan-400 rounded-full shadow-[0_0_20px_rgba(34,211,238,1)] animate-[bounce_2s_infinite]">
                            <div className="absolute -right-16 -top-1">
                              <span className="text-[8px] font-black bg-white text-blue-900 px-1.5 py-0.5 rounded border border-cyan-500">
                                DIAFRAGMA
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                {/* Info Box */}
                <div className="w-full z-10 min-h-[90px] mt-4">
                  {diafragmaActive ? (
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl text-center animate-in zoom-in duration-300">
                      <p className="text-cyan-300 font-black text-[10px] uppercase tracking-widest mb-1">
                        Mekanisme Kerja
                      </p>
                      <p className="text-[11px] text-blue-50 leading-relaxed italic">
                        "Diafragma menekan organ perut ke bawah untuk menghisap
                        udara hingga ke dasar paru-paru."
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 text-center border-2 border-dashed border-blue-800 rounded-2xl">
                      <span className="material-icons text-blue-500 text-sm mb-1">
                        touch_app
                      </span>
                      <p className="text-xs text-blue-400 font-bold uppercase">
                        Klik Untuk Simulasi
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="flex flex-col md:flex-row gap-3 md:justify-between items-center pt-8 border-t border-gray-100">
              <button
                onClick={() => setStep(2)}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-all px-6 py-3 rounded-xl hover:bg-gray-50 order-2 md:order-1"
              >
                <span className="material-icons">west</span> Sebelumnya
              </button>

              <button
                onClick={() => setStep(4)}
                className="w-full md:w-auto group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 order-1 md:order-2"
              >
                Lanjut: Unsur Vokal
                <span className="material-icons group-hover:translate-x-1 transition-transform">
                  east
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Unsur Dasar & Artikulasi */}
        {step === 4 && (
          <section className="max-w-6xl mx-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-right-8 duration-500 px-4 pb-12">
            {/* Header Section */}
            <div className="text-center space-y-4">
              <div className="inline-block bg-purple-100 text-purple-700 px-5 py-1.5 rounded-full text-[10px] md:text-xs font-black tracking-widest uppercase border border-purple-200 shadow-sm">
                Modul 3: Anatomi Suara & Artikulasi
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-blue-950 tracking-tight flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 leading-tight">
                <span className="material-icons text-purple-600 text-5xl md:text-6xl">
                  record_voice_over
                </span>
                <span>
                  Menguasai <span className="text-purple-600">Unsur Vokal</span>
                </span>
              </h2>

              <p className="text-slate-500 max-w-2xl mx-auto font-medium text-sm md:text-lg leading-relaxed px-2">
                Bernyanyi bukan sekadar mengeluarkan nada, melainkan bagaimana
                kita mengolah resonansi dan memperjelas pesan melalui artikulasi
                yang sempurna.
              </p>
            </div>

            {/* BAGIAN 1: 4 PILAR UTAMA VOKAL - Grid disesuaikan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                {
                  title: "Intonasi",
                  icon: "music_note",
                  color: "blue",
                  desc: "Kemampuan membidik nada secara presisi agar tidak 'fals' dan selaras dengan instrumen.",
                },
                {
                  title: "Resonansi",
                  icon: "settings_input_antenna",
                  color: "orange",
                  desc: "Proses penguatan suara di rongga gema (kepala, hidung, dada) untuk warna suara.",
                },
                {
                  title: "Artikulasi",
                  icon: "record_voice_over",
                  color: "purple",
                  desc: "Cara pengucapan kata melalui koordinasi lidah, bibir, dan rahang yang jernih.",
                },
                {
                  title: "Phrasing",
                  icon: "segment",
                  color: "green",
                  desc: "Teknik pemenggalan kalimat lagu untuk menjaga makna lirik dan manajemen napas.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group bg-white p-6 rounded-[2rem] shadow-lg border border-gray-100 hover:border-purple-200 transition-all hover:-translate-y-1 active:scale-95"
                >
                  <div
                    className={`w-12 h-12 md:w-14 md:h-14 bg-${item.color}-50 text-${item.color}-600 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform`}
                  >
                    <span className="material-icons text-2xl md:text-3xl">
                      {item.icon}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-950 text-lg md:text-xl mb-2">
                    {item.title}
                  </h4>
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed italic">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* BAGIAN 2: WORKSHOP ARTIKULASI (A-I-U-E-O) */}
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
              <div className="grid lg:grid-cols-2">
                {/* Konten Kiri: Teori Huruf */}
                <div className="p-6 md:p-10 lg:p-14 space-y-6 md:space-y-8 bg-gray-50/50 order-2 lg:order-1">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-blue-950 mb-3">
                      Pembentukan Vokal
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      Setiap huruf vokal memerlukan konfigurasi rahang dan lidah
                      yang berbeda. Pastikan membuka mulut dengan cukup lebar.
                    </p>
                  </div>

                  {/* Tombol Vokal - Responsif Row */}
                  <div className="flex flex-wrap justify-center sm:grid sm:grid-cols-5 gap-2 md:gap-3">
                    {(["A", "I", "U", "E", "O"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setActiveVocal(v)}
                        className={`w-14 h-14 sm:w-full sm:h-20 rounded-xl md:rounded-2xl text-xl md:text-2xl font-black transition-all flex items-center justify-center shadow-md
                  ${
                    activeVocal === v
                      ? "bg-purple-600 text-white scale-110 ring-4 ring-purple-100"
                      : "bg-white text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                  }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg md:text-xl font-bold text-purple-700 flex items-center gap-2">
                      <span className="material-icons">psychology</span> Teknik{" "}
                      {activeVocal}
                    </h4>
                    <div className="bg-white p-5 md:p-6 rounded-2xl border border-purple-100 shadow-sm min-h-[100px] md:min-h-[120px]">
                      <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                        {VOCAL_DESC[activeVocal]}
                      </p>
                    </div>
                    <div className="flex gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-yellow-800 text-[10px] md:text-sm">
                      <span className="material-icons text-sm md:text-base">
                        warning
                      </span>
                      <p>
                        Pastikan otot wajah rileks. Ketegangan rahang membuat
                        suara tercekik.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Konten Kanan: Visualizer Mulut */}
                <div className="p-8 md:p-10 flex flex-col items-center justify-center bg-white relative order-1 lg:order-2 border-b lg:border-b-0 lg:border-l border-gray-100">
                  <div className="absolute top-5 right-5 opacity-5 lg:opacity-10 pointer-events-none">
                    <span className="material-icons text-[100px] md:text-[150px]">
                      face
                    </span>
                  </div>

                  <h5 className="text-[10px] font-black tracking-[0.2em] md:tracking-[0.3em] text-gray-400 uppercase mb-8 md:mb-12">
                    Anatomi Rongga Mulut
                  </h5>

                  {/* Animasi Mulut Modern - Skala dikecilkan untuk mobile */}
                  <div className="relative flex items-center justify-center h-48 md:h-64 w-full">
                    <div
                      className="border-[6px] md:border-[8px] border-blue-950 flex flex-col items-center justify-center transition-all duration-500 ease-out bg-red-100 shadow-2xl relative overflow-hidden"
                      style={VOCAL_STYLES[activeVocal]}
                    >
                      <div className="w-full h-[12%] bg-white/95 border-b border-gray-200 absolute top-0"></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-red-900/30 via-transparent to-transparent -z-10"></div>
                      <div
                        className={`bg-pink-400 rounded-full opacity-70 transition-all duration-500 mt-auto mb-2
                ${
                  activeVocal === "I" || activeVocal === "E"
                    ? "h-[40%] w-[80%]"
                    : "h-[20%] w-[60%]"
                }`}
                      ></div>
                    </div>

                    {/* Sound Projection Effect */}
                    <div className="absolute -z-10 w-full flex justify-center">
                      <div className="w-32 h-32 md:w-48 md:h-48 bg-purple-500/10 rounded-full animate-ping"></div>
                    </div>
                  </div>

                  <div className="mt-8 md:mt-12 flex gap-2 items-center text-gray-400">
                    <span className="material-icons text-xs md:text-sm">
                      info
                    </span>
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-center">
                      Tekan tombol vokal di bawah untuk melihat perubahan
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col md:flex-row gap-3 md:justify-between items-center pt-8 border-t border-gray-100">
              <button
                onClick={() => setStep(3)}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-all px-8 py-3 rounded-2xl hover:bg-gray-50 order-2 md:order-1"
              >
                <span className="material-icons">west</span> Sebelumnya
              </button>

              <button
                onClick={() => setStep(5)}
                className="w-full md:w-auto group bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black text-base md:text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 order-1 md:order-2"
              >
                Lanjut: Pitch & Nada
                <span className="material-icons group-hover:translate-x-1 transition-transform">
                  east
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Step 5: Pitch & Jenis Suara */}
        {step === 5 && (
          <section className="max-w-6xl mx-auto space-y-8 md:space-y-10 animate-in fade-in slide-in-from-right-8 duration-500 px-4 pb-12">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-block bg-blue-100 text-blue-700 px-5 py-1.5 rounded-full text-[10px] md:text-xs font-black tracking-widest mb-2 uppercase border border-blue-200">
                Modul 4: Karakter Suara
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-blue-950 flex items-center justify-center gap-3 md:gap-4 leading-tight">
                <span className="material-icons text-blue-600 text-4xl md:text-5xl">
                  straighten
                </span>
                Range Suara & Pitch
              </h2>
            </div>

            {/* Section 1: Penjelasan Jenis Suara + Simulasi Pendengaran */}
            {/* Menggunakan grid 1 kolom di mobile, 2 di tablet, 4 di desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                {
                  name: "Sopran",
                  desc: "Tinggi (Wanita)",
                  range: "C4 - C6",
                  color: "from-pink-500 to-rose-600",
                  info: "Cerah & Melengking",
                  sample: VOICE_SAMPLES.Sopran,
                },
                {
                  name: "Alto",
                  desc: "Rendah (Wanita)",
                  range: "F3 - F5",
                  color: "from-orange-400 to-pink-500",
                  info: "Berat & Dalam",
                  sample: VOICE_SAMPLES.Alto,
                },
                {
                  name: "Tenor",
                  desc: "Tinggi (Pria)",
                  range: "C3 - C5",
                  color: "from-blue-500 to-indigo-600",
                  info: "Kuat & Bertenaga",
                  sample: VOICE_SAMPLES.Tenor,
                },
                {
                  name: "Bass",
                  desc: "Rendah (Pria)",
                  range: "E2 - E4",
                  color: "from-slate-700 to-blue-900",
                  info: "Bergema & Tebal",
                  sample: VOICE_SAMPLES.Bass,
                },
              ].map((type) => (
                <div
                  key={type.name}
                  className="group bg-white p-2 rounded-[2rem] md:rounded-[2.5rem] shadow-lg hover:shadow-xl transition-all border border-gray-100"
                >
                  <div
                    className={`bg-gradient-to-br ${type.color} p-5 md:p-6 rounded-[1.8rem] md:rounded-[2rem] text-white h-full flex flex-col`}
                  >
                    <p className="text-[9px] md:text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">
                      {type.desc}
                    </p>
                    <h4 className="text-2xl md:text-3xl font-black mb-1">
                      {type.name}
                    </h4>
                    <p className="text-[10px] md:text-xs font-medium opacity-90 mb-4">
                      {type.info}
                    </p>

                    <div className="bg-black/20 rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-white/10">
                      <p className="text-[8px] md:text-[10px] uppercase font-bold opacity-60 mb-1 md:mb-2">
                        Estimasi Range:
                      </p>
                      <p className="text-base md:text-lg font-mono font-bold tracking-tighter">
                        {type.range}
                      </p>
                    </div>

                    <button
                      onClick={() => playNote(type.sample.freq)}
                      className="mt-auto w-full bg-white text-gray-900 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors shadow-lg active:scale-95"
                    >
                      <span className="material-icons text-lg md:text-xl">
                        play_circle
                      </span>
                      DENGAR NADA
                    </button>
                    <p className="text-[8px] text-center mt-3 opacity-60 font-bold uppercase">
                      Ref: {type.sample.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Section 2: Simulasi Piano Pitch */}
            <div className="bg-slate-900 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden border-b-8 border-blue-500">
              <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-10 items-center">
                <div className="lg:w-1/3 space-y-4 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
                    <span className="material-icons text-sm">auto_graph</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Ear Training
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                    Uji Kepekaan Telinga
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0">
                    Gunakan piano ini untuk menemukan karakter suara Anda. Jika
                    nyaman di nada kiri, Anda mungkin seorang{" "}
                    <strong>Bass/Alto</strong>. Jika kanan, Anda{" "}
                    <strong>Tenor/Sopran</strong>.
                  </p>
                </div>

                {/* Keyboard Layout */}
                <div className="lg:w-2/3 w-full py-2">
                  {/* Scroll Horizontal Container */}
                  <div className="overflow-x-auto pb-4 custom-scrollbar -mx-2 px-2">
                    <div className="flex bg-slate-800 p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-slate-700 min-w-max mx-auto w-fit">
                      {NOTES.map((n, i) => (
                        <button
                          key={i}
                          onClick={() => playNote(n.freq)}
                          className={`
                    group relative 
                    w-9 md:w-16 h-36 md:h-64
                    bg-white border border-slate-200 
                    rounded-b-lg md:rounded-b-2xl 
                    hover:bg-blue-50 transition-all 
                    active:scale-95 active:translate-y-1
                    shadow-[0_4px_0_#cbd5e1] md:shadow-[0_8px_0_#cbd5e1] 
                    active:shadow-none flex flex-col justify-end items-center pb-4 md:pb-8
                    first:rounded-l-lg md:first:rounded-l-2xl 
                    last:rounded-r-lg md:last:rounded-r-2xl
                    mx-[0.5px] md:mx-[1px]
                  `}
                        >
                          <span className="text-[8px] md:text-xs font-black text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-tighter">
                            {n.name}
                          </span>
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 opacity-0 group-active:opacity-100 transition-opacity rounded-full mb-2 mx-1"></div>
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-active:opacity-100 transition-opacity rounded-b-lg"></div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-center text-slate-500 text-[9px] font-bold mt-3 md:hidden flex items-center justify-center gap-2">
                    <span className="material-icons text-xs">swap_horiz</span>
                    GESER UNTUK NADA LAIN
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col md:flex-row gap-3 md:justify-between items-center pt-6 border-t border-gray-100">
              <button
                onClick={() => setStep(4)}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-all px-6 py-3 rounded-xl hover:bg-gray-50 order-2 md:order-1"
              >
                <span className="material-icons">west</span> Sebelumnya
              </button>

              <button
                onClick={() => setStep(6)}
                className="w-full md:w-auto group bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 order-1 md:order-2"
              >
                Lanjut: Pemanasan
                <span className="material-icons group-hover:translate-x-1 transition-transform">
                  east
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Step 6: Pemanasan Vokal (Warming Up) */}
        {step === 6 && (
          <section className="max-w-5xl mx-auto space-y-8 md:space-y-10 animate-in fade-in slide-in-from-right-8 duration-500 px-4 pb-12">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-block bg-red-100 text-red-700 px-5 py-1.5 rounded-full text-[10px] md:text-xs font-black tracking-widest mb-2 uppercase border border-red-200">
                Modul 5: Latihan Harian
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-blue-950 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 leading-tight">
                <span className="material-icons text-red-600 text-4xl md:text-5xl">
                  fireplace
                </span>
                Warming Up
              </h2>
              <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Pemanasan sangat penting untuk menghindari cedera pita suara dan
                memastikan resonansi Anda sudah "terbuka" sebelum bernyanyi.
              </p>
            </div>

            {/* Video Player Section - Border disesuaikan untuk mobile */}
            <div className="relative group shadow-2xl rounded-[1.5rem] md:rounded-[3rem] overflow-hidden bg-black border-[4px] md:border-8 border-white">
              <div className="aspect-video w-full">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/va8PnY-vy3c?autoplay=${
                    videoPlaying ? 1 : 0
                  }&controls=1`}
                  title="Vocal Warm Up Tutorial"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>

              {/* Overlay Description (Hanya muncul saat tidak play) */}
              {!videoPlaying && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-center pointer-events-none">
                  <div className="text-center text-white p-6">
                    <span className="material-icons text-5xl md:text-7xl mb-4 animate-pulse">
                      play_circle
                    </span>
                    <h4 className="text-lg md:text-2xl font-bold">
                      Mulai Pemanasan Mandiri
                    </h4>
                    <p className="text-[10px] md:text-sm opacity-70">
                      Ikuti instruksi pelatih dalam video secara bertahap.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cards Penjelasan Teknik - Grid 1 kolom di mobile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {[
                {
                  title: "Lip Trill",
                  icon: "graphic_eq",
                  desc: "Rilekskan bibir dan embuskan napas hingga bibir bergetar. Ini mengurangi tekanan berlebih pada pita suara.",
                  color: "blue",
                },
                {
                  title: "Humming",
                  icon: "blur_on",
                  desc: "Bersenandung dengan mulut tertutup. Rasakan getaran di area wajah untuk mengaktifkan resonansi.",
                  color: "purple",
                },
                {
                  title: "Vibrato",
                  icon: "waves",
                  desc: "Teknik mematangkan nada dengan gelombang suara stabil. Berlatihlah menjaga aliran napas konstan.",
                  color: "red",
                },
              ].map((tech, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-[2rem] shadow-lg border border-gray-100 hover:border-blue-200 transition-all group flex md:flex-col items-center md:items-start gap-4 md:gap-0"
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 bg-${tech.color}-50 text-${tech.color}-600 rounded-xl flex items-center justify-center md:mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <span className="material-icons">{tech.icon}</span>
                  </div>
                  <div>
                    <h5 className="font-black text-blue-900 text-base md:text-lg md:mb-2">
                      {tech.title}
                    </h5>
                    <p className="text-[11px] md:text-xs text-gray-500 leading-relaxed italic">
                      {tech.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Navigation */}
            <div className="flex flex-col md:flex-row gap-3 md:justify-between items-center pt-8 border-t border-gray-100">
              <button
                onClick={() => setStep(5)}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-all px-6 py-3 rounded-xl hover:bg-gray-50 order-2 md:order-1"
              >
                <span className="material-icons">west</span> Sebelumnya
              </button>

              <button
                onClick={() => setStep(7)}
                className="w-full md:w-auto group bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-10 py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 order-1 md:order-2"
              >
                Lanjut: Studio Rekaman
                <span className="material-icons group-hover:translate-x-1 transition-transform">
                  mic
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Step 7: Studio Latihan */}
        {step === 7 && (
          <section className="max-w-6xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-500 px-4 pb-12">
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-black text-blue-950 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 leading-tight">
                <span className="material-icons text-blue-600 text-4xl md:text-5xl">
                  settings_voice
                </span>
                Studio Latihan Aktif
              </h2>
              <p className="text-sm md:text-base text-gray-500 max-w-xl mx-auto">
                Atur tempo, cek nada, dan rekam vokal Anda secara real-time
                untuk mengevaluasi progres.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* 1. RECORDING CONSOLE */}
              <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col items-center justify-center min-h-[350px] md:min-h-[450px]">
                <div
                  className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-[8px] md:border-[12px] mb-6 md:mb-8 flex items-center justify-center transition-all duration-500 ${
                    recording
                      ? "border-red-100 bg-red-50 scale-105 md:scale-110 shadow-lg"
                      : "border-gray-50 bg-gray-50"
                  }`}
                >
                  <span
                    className={`material-icons text-5xl md:text-7xl ${
                      recording ? "text-red-500 animate-pulse" : "text-gray-200"
                    }`}
                  >
                    mic
                  </span>
                </div>

                <div className="flex flex-col items-center gap-4 md:gap-6 w-full">
                  <button
                    onClick={toggleRecording}
                    className={`w-full md:w-auto px-10 md:px-12 py-4 rounded-xl md:rounded-2xl font-black text-base md:text-lg flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
                      recording
                        ? "bg-red-500 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <span className="material-icons text-xl md:text-2xl">
                      {recording ? "stop" : "fiber_manual_record"}
                    </span>
                    {recording ? "STOP REKAMAN" : "MULAI REKAMAN"}
                  </button>

                  {/* BAGIAN YANG DIPERBAIKI: Hasil Rekaman + Opsi Hapus */}
                  {audioURL && !recording && (
                    <div className="w-full max-w-md space-y-3 animate-in slide-in-from-bottom-4">
                      <div className="bg-slate-900 p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl text-white flex flex-col items-center gap-3">
                        <span className="text-[9px] md:text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase">
                          Hasil Rekaman Terakhir
                        </span>
                        <audio
                          src={audioURL}
                          controls
                          className="w-full h-10 accent-blue-500"
                        />
                      </div>

                      {/* Tombol Hapus / Ulangi */}
                      <button
                        onClick={() => {
                          setAudioURL(null); // Menghapus URL audio agar input bersih kembali
                        }}
                        className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 font-bold text-xs md:text-sm transition-colors py-2"
                      >
                        <span className="material-icons text-sm md:text-base">
                          delete_forever
                        </span>
                        HAPUS & REKAM ULANG
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. SIDEBAR TOOLS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                {/* Metronome */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-gray-100 text-center flex flex-col justify-center">
                  <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 mb-3 md:mb-4 uppercase tracking-widest">
                    Metronome
                  </h4>
                  <div className="text-5xl md:text-6xl font-black text-blue-950 font-mono mb-2 md:mb-4">
                    {tempo}
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="180"
                    value={tempo}
                    onChange={(e) => setTempo(Number(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-6"
                  />
                  <button
                    onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                    className={`w-full py-3 rounded-xl font-bold text-xs md:text-sm transition-all active:scale-95 ${
                      isMetronomeActive
                        ? "bg-red-100 text-red-600 border border-red-200"
                        : "bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100"
                    }`}
                  >
                    {isMetronomeActive ? "MATIKAN KLIK" : "AKTIFKAN KLIK"}
                  </button>
                </div>

                {/* Tuner Virtual */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-gray-100 text-center flex flex-col justify-center">
                  <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 mb-4 md:mb-6 uppercase tracking-widest">
                    Virtual Tuner
                  </h4>
                  <div className="text-4xl md:text-5xl font-black text-slate-800 mb-4 md:mb-6 tracking-tighter">
                    C<sub className="text-blue-500 ml-1">4</sub>
                  </div>
                  <div className="w-full h-2.5 md:h-3 bg-gray-100 rounded-full relative overflow-hidden">
                    <div
                      className={`absolute h-full bg-green-500 transition-all duration-300 ${
                        recording ? "left-[45%] w-[10%]" : "left-0 w-0"
                      }`}
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-400 z-10" />
                  </div>
                  <p className="mt-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {recording ? "PITCH TERDETEKSI" : "MENUNGGU SUARA..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="flex flex-col md:flex-row gap-3 md:justify-between items-center pt-8 border-t border-gray-100">
              <button
                onClick={() => setStep(6)}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-all px-6 py-3 rounded-xl hover:bg-gray-50 order-2 md:order-1"
              >
                <span className="material-icons">west</span> Sebelumnya
              </button>

              <button
                onClick={() => setStep(8)}
                className="w-full md:w-auto group bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-10 py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 order-1 md:order-2"
              >
                Selesaikan Latihan
                <span className="material-icons group-hover:translate-x-1 transition-transform">
                  workspace_premium
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Step 8: Galeri Inspirasi */}
        {step === 8 && (
          <section className="max-w-6xl mx-auto space-y-8 md:space-y-12 animate-in fade-in zoom-in-95 duration-500 px-4 pb-12">
            {/* Header Galeri */}
            <div className="text-center space-y-4">
              <div className="inline-block bg-purple-100 text-purple-700 px-5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-purple-200">
                Vocal Mastery Gallery
              </div>

              <h2 className="text-2xl md:text-4xl font-black text-slate-900 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 leading-tight">
                <span className="material-icons text-purple-600 text-4xl md:text-5xl">
                  stars
                </span>
                <span className="text-center">Galeri Inspirasi Vokalis</span>
              </h2>

              <p className="text-slate-500 max-w-2xl mx-auto font-medium text-sm md:text-base leading-relaxed px-2">
                Pelajari bagaimana para legenda dunia mengaplikasikan teknik
                vokal yang ikonik melalui rekaman suara murni (isolated vocals).
              </p>
            </div>

            {/* Grid Konten - Responsif: 1 kolom mobile, 2 kolom desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {[
                {
                  name: "Freddie Mercury",
                  tech: "Belting & Power",
                  desc: "Dengarkan kekuatan vokal Freddie dalam 'Somebody To Love' tanpa musik. Perhatikan kontrol vibrato dan resonansinya.",
                  videoId: "6tDJXeUT2tg",
                  color: "from-yellow-400 to-orange-500",
                  icon: "military_tech",
                },
                {
                  name: "Whitney Houston",
                  tech: "Melisma & Acapella",
                  desc: "Teknik melisma (runs) paling ikonik. Dengarkan kontrol nada Whitney dalam versi acapella 'I Will Always Love You'.",
                  videoId: "k-hNjdM5NII",
                  color: "from-purple-500 to-indigo-600",
                  icon: "auto_awesome",
                },
                {
                  name: "Dimash Kudaibergen",
                  tech: "Mixed Voice & Range",
                  desc: "Eksplorasi jangkauan vokal yang melampaui batas normal pria, dari nada rendah hingga operatic notes yang tinggi.",
                  videoId: "OJfNaXcxM0E",
                  color: "from-blue-500 to-cyan-500",
                  icon: "spatial_tracking",
                },
                {
                  name: "Mariah Carey",
                  tech: "Whistle Register",
                  desc: "Versi acapella 'My All'. Perhatikan bagaimana Mariah memadukan teknik breathy dengan whistle register yang halus.",
                  videoId: "Lgl7QHGFVF4",
                  color: "from-pink-500 to-rose-600",
                  icon: "music_note",
                },
              ].map((artist, index) => (
                <div
                  key={index}
                  className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 group transition-all hover:-translate-y-1"
                >
                  <div className="flex flex-col md:flex-row h-full">
                    {/* Sisi Visual - Disesuaikan tingginya di mobile agar tidak makan tempat */}
                    <div
                      className={`md:w-1/3 bg-gradient-to-br ${artist.color} p-4 md:p-6 flex flex-row md:flex-col items-center justify-center gap-3 md:gap-0 text-white relative`}
                    >
                      <span className="material-icons text-4xl md:text-7xl opacity-40 group-hover:scale-110 transition-transform duration-500">
                        {artist.icon}
                      </span>
                      <div className="md:mt-4 text-left md:text-center">
                        <span className="hidden md:block text-[8px] font-black uppercase tracking-tighter opacity-80">
                          Legendary Performance
                        </span>
                        <p className="font-black text-sm md:text-base leading-tight">
                          {artist.name}
                        </p>
                      </div>
                    </div>

                    {/* Sisi Teks & Aksi */}
                    <div className="md:w-2/3 p-5 md:p-8 flex flex-col justify-between">
                      <div>
                        <h3 className="hidden md:block text-xl md:text-2xl font-black text-slate-800 mb-1">
                          {artist.name}
                        </h3>
                        <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3">
                          Teknik: {artist.tech}
                        </div>
                        <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-4 md:mb-6">
                          {artist.desc}
                        </p>
                      </div>

                      <a
                        href={`https://www.youtube.com/watch?v=${artist.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 bg-slate-900 text-white w-full py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-red-600 transition-all shadow-lg active:scale-95"
                      >
                        <span className="material-icons text-base md:text-xl">
                          play_circle_filled
                        </span>
                        DENGAR ISOLASI VOKAL
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Navigation - Ditumpuk di mobile */}
            <div className="flex flex-col md:flex-row gap-3 md:justify-between items-center pt-8 border-t border-gray-100">
              <button
                onClick={() => setStep(7)}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-all px-6 py-3 rounded-xl hover:bg-gray-50 order-2 md:order-1"
              >
                <span className="material-icons">west</span> Sebelumnya
              </button>

              <button
                onClick={() => setStep(9)}
                className="w-full md:w-auto group bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 order-1 md:order-2"
              >
                Mulai Kuis Evaluasi
                <span className="material-icons group-hover:translate-x-1 transition-transform">
                  quiz
                </span>
              </button>
            </div>
          </section>
        )}

        {step === 9 && (
          <section className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500 px-4 pb-12">
            {/* Header - Padding disesuaikan untuk mobile */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-gray-200 shadow-sm mb-6 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-blue-900 flex items-center gap-3 md:gap-4">
                <span className="material-icons text-orange-500 text-3xl md:text-4xl">
                  quiz
                </span>
                Uji Kemampuan Vokal
              </h2>
            </div>

            {/* Kontainer Kuis - Padding md:p-12 dikurangi menjadi p-6 di mobile */}
            <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-gray-100">
              {!quizFinished ? (
                <div className="space-y-6 md:space-y-8">
                  {/* Soal - Ukuran teks adaptif */}
                  <p className="text-lg md:text-2xl font-bold text-slate-800 leading-tight">
                    <span className="text-blue-600 mr-2">
                      Q{currentQuestion + 1}.
                    </span>
                    {QUESTIONS[currentQuestion].q}
                  </p>

                  <div className="grid gap-3 md:gap-4">
                    {QUESTIONS[currentQuestion].a.map((opt, idx) => {
                      const isCorrect =
                        idx === QUESTIONS[currentQuestion].correct;
                      const isSelected = idx === selectedAnswer;

                      // Logika Warna Tombol
                      let btnClass =
                        "border-gray-100 bg-white text-slate-700 hover:border-blue-200";
                      if (isChecking) {
                        if (isCorrect)
                          btnClass =
                            "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200";
                        else if (isSelected)
                          btnClass = "border-red-500 bg-red-50 text-red-700";
                        else
                          btnClass =
                            "border-gray-50 bg-gray-50 text-gray-400 opacity-50";
                      }

                      return (
                        <button
                          key={idx}
                          disabled={isChecking}
                          onClick={() => handleAnswer(idx)}
                          className={`w-full text-left p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all font-bold flex justify-between items-center gap-3 text-sm md:text-base ${btnClass}`}
                        >
                          <span className="flex-1">{opt}</span>
                          {isChecking && isCorrect && (
                            <span className="material-icons text-green-500 flex-shrink-0">
                              check_circle
                            </span>
                          )}
                          {isChecking && isSelected && !isCorrect && (
                            <span className="material-icons text-red-500 flex-shrink-0">
                              cancel
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tombol Lanjut */}
                  {isChecking && (
                    <button
                      onClick={handleNext}
                      className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4"
                    >
                      {currentQuestion + 1 === QUESTIONS.length
                        ? "LIHAT HASIL AKHIR"
                        : "PERTANYAAN SELANJUTNYA"}
                      <span className="material-icons">arrow_forward</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Tampilan Hasil Akhir - Responsif */
                <div className="text-center py-6 md:py-10">
                  <span className="material-icons text-green-500 text-7xl md:text-[100px] mb-4">
                    stars
                  </span>
                  <h2 className="text-2xl md:text-4xl font-black text-slate-900">
                    Skor Anda: {Math.round(score)}
                  </h2>
                  <p className="text-gray-500 mt-2 text-sm md:text-base">
                    Luar biasa! Anda telah menyelesaikan seluruh modul latihan.
                  </p>

                  <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-center mt-8 md:mt-10">
                    <button
                      onClick={resetQuiz}
                      className="w-full md:w-auto px-10 py-4 border-2 border-gray-200 rounded-xl md:rounded-2xl font-black text-gray-500 text-sm md:text-base hover:bg-gray-50"
                    >
                      ULANGI KUIS
                    </button>
                    <button
                      onClick={() => setStep(10)}
                      className="w-full md:w-auto px-10 py-4 bg-blue-950 text-white rounded-xl md:rounded-2xl font-black shadow-xl shadow-blue-900/20 text-sm md:text-base hover:bg-black transition-colors"
                    >
                      KLAIM SERTIFIKAT
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 10: Penutup & Sertifikat */}
        {step === 10 && (
          <section className="max-w-4xl mx-auto animate-in fade-in duration-500 px-4 pb-20">
            {!isNameSubmitted ? (
              /* --- TAHAP 1: INPUT NAMA (Optimized) --- */
              <div className="max-w-md mx-auto bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 text-center space-y-6 md:space-y-8 animate-in zoom-in duration-300">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-icons text-blue-600 text-3xl md:text-4xl">
                    edit_note
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900">
                    Satu Langkah Lagi!
                  </h2>
                  <p className="text-sm md:text-base text-slate-500 font-medium">
                    Masukkan nama lengkap Anda untuk dicantumkan di sertifikat
                    kelulusan.
                  </p>
                </div>

                <div className="relative text-left">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Contoh: Budi Setiawan"
                    className="w-full px-5 py-3 md:px-6 md:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-800 transition-all text-base md:text-lg"
                  />
                </div>

                <button
                  onClick={() =>
                    userName.trim() !== "" && setIsNameSubmitted(true)
                  }
                  disabled={userName.trim() === ""}
                  className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-sm md:text-base text-white shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
                    userName.trim() !== ""
                      ? "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  TERBITKAN SERTIFIKAT
                  <span className="material-icons text-xl">auto_awesome</span>
                </button>
              </div>
            ) : (
              /* --- TAHAP 2: TAMPILAN SERTIFIKAT (Optimized) --- */
              <div className="bg-white p-6 md:p-16 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border-[6px] md:border-[12px] border-double border-slate-50 relative overflow-hidden text-center animate-in zoom-in-95 duration-700">
                {/* Dekorasi Bingkai - Dikecilkan di mobile */}
                <div className="absolute top-0 left-0 w-16 h-16 md:w-32 md:h-32 border-t-4 border-l-4 border-orange-200 m-2 md:m-4 pointer-events-none opacity-50"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 md:w-32 md:h-32 border-b-4 border-r-4 border-orange-200 m-2 md:m-4 pointer-events-none opacity-50"></div>

                <div className="relative z-10 space-y-2">
                  <span className="material-icons text-orange-400 text-5xl md:text-6xl">
                    workspace_premium
                  </span>
                  <h2 className="text-xl md:text-4xl font-black text-slate-900 uppercase tracking-[0.1em] md:tracking-[0.3em]">
                    Sertifikat Kelulusan
                  </h2>
                  <div className="h-1 w-16 md:w-24 bg-blue-600 mx-auto rounded-full"></div>
                  <p className="text-slate-400 italic font-serif mt-3 text-sm md:text-lg">
                    Diberikan secara resmi melalui Aplikasi Mahir Bernyanyi
                  </p>
                </div>

                <div className="my-8 md:my-12 relative z-10">
                  <p className="text-slate-500 font-medium mb-2 md:mb-4 uppercase tracking-widest text-[10px] md:text-sm">
                    Dengan Bangga Diberikan Kepada:
                  </p>
                  <h3 className="text-2xl md:text-5xl font-serif font-black text-blue-900 border-b-2 border-slate-100 pb-2 md:pb-4 inline-block px-4 md:px-10 leading-tight">
                    {userName}
                  </h3>
                </div>

                <div className="max-w-2xl mx-auto mb-8 md:mb-12 relative z-10 px-2">
                  <p className="text-slate-600 leading-relaxed text-xs md:text-lg">
                    Atas dedikasi dan keberhasilan menyelesaikan seluruh
                    kurikulum
                    <span className="font-bold text-slate-800">
                      {" "}
                      Dasar Teknik Vokal Eksklusif
                    </span>
                    , mencakup penguasaan pernapasan diafragma, artikulasi
                    presisi, dan kontrol nada.
                  </p>
                </div>

                {/* Tanda Tangan & Stempel - Stacked on Mobile */}
                <div className="flex flex-col md:flex-row items-center justify-around gap-6 md:gap-8 mb-8 md:mb-12 relative z-10">
                  <div className="text-center order-2 md:order-1">
                    <p className="font-serif italic text-xl md:text-2xl text-slate-800 border-b border-slate-300 px-6">
                      Vocal Coach
                    </p>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      Instruktur Utama
                    </p>
                  </div>

                  <div className="w-20 h-20 md:w-24 md:h-24 bg-orange-100 rounded-full border-4 border-orange-400 flex items-center justify-center shadow-lg rotate-12 order-1 md:order-2">
                    <div className="text-center text-orange-600">
                      <span className="material-icons text-3xl md:text-4xl">
                        verified
                      </span>
                      <p className="text-[7px] md:text-[8px] font-black uppercase">
                        Official
                        <br />
                        Certified
                      </p>
                    </div>
                  </div>

                  <div className="text-center order-3">
                    <p className="font-bold text-slate-800 border-b border-slate-300 px-6 text-lg md:text-xl">
                      {new Date().toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      Tanggal Terbit
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-center relative z-10 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="w-full md:w-auto bg-blue-950 text-white px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-95"
                  >
                    <span className="material-icons text-base">download</span>{" "}
                    SIMPAN PDF
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full md:w-auto bg-white text-slate-500 border-2 border-slate-100 px-8 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-3 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
                  >
                    <span className="material-icons text-base">logout</span>{" "}
                    KELUAR
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="p-6 text-center text-gray-400 text-sm border-t border-gray-200 mt-auto">
        &copy; {new Date().getFullYear()} Mahir Bernyanyi - Alifa Ridho
      </footer>
    </div>
  );
}
