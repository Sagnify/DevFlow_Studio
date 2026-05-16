import React, { useState, useEffect, useRef } from "react";
import { Sparkles, User, Key, Code2, ChevronRight, Check, Settings, Eye, Database, Globe } from "lucide-react";
import { AnimatedBackground, GradientOrb } from "./Backgrounds";

const STORAGE_KEY = "devflow_setup_complete";

const steps = [
  { id: 1, title: "Welcome", subtitle: "Let's set up your IDE", icon: Sparkles },
  { id: 2, title: "Your Name", subtitle: "What should we call you?", icon: User },
  { id: 3, title: "Ready!", subtitle: "You're all set", icon: Check },
];

export default function SetupScreen({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: "",
  });
  const [animate, setAnimate] = useState(true);
  const [errors, setErrors] = useState({});

  // Check for existing config on mount
  useEffect(() => {
    const loadExistingConfig = async () => {
      // Try to load from electron config first
      if (window.electronAPI?.readConfig) {
        const existingConfig = window.electronAPI.readConfig();
        if (existingConfig?.fullName) {
          setFormData(f => ({ ...f, fullName: existingConfig.fullName }));
        }
        // If API key exists, skip that step automatically
        if (existingConfig?.apiKey) {
          setCurrentStep(2); // Skip to ready
        }
      }
    };
    loadExistingConfig();
  }, []);

  const handleNext = () => {
    if (currentStep === 1 && !formData.fullName.trim()) {
      setErrors({ fullName: "Please enter your name" });
      return;
    }

    if (currentStep < steps.length - 1) {
      setAnimate(false);
      setTimeout(() => {
        setCurrentStep(c => c + 1);
        setAnimate(true);
        setErrors({});
      }, 200);
    } else {
      // Save settings - only save fullName, not apiKey (already handled separately)
      const config = {
        setupComplete: true,
        fullName: formData.fullName,
        setupDate: Date.now(),
      };
      localStorage.setItem("devflow_config", JSON.stringify(config));
      if (window.electronAPI?.saveConfig) {
        window.electronAPI.saveConfig(config);
      }
      onComplete();
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setAnimate(false);
      setTimeout(() => {
        setCurrentStep(c => c + 1);
        setAnimate(true);
        setErrors({});
      }, 200);
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div style={styles.wrapper}>
      <AnimatedBackground />
      <GradientOrb style={{ top: "-20%", left: "-10%", width: 600, height: 600 }} />
      <GradientOrb style={{ bottom: "-30%", right: "-15%", width: 700, height: 700 }} />

      <div style={styles.container}>
        {/* Progress indicator */}
        <div style={styles.progressContainer}>
          {steps.map((step, idx) => (
            <div key={step.id} style={styles.progressItem}>
              <div style={{
                ...styles.progressDot,
                background: idx < currentStep ? "#7c3aed" : idx === currentStep ? "#7c3aed" : "#2e303a",
                boxShadow: idx === currentStep ? "0 0 12px rgba(124, 58, 237, 0.5)" : "none",
              }}>
                {idx < currentStep ? <Check size={12} color="#fff" /> : <span style={{ color: idx === currentStep ? "#fff" : "#4b5563", fontSize: 10 }}>{step.id}</span>}
              </div>
              {idx < steps.length - 1 && (
                <div style={{
                  ...styles.progressLine,
                  background: idx < currentStep ? "#7c3aed" : "#2e303a",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          ...styles.card,
          opacity: animate ? 1 : 0,
          transform: animate ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.3s ease",
        }}>
          <div style={styles.iconWrapper}>
            <StepIcon size={32} color="#7c3aed" strokeWidth={1.5} />
          </div>
          <h1 style={styles.title}>{steps[currentStep].title}</h1>
          <p style={styles.subtitle}>{steps[currentStep].subtitle}</p>

          {/* Step content */}
          <div style={styles.content}>
            {currentStep === 1 && (
              <div style={styles.inputGroup}>
                <input
                  style={{ ...styles.input, borderColor: errors.fullName ? "#f87171" : "#2e303a" }}
                  placeholder="Enter your name"
                  value={formData.fullName}
                  onChange={(e) => { setFormData(f => ({ ...f, fullName: e.target.value })); setErrors({}); }}
                  autoFocus
                />
                {errors.fullName && <p style={styles.error}>{errors.fullName}</p>}
                <p style={styles.hint}>This will be saved to your system for future sessions.</p>
              </div>
            )}

            {currentStep === 2 && (
              <div style={styles.prefsGrid}>
                <div style={styles.prefSection}>
                  <label style={styles.prefLabel}>
                    <Globe size={14} style={{ marginRight: 6 }} /> Default Framework
                  </label>
                  <div style={styles.optionGroup}>
                    {["Flask", "FastAPI", "Django"].map(fw => (
                      <button
                        key={fw}
                        style={{
                          ...styles.optionBtn,
                          background: formData.defaultFramework === fw ? "#7c3aed22" : "#0f1117",
                          borderColor: formData.defaultFramework === fw ? "#7c3aed" : "#2e303a",
                        }}
                        onClick={() => setFormData(f => ({ ...f, defaultFramework: fw }))}
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={styles.prefSection}>
                  <label style={styles.prefLabel}>
                    <Database size={14} style={{ marginRight: 6 }} /> Default Database
                  </label>
                  <div style={styles.optionGroup}>
                    {["sqlite", "postgresql", "mysql"].map(db => (
                      <button
                        key={db}
                        style={{
                          ...styles.optionBtn,
                          background: formData.defaultDb === db ? "#7c3aed22" : "#0f1117",
                          borderColor: formData.defaultDb === db ? "#7c3aed" : "#2e303a",
                        }}
                        onClick={() => setFormData(f => ({ ...f, defaultDb: db }))}
                      >
                        {db}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div style={styles.successBox}>
                <div style={styles.successIcon}>
                  <Check size={40} color="#34d399" strokeWidth={2} />
                </div>
                <h3 style={styles.successTitle}>Setup Complete!</h3>
                <p style={styles.successText}>
                  You're ready to create your first project. The IDE is configured and ready to go.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button style={styles.nextBtn} onClick={handleNext}>
              {currentStep === steps.length - 1 ? "Launch DevFlow Studio" : "Continue"}
              <ChevronRight size={16} style={{ marginLeft: 6 }} />
            </button>
          </div>
        </div>

        <p style={styles.footer}>
          DevFlow Studio v1.0 • Visual Development Environment
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100vw", height: "100vh",
    background: "#0f1117",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  container: {
    position: "relative", zIndex: 1,
    display: "flex", flexDirection: "column", alignItems: "center",
    width: "100%", maxWidth: 520,
  },
  progressContainer: {
    display: "flex", alignItems: "center", marginBottom: 32,
  },
  progressItem: {
    display: "flex", alignItems: "center",
  },
  progressDot: {
    width: 28, height: 28, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.3s ease",
  },
  progressLine: {
    width: 40, height: 2, margin: "0 4px",
    transition: "all 0.3s ease",
  },
  card: {
    background: "#1a1d27",
    border: "1px solid #2e303a",
    borderRadius: 20,
    padding: "40px 48px",
    width: "100%",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124, 58, 237, 0.1)",
  },
  iconWrapper: {
    width: 64, height: 64, borderRadius: 16,
    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(37, 99, 235, 0.1))",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    margin: "0 0 8px", fontSize: 28, fontWeight: 600,
    color: "#f3f4f6", textAlign: "center", letterSpacing: -0.5,
  },
  subtitle: {
    margin: "0 0 32px", fontSize: 15, color: "#6b7280", textAlign: "center",
  },
  content: {
    minHeight: 120, marginBottom: 32,
  },
  inputGroup: {
    display: "flex", flexDirection: "column", gap: 8,
  },
  inputDesc: {
    fontSize: 13, color: "#6b7280", marginBottom: 12, lineHeight: 1.5,
  },
  input: {
    padding: "14px 18px", borderRadius: 10,
    border: "1px solid #2e303a", background: "#0f1117",
    color: "#f3f4f6", fontSize: 15, outline: "none",
    width: "100%", boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  error: {
    fontSize: 12, color: "#f87171", margin: 0,
  },
  hint: {
    fontSize: 12, color: "#4b5563", margin: "8px 0 0",
  },
  prefsGrid: {
    display: "flex", flexDirection: "column", gap: 20,
  },
  prefSection: {
    display: "flex", flexDirection: "column", gap: 10,
  },
  prefLabel: {
    fontSize: 13, color: "#9ca3af", display: "flex", alignItems: "center",
  },
  optionGroup: {
    display: "flex", gap: 8,
  },
  optionBtn: {
    flex: 1, padding: "10px 14px", borderRadius: 8,
    border: "1px solid #2e303a", background: "#0f1117",
    color: "#f3f4f6", fontSize: 13, cursor: "pointer",
    transition: "all 0.2s",
  },
  successBox: {
    textAlign: "center", padding: "20px 0",
  },
  successIcon: {
    width: 80, height: 80, borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(52, 211, 153, 0.1))",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  successTitle: {
    margin: "0 0 8px", fontSize: 22, fontWeight: 600, color: "#f3f4f6",
  },
  successText: {
    margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.6,
  },
  actions: {
    display: "flex", gap: 12, justifyContent: "center",
  },
  nextBtn: {
    padding: "12px 24px", borderRadius: 10,
    border: "none", background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center",
    boxShadow: "0 4px 16px rgba(124, 58, 237, 0.3)",
    transition: "all 0.2s",
  },
  skipBtn: {
    padding: "12px 20px", borderRadius: 10,
    border: "1px solid #2e303a", background: "transparent",
    color: "#6b7280", fontSize: 14, cursor: "pointer",
    transition: "all 0.2s",
  },
  footer: {
    marginTop: 24, fontSize: 12, color: "#374151",
  },
};