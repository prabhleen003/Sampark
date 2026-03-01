import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

const C = {
  navy: '#0A0F2C',
  navyDeep: '#07091E',
  slate: '#1E293B',
  panel: '#111834',
  teal: '#00E5A0',
  accent: '#67B7FF',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: 'rgba(148,163,184,0.12)',
  borderTeal: 'rgba(0,229,160,0.25)',
  danger: '#FF3B5C',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
const STEPS = ['Plate Number', 'Documents', 'Review'];

function FileDropzone({ label, file, onChange }) {
  const preview = file ? URL.createObjectURL(file) : null;
  const isPdf = file?.type === 'application/pdf';

  return (
    <div>
      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textSecondary, marginBottom: '6px', fontFamily: font.body }}>{label}</p>
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: `2px dashed ${file ? C.borderTeal : C.border}`,
        borderRadius: '12px', backgroundColor: file ? 'rgba(0,229,160,0.03)' : 'rgba(255,255,255,0.03)',
        padding: '16px', cursor: 'pointer', minHeight: '80px', transition: 'all 0.3s',
      }}>
        {preview && !isPdf && <img src={preview} alt="preview" style={{ maxHeight: '96px', borderRadius: '8px', objectFit: 'cover' }} />}
        {preview && isPdf && <p style={{ color: C.teal, fontSize: '0.85rem', fontWeight: 600, margin: 0, fontFamily: font.mono }}>📄 {file.name}</p>}
        {!preview && (
          <>
            <span style={{ fontSize: '1.5rem', color: C.textSecondary }}>+</span>
            <span style={{ fontSize: '0.78rem', color: C.textSecondary, marginTop: '4px' }}>JPEG, PNG or PDF · max 5MB</span>
          </>
        )}
        <input type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: 'none' }} onChange={(e) => onChange(e.target.files[0] || null)} />
      </label>
    </div>
  );
}

