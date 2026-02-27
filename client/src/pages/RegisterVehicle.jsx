import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import gsap from 'gsap';
import api from '../api/axios';

const PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
const STEPS = ['Plate Number', 'Documents', 'Review'];

function FileDropzone({ label, file, onChange }) {
  const preview = file ? URL.createObjectURL(file) : null;
  const isPdf   = file?.type === 'application/pdf';

  return (
    <div>
      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>{label}</p>
      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #D1D5DB', borderRadius: '10px', backgroundColor: '#F9FAFB', padding: '16px', cursor: 'pointer', minHeight: '80px', transition: 'border-color 0.2s' }}>
        {preview && !isPdf && <img src={preview} alt="preview" style={{ maxHeight: '96px', borderRadius: '8px', objectFit: 'cover' }} />}
        {preview && isPdf && <p style={{ color: '#4F46E5', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>📄 {file.name}</p>}
        {!preview && (
          <>
            <span style={{ fontSize: '1.5rem', color: '#9CA3AF' }}>+</span>
            <span style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '4px' }}>JPEG, PNG or PDF · max 5MB</span>
          </>
        )}
        <input type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: 'none' }} onChange={(e) => onChange(e.target.files[0] || null)} />
      </label>
    </div>
  );
}

// resubmit=true → skip step 0, use PUT /vehicles/:vehicleId
export default function RegisterVehicle({ resubmit }) {
  const { vehicleId } = useParams();

  const [step, setStep]             = useState(resubmit ? 1 : 0);
  const [plate, setPlate]           = useState('');
  const [plateValid, setPlateValid] = useState(resubmit ? true : null);
  const [rcDoc, setRcDoc]           = useState(null);
  const [dlDoc, setDlDoc]           = useState(null);
  const [platePhoto, setPlatePhoto] = useState(null);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const stepRef     = useRef(null);
  const progressRef = useRef(null);
  const navigate    = useNavigate();

  // When resubmitting, load the plate number from the server
  useEffect(() => {
    if (resubmit && vehicleId) {
      api.get(`/vehicles/${vehicleId}`).then(r => {
        const p = r.data.vehicle.plate_number;
        setPlate(p);
        setPlateValid(PLATE_REGEX.test(p));
      }).catch(() => navigate('/dashboard'));
    }
  }, [resubmit, vehicleId, navigate]);

  useEffect(() => {
    gsap.from(stepRef.current, { y: 24, duration: 0.5, ease: 'power2.out' });
  }, []);

  useEffect(() => {
    gsap.to(progressRef.current, { width: `${((step + 1) / STEPS.length) * 100}%`, duration: 0.4, ease: 'power2.out' });
  }, [step]);

  function validatePlate(value) {
    const upper = value.toUpperCase();
    setPlate(upper);
    setPlateValid(upper.length > 0 ? PLATE_REGEX.test(upper) : null);
  }

  function slideToStep(next) {
    const dir = next > step ? -60 : 60;
    gsap.to(stepRef.current, {
      x: dir, opacity: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        setStep(next);
        gsap.fromTo(stepRef.current, { x: -dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      },
    });
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('rc_doc',      rcDoc);
      form.append('dl_doc',      dlDoc);
      form.append('plate_photo', platePhoto);
      if (!resubmit) form.append('plate_number', plate);

      if (resubmit) {
        await api.put(`/vehicles/${vehicleId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/vehicles', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      gsap.to(stepRef.current, {
        y: -20, opacity: 0, duration: 0.4, ease: 'power2.in',
        onComplete: () => navigate('/dashboard'),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
      setLoading(false);
    }
  }

  const btnBase      = { border: 'none', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' };
  const btnPrimary   = { ...btnBase, backgroundColor: '#4F46E5', color: '#fff' };
  const btnSecondary = { ...btnBase, backgroundColor: '#fff', color: '#374151', border: '1px solid #D1D5DB' };
  const btnDisabled  = { ...btnBase, backgroundColor: '#C7D2FE', color: '#fff', cursor: 'not-allowed' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>

        {resubmit && (
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.2rem' }}>
            <p style={{ color: '#92400E', fontSize: '0.82rem', margin: 0, fontWeight: 600 }}>
              Re-uploading documents for <span style={{ fontFamily: 'monospace' }}>{plate}</span>
            </p>
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {STEPS.map((s, i) => (
              <span key={s} style={{ fontSize: '0.78rem', fontWeight: 600, color: i === step ? '#4F46E5' : i < step ? '#9CA3AF' : '#D1D5DB' }}>{s}</span>
            ))}
          </div>
          <div style={{ height: '6px', backgroundColor: '#F3F4F6', borderRadius: '999px', overflow: 'hidden' }}>
            <div ref={progressRef} style={{ height: '6px', backgroundColor: '#4F46E5', borderRadius: '999px', width: resubmit ? '66.6%' : '33.3%', transition: 'width 0.4s' }} />
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem' }}>
            <p style={{ color: '#DC2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}

        <div ref={stepRef}>

          {/* Step 0 — hidden when resubmitting */}
          {step === 0 && !resubmit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Enter plate number</h2>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>Format: MH01AB1234</p>
              </div>
              <div>
                <input
                  type="text"
                  maxLength={10}
                  value={plate}
                  onChange={(e) => validatePlate(e.target.value)}
                  placeholder="MH01AB1234"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box', border: `2px solid ${plateValid === true ? '#22C55E' : plateValid === false ? '#EF4444' : '#D1D5DB'}`,
                    borderRadius: '10px', padding: '13px', fontSize: '1.1rem', fontFamily: 'monospace', textAlign: 'center',
                    letterSpacing: '0.15em', color: '#111827', outline: 'none', textTransform: 'uppercase',
                  }}
                />
                {plateValid === false && <p style={{ color: '#DC2626', fontSize: '0.78rem', marginTop: '6px' }}>Invalid format. Example: MH01AB1234</p>}
                {plateValid === true  && <p style={{ color: '#16A34A', fontSize: '0.78rem', marginTop: '6px' }}>Looks good!</p>}
              </div>
              <button onClick={() => slideToStep(1)} disabled={!plateValid} style={plateValid ? btnPrimary : btnDisabled}>Next</button>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Upload documents</h2>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>All three documents are required.</p>
              </div>
              <FileDropzone label="Registration Certificate (RC)" file={rcDoc} onChange={setRcDoc} />
              <FileDropzone label="Driving Licence (DL)"          file={dlDoc} onChange={setDlDoc} />
              <FileDropzone label="Plate Photo"                    file={platePhoto} onChange={setPlatePhoto} />
              <div style={{ display: 'flex', gap: '10px' }}>
                {!resubmit && (
                  <button onClick={() => slideToStep(0)} style={{ ...btnSecondary, flex: 1 }}>Back</button>
                )}
                <button onClick={() => slideToStep(2)} disabled={!rcDoc || !dlDoc || !platePhoto} style={{ ...(rcDoc && dlDoc && platePhoto ? btnPrimary : btnDisabled), flex: resubmit ? undefined : 1 }}>Next</button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Review & submit</h2>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>Check everything before submitting.</p>
              </div>
              <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>Plate Number</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{plate}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[['RC', rcDoc], ['DL', dlDoc], ['Plate', platePhoto]].map(([lbl, f]) => (
                    <div key={lbl} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>{lbl}</p>
                      {f?.type !== 'application/pdf'
                        ? <img src={URL.createObjectURL(f)} alt={lbl} style={{ height: '60px', width: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                        : <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', borderRadius: '6px', fontSize: '0.78rem', color: '#4338CA', fontWeight: 600 }}>PDF</div>
                      }
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => slideToStep(1)} style={{ ...btnSecondary, flex: 1 }}>Back</button>
                <button onClick={handleSubmit} disabled={loading} style={{ ...(loading ? btnDisabled : btnPrimary), flex: 1 }}>
                  {loading ? 'Submitting…' : resubmit ? 'Resubmit for Verification' : 'Submit for Verification'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
