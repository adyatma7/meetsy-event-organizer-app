import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export default function Scanner() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { admin, loading } = useAuth();

  const [scanResult, setScanResult] = useState(null); // { type: 'success'|'error', data: {}, message: '' }
  const [isProcessing, setIsProcessing] = useState(false);
  const [camError, setCamError] = useState(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (loading) return;
    // If completely missing from session, redirect to login (unless Admin).
    const token = sessionStorage.getItem('staffToken');
    const adminToken = sessionStorage.getItem('token');
    if (!token && !admin && !adminToken) {
      navigate(`/staff/${slug}`);
    }
  }, [slug, navigate, admin, loading]);

  const handleScan = async (result) => {
    if (!result || !result.length) return;
    const qrToken = result[0].rawValue;
    
    // Prevent double processing
    if (isProcessing || scanResult) return;
    
    try {
      setIsProcessing(true);
      
      const tokenToUse = sessionStorage.getItem('staffToken') || sessionStorage.getItem('token');
      const res = await api.post('/staff/scan', { qrToken, slug }, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      });
      
      setScanResult({
        type: 'success',
        data: res.participant,
        message: 'Access Granted'
      });
      
      // Play success beep
      const audio = new Audio('/success-beep.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));

    } catch (err) {
      setScanResult({
        type: 'error',
        message: err.message || 'Invalid QR Code'
      });
      
      // Play error beep
      const audio = new Audio('/error-beep.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
  };

  return (
    <div className="flex-1 flex flex-col relative bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      
      {/* Camera Viewport */}
      {!scanResult && (
        <div className="flex-1 w-full h-full relative overflow-hidden">
          {camError && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-danger-500 text-white px-6 py-4 rounded-md border-4 border-neutral-900 shadow-brutal-dark text-center font-bold z-50 animate-in fade-in slide-in-from-top-4">
              ⚠️ Camera Error: {camError}
              <div className="text-sm mt-1">Please allow camera permissions in your browser.</div>
            </div>
          )}
          
          <QrScanner 
            onScan={handleScan}
            onError={(error) => setCamError(error?.message || "Camera access denied")}
            formats={['qr_code']}
            components={{
              audio: false, // We handle audio manually
              onOff: true,
              torch: true,
              zoom: true,
              finder: false, // Custom finder below
            }}
            styles={{
              container: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
              video: { objectFit: 'cover', width: '100%', height: '100%' }
            }}
          />
          
          {/* Custom Premium Finder Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
            <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] shadow-[0_0_0_4000px_rgba(0,0,0,0.85)] border-4 border-primary-500">
              {/* Corner Brackets */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-8 border-l-8 border-white"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-8 border-r-8 border-white"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-8 border-l-8 border-white"></div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-8 border-r-8 border-white"></div>
            </div>
            
            <div className="absolute bottom-24 bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal-dark text-neutral-900 dark:text-white px-6 py-3.5 rounded-md text-sm font-black flex items-center gap-3">
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                  Processing Code...
                </>
              ) : (
                'Align QR code within frame'
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result Overlay */}
      {scanResult && (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-6 transition-all duration-300 ${
          scanResult.type === 'success' ? 'bg-success-400' : 'bg-danger-500'
        }`}>
          
          <div className="bg-white dark:bg-neutral-800 p-5 rounded-md mb-6 border-4 border-neutral-900 shadow-brutal-dark animate-in zoom-in duration-300">
            {scanResult.type === 'success' ? (
              <CheckCircle className="w-24 h-24 text-success-500" />
            ) : (
              <XCircle className="w-24 h-24 text-danger-600" />
            )}
          </div>

          <h2 className="text-4xl font-black text-neutral-900 text-center mb-2 tracking-tight uppercase border-black text-shadow-sm">
            {scanResult.message}
          </h2>

          {scanResult.type === 'success' && scanResult.data && (
            <div className="bg-white dark:bg-neutral-800 border-4 border-neutral-900 p-8 rounded-md w-full max-w-sm shadow-brutal-dark mt-4 mb-10 text-center relative overflow-hidden">
              <p className="text-neutral-500 dark:text-neutral-400 text-sm font-black uppercase tracking-wider mb-2 relative z-10">Participant</p>
              <p className="text-neutral-900 dark:text-white font-black text-3xl relative z-10">{scanResult.data.name}</p>
              {scanResult.data.company && (
                <p className="text-neutral-700 text-lg mt-2 font-bold relative z-10">{scanResult.data.company}</p>
              )}
            </div>
          )}

          {scanResult.type === 'error' && (
            <div className="mb-10 mt-4 max-w-sm text-center bg-white dark:bg-neutral-800 border-4 border-neutral-900 p-6 rounded-md shadow-brutal-dark">
              <p className="text-neutral-900 dark:text-white text-lg font-black uppercase">
                Please instruct the participant to see the registration help desk.
              </p>
            </div>
          )}

          <button 
            onClick={handleReset}
            className="flex items-center justify-center gap-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-4 border-neutral-900 shadow-brutal-dark w-full max-w-sm h-16 rounded-md font-black text-xl hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-dark-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all uppercase tracking-wider"
          >
            <RefreshCw className="w-6 h-6" />
            Scan Next
          </button>
        </div>
      )}
    </div>
  );
}
