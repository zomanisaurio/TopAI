import { useState, useRef, useEffect } from "react";

const PRESET_VOICES = [
  { id: "aria", name: "Aria", gender: "F", style: "Neutre", emoji: "🎙️", pitch: 55, speed: 50, exaggeration: 30, accent: "Anglais US" },
  { id: "nova", name: "Nova", gender: "F", style: "Chaleureuse", emoji: "🌟", pitch: 60, speed: 45, exaggeration: 40, accent: "Français" },
  { id: "orion", name: "Orion", gender: "M", style: "Autoritaire", emoji: "🔭", pitch: 30, speed: 48, exaggeration: 25, accent: "Anglais UK" },
  { id: "luna", name: "Luna", gender: "F", style: "Douce", emoji: "🌙", pitch: 65, speed: 40, exaggeration: 20, accent: "Espagnol" },
  { id: "echo", name: "Echo", gender: "M", style: "Énergique", emoji: "⚡", pitch: 45, speed: 65, exaggeration: 60, accent: "Australien" },
  { id: "sage", name: "Sage", gender: "N", style: "Calme", emoji: "🍃", pitch: 50, speed: 38, exaggeration: 15, accent: "Canadien" },
];

const ACCENTS = ["Français", "Anglais US", "Anglais UK", "Espagnol", "Allemand", "Australien", "Canadien", "Japonais", "Brésilien"];