export default function RegisterVehicle({ resubmit }) {
  const { vehicleId } = useParams();
  const [step, setStep] = useState(resubmit ? 1 : 0);
  const [plate, setPlate] = useState('');
  const [plateValid, setPlateValid] = useState(resubmit ? true : null);
  const [rcDoc, setRcDoc] = useState(null);
  const [dlDoc, setDlDoc] = useState(null);
  const [platePhoto, setPlatePhoto] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [digilockerUrl, setDigilockerUrl] = useState(null);
  const [reviewMessage, setReviewMessage] = useState(null);

  const progressRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (resubmit && vehicleId) {
      api.get(`/vehicles/${vehicleId}`).then(r => {
        const p = r.data.vehicle.plate_number;
        setPlate(p);
        setPlateValid(PLATE_REGEX.test(p));
      }).catch(() => navigate('/dashboard'));
    }
  }, [resubmit, vehicleId, navigate]);

  function validatePlate(value) {
    const upper = value.toUpperCase();
    setPlate(upper);
    setPlateValid(upper.length > 0 ? PLATE_REGEX.test(upper) : null);
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('rc_doc', rcDoc);
      form.append('dl_doc', dlDoc);
      form.append('plate_photo', platePhoto);
      if (!resubmit) form.append('plate_number', plate);

      let data;
      if (resubmit) {
        const res = await api.put(`/vehicles/${vehicleId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        data = res.data;
      } else {
        const res = await api.post('/vehicles', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        data = res.data;
      }

      if (data.next_step === 'digilocker') {
        setDigilockerUrl(data.auth_url);
        setLoading(false);
        return;
      }
      if (data.next_step === 'manual_review') {
        setReviewMessage(data.message || 'Your documents are under manual review.');
        setLoading(false);
        return;
      }
      // next_step === 'payment' or resubmit success
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
      setLoading(false);
    }
  }

  const canNext0 = plateValid;
  const canNext1 = rcDoc && dlDoc && platePhoto;

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: C.navy,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', position: 'relative', overflow: 'hidden', fontFamily: font.body,
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '480px',
          backgroundColor: 'rgba(17,24,52,0.8)',
          backdropFilter: 'blur(30px)',
          borderRadius: '28px', padding: '40px 36px',
          border: `1px solid ${C.borderTeal}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
        }}
      >
        {resubmit && (
          <div style={{
            backgroundColor: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.25)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '1.25rem',
          }}>
            <p style={{ color: '#FCD34D', fontSize: '0.82rem', margin: 0, fontWeight: 600, fontFamily: font.body }}>
              Re-uploading documents for <span style={{ fontFamily: font.mono }}>{plate}</span>
            </p>
          </div>
        )}

        {/* Progress — hide after final state */}
        {!digilockerUrl && !reviewMessage && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              {STEPS.map((s, i) => (
                <span key={s} style={{
                  fontSize: '0.78rem', fontWeight: 600, fontFamily: font.body,
                  color: i === step ? C.teal : i < step ? C.textSecondary : 'rgba(148,163,184,0.4)',
                }}>{s}</span>
              ))}
            </div>
            <div style={{ height: '4px', backgroundColor: C.slate, borderRadius: '999px', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ height: '4px', backgroundColor: C.teal, borderRadius: '999px' }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.25)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '1rem',
          }}>
            <p style={{ color: C.danger, fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* DigiLocker prompt */}
        {digilockerUrl && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔐</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: C.textPrimary, margin: '0 0 8px', fontFamily: font.heading }}>Verify with DigiLocker</h2>
            <p style={{ fontSize: '0.85rem', color: C.textSecondary, margin: '0 0 20px', lineHeight: 1.5 }}>
              Your documents were uploaded. To verify your vehicle, connect your DigiLocker account — it only takes a moment.
            </p>
            <a href={digilockerUrl} style={{
              display: 'block', border: 'none', borderRadius: '12px', padding: '14px',
              backgroundColor: C.teal, color: C.navyDeep, fontWeight: 700, fontSize: '0.95rem',
              fontFamily: font.body, textDecoration: 'none', cursor: 'pointer',
            }}>
              Open DigiLocker
            </a>
            <button onClick={() => navigate('/dashboard')} style={{
              marginTop: '12px', background: 'none', border: 'none', color: C.textSecondary,
              fontSize: '0.85rem', cursor: 'pointer', fontFamily: font.body,
            }}>
              Do this later from dashboard
            </button>
          </div>
        )}

        {/* Manual review notice */}
        {reviewMessage && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: C.textPrimary, margin: '0 0 8px', fontFamily: font.heading }}>Under Manual Review</h2>
            <p style={{ fontSize: '0.85rem', color: C.textSecondary, margin: '0 0 20px', lineHeight: 1.5 }}>
              {reviewMessage}
            </p>
            <p style={{ fontSize: '0.8rem', color: C.textSecondary, margin: '0 0 20px' }}>
              Our team will review your documents shortly. You'll receive a notification once it's resolved.
            </p>
            <button onClick={() => navigate('/dashboard')} style={{
              width: '100%', border: 'none', borderRadius: '12px', padding: '14px',
              backgroundColor: C.teal, color: C.navyDeep, fontWeight: 700, fontSize: '0.95rem',
              fontFamily: font.body, cursor: 'pointer',
            }}>
              Back to Dashboard
            </button>
          </div>
        )}

        {!digilockerUrl && !reviewMessage && <AnimatePresence mode="wait">
          {/* Step 0 */}
          {step === 0 && !resubmit && (
            <motion.div key="step0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: C.textPrimary, margin: '0 0 4px', fontFamily: font.heading }}>Enter plate number</h2>
                <p style={{ fontSize: '0.85rem', color: C.textSecondary, margin: 0 }}>Format: MH01AB1234</p>
              </div>
              <div>
                <input
                  type="text" maxLength={10} value={plate}
                  onChange={(e) => validatePlate(e.target.value)}
                  placeholder="MH01AB1234" autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: `2px solid ${plateValid === true ? C.teal : plateValid === false ? C.danger : C.border}`,
                    borderRadius: '12px', padding: '14px', fontSize: '1.1rem',
                    fontFamily: font.mono, textAlign: 'center', letterSpacing: '0.15em',
                    color: C.textPrimary, outline: 'none', textTransform: 'uppercase',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    transition: 'border-color 0.3s',
                  }}
                />
                {plateValid === false && <p style={{ color: C.danger, fontSize: '0.78rem', marginTop: '6px' }}>Invalid format. Example: MH01AB1234</p>}
                {plateValid === true && <p style={{ color: C.teal, fontSize: '0.78rem', marginTop: '6px' }}>Looks good!</p>}
              </div>
              <button onClick={() => setStep(1)} disabled={!canNext0} style={{
                border: 'none', borderRadius: '12px', padding: '14px', fontSize: '0.95rem', fontWeight: 700, cursor: canNext0 ? 'pointer' : 'not-allowed',
                backgroundColor: canNext0 ? C.teal : 'rgba(0,229,160,0.2)',
                color: canNext0 ? C.navyDeep : 'rgba(0,229,160,0.5)',
                fontFamily: font.body, transition: 'all 0.3s',
              }}>Next</button>
            </motion.div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: C.textPrimary, margin: '0 0 4px', fontFamily: font.heading }}>Upload documents</h2>
                <p style={{ fontSize: '0.85rem', color: C.textSecondary, margin: 0 }}>All three documents are required.</p>
              </div>
              <FileDropzone label="Registration Certificate (RC)" file={rcDoc} onChange={setRcDoc} />
              <FileDropzone label="Driving Licence (DL)" file={dlDoc} onChange={setDlDoc} />
              <FileDropzone label="Plate Photo" file={platePhoto} onChange={setPlatePhoto} />
              <div style={{ display: 'flex', gap: '10px' }}>
                {!resubmit && (
                  <button onClick={() => setStep(0)} style={{
                    flex: 1, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px',
                    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'transparent',
                    color: C.textSecondary, fontFamily: font.body,
                  }}>Back</button>
                )}
                <button onClick={() => setStep(2)} disabled={!canNext1} style={{
                  flex: resubmit ? undefined : 1, border: 'none', borderRadius: '12px', padding: '12px',
                  fontSize: '0.95rem', fontWeight: 700, cursor: canNext1 ? 'pointer' : 'not-allowed',
                  backgroundColor: canNext1 ? C.teal : 'rgba(0,229,160,0.2)',
                  color: canNext1 ? C.navyDeep : 'rgba(0,229,160,0.5)',
                  fontFamily: font.body,
                }}>Next</button>
              </div>
            </motion.div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: C.textPrimary, margin: '0 0 4px', fontFamily: font.heading }}>Review & submit</h2>
                <p style={{ fontSize: '0.85rem', color: C.textSecondary, margin: 0 }}>Check everything before submitting.</p>
              </div>
              <div style={{
                backgroundColor: C.slate, border: `1px solid ${C.border}`,
                borderRadius: '12px', padding: '14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: C.textSecondary, fontWeight: 500 }}>Plate Number</span>
                  <span style={{ fontFamily: font.mono, fontWeight: 700, color: C.teal }}>{plate}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[['RC', rcDoc], ['DL', dlDoc], ['Plate', platePhoto]].map(([lbl, f]) => (
                    <div key={lbl} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: C.textSecondary, marginBottom: '4px' }}>{lbl}</p>
                      {f?.type !== 'application/pdf'
                        ? <img src={URL.createObjectURL(f)} alt={lbl} style={{ height: '60px', width: '100%', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${C.border}` }} />
                        : <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel, borderRadius: '8px', fontSize: '0.78rem', color: C.teal, fontWeight: 600, fontFamily: font.mono }}>PDF</div>
                      }
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px',
                  fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'transparent',
                  color: C.textSecondary, fontFamily: font.body,
                }}>Back</button>
                <button onClick={handleSubmit} disabled={loading} style={{
                  flex: 1, border: 'none', borderRadius: '12px', padding: '12px',
                  fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor: loading ? 'rgba(0,229,160,0.2)' : C.teal,
                  color: loading ? 'rgba(0,229,160,0.5)' : C.navyDeep,
                  fontFamily: font.body,
                }}>
                  {loading ? 'Submitting…' : resubmit ? 'Resubmit for Verification' : 'Submit for Verification'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>}
      </motion.div>
    </div>
  );
}