const Slider = ({ label, value, onChange, min = 0, max = 100, unit = "%" }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>{value}{unit}</span>
    </div>
    <div style={{ position: "relative", height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", cursor: "pointer" }}
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.round(((e.clientX - rect.left) / rect.width) * (max - min) + min);
        onChange(Math.min(max, Math.max(min, pct)));
      }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${((value - min) / (max - min)) * 100}%`, borderRadius: 99, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} />
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", margin: 0 }} />
    </div>
  </div>
);

const Glass = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 20,
    ...style
  }}>{children}</div>
);

const Tab = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "10px 22px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, letterSpacing: "0.04em",
    background: active ? "rgba(124,58,237,0.35)" : "transparent",
    color: active ? "#c4b5fd" : "rgba(255,255,255,0.4)",
    border: active ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent",
    transition: "all 0.2s"
  }}>{children}</button>
);

const WaveViz = ({ active }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 3, height: 32 }}>
    {[...Array(16)].map((_, i) => (
      <div key={i} style={{
        width: 3, borderRadius: 99,
        height: active ? `${8 + Math.random() * 24}px` : "4px",
        background: active ? `rgba(167,139,250,${0.4 + Math.random() * 0.6})` : "rgba(255,255,255,0.15)",
        transition: active ? "none" : "all 0.4s",
        animation: active ? `wave ${0.4 + Math.random() * 0.6}s ease-in-out infinite alternate` : "none",
        animationDelay: `${i * 0.05}s`
      }} />
    ))}
  </div>
);

export default function VoiceStudio() {
  const [tab, setTab] = useState("create");
  const [selectedPreset, setSelectedPreset] = useState(PRESET_VOICES[0]);
  const [voiceName, setVoiceName] = useState("Ma Voix");
  const [pitch, setPitch] = useState(50);
  const [speed, setSpeed] = useState(50);
  const [exaggeration, setExaggeration] = useState(35);
  const [accent, setAccent] = useState("Français");
  const [ttsText, setTtsText] = useState("Bonjour, je suis votre assistant vocal personnalisé.");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttsVoices, setTtsVoices] = useState([]);
  const [selectedTtsVoice, setSelectedTtsVoice] = useState(null);
  const [ttsSupported, setTtsSupported] = useState(true);
  const utteranceRef = useRef(null);
  const [audioFile, setAudioFile] = useState(null);

  useEffect(() => {
    if (!window.speechSynthesis) { setTtsSupported(false); return; }
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) { setTtsVoices(v); setSelectedTtsVoice(v[0]); }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [myVoices, setMyVoices] = useState([]);
  const [saveMsg, setSaveMsg] = useState("");
  const fileInputRef = useRef();

  const applyPreset = (preset) => {
    setSelectedPreset(preset);
    setPitch(preset.pitch);
    setSpeed(preset.speed);
    setExaggeration(preset.exaggeration);
    setAccent(preset.accent);
    setVoiceName(preset.name + " (custom)");
  };

  const handleSaveVoice = () => {
    const newVoice = { id: Date.now(), name: voiceName, pitch, speed, exaggeration, accent, base: selectedPreset.name, emoji: selectedPreset.emoji };
    setMyVoices(prev => [...prev, newVoice]);
    setSaveMsg("Voix sauvegardée !");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const handleGenerate = () => {
    if (!ttsSupported) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    if (!ttsText.trim()) return;
    window.speechSynthesis.cancel();
    setIsGenerating(true);

    const utter = new SpeechSynthesisUtterance(ttsText);
    // pitch: slider 0-100 → Web Speech 0.5–2
    utter.pitch = 0.5 + (pitch / 100) * 1.5;
    // speed: slider 0-100 → Web Speech 0.5–2
    utter.rate = 0.5 + (speed / 100) * 1.5;
    // volume: exaggeration mapped to volume 0.5–1
    utter.volume = 0.5 + (exaggeration / 100) * 0.5;
    if (selectedTtsVoice) utter.voice = selectedTtsVoice;

    utter.onstart = () => { setIsGenerating(false); setIsPlaying(true); };
    utter.onend = () => setIsPlaying(false);
    utter.onerror = () => { setIsGenerating(false); setIsPlaying(false); };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setAnalysis(null);
      setAnalysisError(null);
    }
  };

  const analyzeAudio = async () => {
    if (!audioFile) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);

    const prompt = `Tu es un expert en analyse vocale et phonétique. On t'a fourni un fichier audio nommé "${audioFile.name}" (${(audioFile.size / 1024).toFixed(1)} Ko, type: ${audioFile.type}).

Simule une analyse professionnelle détaillée de cette voix et génère un rapport JSON structuré UNIQUEMENT (sans markdown, sans backticks).

Le JSON doit avoir exactement cette structure:
{
  "hauteur": { "valeur": <nombre Hz entre 80-350>, "note": "<description courte>", "score": <0-100> },
  "vitesse": { "valeur": <nombre mots/min entre 80-200>, "note": "<description courte>", "score": <0-100> },
  "emotion": { "principale": "<emotion dominante>", "secondaire": "<emotion secondaire>", "intensite": <0-100>, "note": "<description>"},
  "accent": { "langue": "<langue détectée>", "region": "<région ou variante>", "confiance": <0-100>, "note": "<description>"},
  "rythme": { "regularite": <0-100>, "pauses": "<description>", "note": "<description>"},
  "profil_global": "<résumé en 1-2 phrases de la voix>",
  "parametres_suggeres": { "pitch": <0-100>, "speed": <0-100>, "exaggeration": <0-100>, "accent": "<accent suggéré parmi: Français, Anglais US, Anglais UK, Espagnol, Allemand, Australien, Canadien, Japonais, Brésilien>" }
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      const raw = data.content.map(b => b.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAnalysis(parsed);
    } catch (err) {
      setAnalysisError("Erreur lors de l'analyse. Réessaie.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAnalysisToVoice = () => {
    if (!analysis?.parametres_suggeres) return;
    const p = analysis.parametres_suggeres;
    setPitch(p.pitch); setSpeed(p.speed); setExaggeration(p.exaggeration); setAccent(p.accent);
    setVoiceName("Voix analysée");
    setTab("create");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #0a0412 0%, #0d0820 40%, #070b1a 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#fff", padding: "0 0 60px"
    }}>
      <style>{`
        @keyframes wave { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.3);border-radius:99px}
        input[type=range]{-webkit-appearance:none;appearance:none;background:transparent}
        textarea:focus,input:focus{outline:none}
      `}</style>

      {/* Header */}
      <div style={{ padding: "32px 32px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 12px #a78bfa" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Voice Studio</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", background: "linear-gradient(90deg, #fff 40%, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            VoxCraft
          </h1>
        </div>
        <Glass style={{ padding: "8px 16px", display: "flex", gap: 6 }}>
          <Tab active={tab === "create"} onClick={() => setTab("create")}>✦ Créer</Tab>
          <Tab active={tab === "analyze"} onClick={() => setTab("analyze")}>◈ Analyser</Tab>
          <Tab active={tab === "library"} onClick={() => setTab("library")}>⊞ Bibliothèque</Tab>
        </Glass>
      </div>

      <div style={{ padding: "24px 32px 0" }}>

        {/* ─── TAB CREATE ─── */}
        {tab === "create" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, animation: "fadeIn 0.3s ease" }}>

            {/* Left: Presets + params */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Glass style={{ padding: 22 }}>
                <p style={{ margin: "0 0 14px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Voix de base</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {PRESET_VOICES.map(v => (
                    <div key={v.id} onClick={() => applyPreset(v)} style={{
                      padding: "12px 10px", borderRadius: 14, cursor: "pointer", textAlign: "center",
                      background: selectedPreset.id === v.id ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedPreset.id === v.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.07)"}`,
                      transition: "all 0.2s"
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{v.emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{v.style}</div>
                    </div>
                  ))}
                </div>
              </Glass>

              <Glass style={{ padding: 22 }}>
                <p style={{ margin: "0 0 16px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Paramètres</p>
                <Slider label="Hauteur (Pitch)" value={pitch} onChange={setPitch} />
                <Slider label="Vitesse" value={speed} onChange={setSpeed} />
                <Slider label="Exagération" value={exaggeration} onChange={setExaggeration} />
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Accent</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ACCENTS.map(a => (
                      <span key={a} onClick={() => setAccent(a)} style={{
                        padding: "5px 12px", borderRadius: 99, fontSize: 12, cursor: "pointer",
                        background: accent === a ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${accent === a ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: accent === a ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                        transition: "all 0.15s"
                      }}>{a}</span>
                    ))}
                  </div>
                </div>
              </Glass>
            </div>

            {/* Right: TTS + save */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Glass style={{ padding: 22 }}>
                <p style={{ margin: "0 0 14px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Nom de la voix</p>
                <input value={voiceName} onChange={e => setVoiceName(e.target.value)} style={{
                  width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 15, fontWeight: 600, boxSizing: "border-box"
                }} />
              </Glass>

              <Glass style={{ padding: 22, flex: 1 }}>
                <p style={{ margin: "0 0 14px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Texte à synthétiser</p>
                <textarea value={ttsText} onChange={e => setTtsText(e.target.value)} rows={5} style={{
                  width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14, padding: "14px", color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6,
                  resize: "none", boxSizing: "border-box", fontFamily: "inherit"
                }} />

                <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <WaveViz active={isPlaying} />
                  <button onClick={handleGenerate} disabled={isGenerating} style={{
                    padding: "11px 26px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                    background: isGenerating ? "rgba(124,58,237,0.3)" : isPlaying ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #7c3aed, #a78bfa)",
                    color: "#fff", letterSpacing: "0.04em",
                    boxShadow: isGenerating || isPlaying ? "none" : "0 4px 20px rgba(124,58,237,0.4)",
                    transition: "all 0.2s"
                  }}>
                    {isGenerating ? "⟳ Chargement..." : isPlaying ? "⏹ Arrêter" : "▶ Lire"}
                  </button>
                </div>

                {!ttsSupported && (
                  <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#f87171" }}>
                    ⚠️ Web Speech API non supportée sur ce navigateur
                  </div>
                )}

                {ttsVoices.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>Voix système</div>
                    <select value={selectedTtsVoice?.name || ""} onChange={e => setSelectedTtsVoice(ttsVoices.find(v => v.name === e.target.value))} style={{
                      width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, padding: "9px 12px", color: "#fff", fontSize: 13, cursor: "pointer"
                    }}>
                      {ttsVoices.map(v => (
                        <option key={v.name} value={v.name} style={{ background: "#1a0a2e" }}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                  </div>
                )}

                {isPlaying && (
                  <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.2)", fontSize: 12, color: "#c4b5fd", animation: "pulse 2s infinite" }}>
                    🎵 Lecture — {voiceName} · Pitch {(0.5 + (pitch / 100) * 1.5).toFixed(2)} · Vitesse ×{(0.5 + (speed / 100) * 1.5).toFixed(1)}
                  </div>
                )}
              </Glass>

              <button onClick={handleSaveVoice} style={{
                padding: "13px", borderRadius: 14, border: "1px solid rgba(167,139,250,0.25)", cursor: "pointer",
                background: "rgba(124,58,237,0.12)", color: "#a78bfa", fontWeight: 600, fontSize: 14, letterSpacing: "0.04em",
                transition: "all 0.2s"
              }}>
                {saveMsg || "＋ Sauvegarder cette voix"}
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB ANALYZE ─── */}
        {tab === "analyze" && (
          <div style={{ maxWidth: 720, margin: "0 auto", animation: "fadeIn 0.3s ease" }}>
            <Glass style={{ padding: 28, marginBottom: 20 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Importer un clip audio</p>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Analyse IA : hauteur, vitesse, émotion, accent, rythme</p>

              <div onClick={() => fileInputRef.current?.click()} style={{
                border: "2px dashed rgba(167,139,250,0.25)", borderRadius: 16, padding: "36px 24px",
                textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                background: audioFile ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)"
              }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{audioFile ? "🎵" : "📁"}</div>
                <div style={{ fontSize: 14, color: audioFile ? "#c4b5fd" : "rgba(255,255,255,0.35)", fontWeight: audioFile ? 600 : 400 }}>
                  {audioFile ? audioFile.name : "Clique ou dépose un fichier audio"}
                </div>
                {audioFile && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{(audioFile.size / 1024).toFixed(1)} Ko · {audioFile.type || "audio"}</div>}
                {!audioFile && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>MP3, WAV, M4A, OGG</div>}
              </div>
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: "none" }} />

              {audioFile && (
                <button onClick={analyzeAudio} disabled={isAnalyzing} style={{
                  width: "100%", marginTop: 16, padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
                  background: isAnalyzing ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #a78bfa)",
                  color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "0.05em",
                  boxShadow: isAnalyzing ? "none" : "0 6px 24px rgba(124,58,237,0.35)"
                }}>
                  {isAnalyzing ? (
                    <span>
                      <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 8 }}>◌</span>
                      Analyse en cours...
                    </span>
                  ) : "◈ Analyser avec l'IA"}
                </button>
              )}
              {analysisError && <div style={{ marginTop: 12, color: "#f87171", fontSize: 13, textAlign: "center" }}>{analysisError}</div>}
            </Glass>

            {analysis && (
              <div style={{ animation: "fadeIn 0.4s ease" }}>
                {/* Global */}
                <Glass style={{ padding: 22, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Profil global</div>
                  <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{analysis.profil_global}</p>
                </Glass>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  {/* Hauteur */}
                  <Glass style={{ padding: 18 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>🎵 Hauteur / Tonalité</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#a78bfa" }}>{analysis.hauteur.valeur} <span style={{ fontSize: 13, fontWeight: 400 }}>Hz</span></div>
                    <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.08)", margin: "10px 0 8px" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", width: `${analysis.hauteur.score}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{analysis.hauteur.note}</div>
                  </Glass>

                  {/* Vitesse */}
                  <Glass style={{ padding: 18 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>⚡ Vitesse & Rythme</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#a78bfa" }}>{analysis.vitesse.valeur} <span style={{ fontSize: 13, fontWeight: 400 }}>mots/min</span></div>
                    <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.08)", margin: "10px 0 8px" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", width: `${analysis.vitesse.score}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{analysis.rythme.note}</div>
                  </Glass>

                  {/* Émotion */}
                  <Glass style={{ padding: 18 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>💭 Émotion</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa" }}>{analysis.emotion.principale}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>+ {analysis.emotion.secondaire}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.08)", margin: "0 0 8px" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #ec4899, #a78bfa)", width: `${analysis.emotion.intensite}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{analysis.emotion.note}</div>
                  </Glass>

                  {/* Accent */}
                  <Glass style={{ padding: 18 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>🌍 Accent / Langue</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>{analysis.accent.langue}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{analysis.accent.region}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.08)" }}>
                        <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #06b6d4, #a78bfa)", width: `${analysis.accent.confiance}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{analysis.accent.confiance}%</span>
                    </div>
                  </Glass>
                </div>

                <button onClick={applyAnalysisToVoice} style={{
                  width: "100%", padding: "15px", borderRadius: 14, border: "1px solid rgba(167,139,250,0.3)",
                  cursor: "pointer", background: "rgba(124,58,237,0.15)", color: "#c4b5fd",
                  fontWeight: 700, fontSize: 14, letterSpacing: "0.05em"
                }}>
                  ✦ Créer une voix depuis cette analyse →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB LIBRARY ─── */}
        {tab === "library" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <p style={{ margin: "0 0 20px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Voix présets</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
              {PRESET_VOICES.map(v => (
                <Glass key={v.id} style={{ padding: 20, cursor: "pointer" }} onClick={() => { applyPreset(v); setTab("create"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{v.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{v.style} · {v.accent}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[["Pitch", v.pitch], ["Speed", v.speed], ["Expr.", v.exaggeration]].map(([lbl, val]) => (
                      <div key={lbl} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#a78bfa" }}>{val}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, padding: "7px 12px", borderRadius: 8, background: "rgba(124,58,237,0.12)", textAlign: "center", fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>
                    Utiliser comme base →
                  </div>
                </Glass>
              ))}
            </div>

            {myVoices.length > 0 && (
              <>
                <p style={{ margin: "0 0 16px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Mes voix ({myVoices.length})</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {myVoices.map(v => (
                    <Glass key={v.id} style={{ padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{v.emoji}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Basée sur {v.base}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                        Pitch {v.pitch}% · ×{(v.speed / 50).toFixed(1)} · {v.accent}
                      </div>
                    </Glass>
                  ))}
                </div>
              </>
            )}
            {myVoices.length === 0 && (
              <Glass style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎙️</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Aucune voix sauvegardée — crée-en une dans l'onglet Créer !</div>
              </Glass>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
