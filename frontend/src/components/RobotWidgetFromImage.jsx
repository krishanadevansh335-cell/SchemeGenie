/* eslint-disable react/no-unknown-property */
// RobotWidgetFromImage.jsx
import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

/**
 * Local path to the uploaded image.
 */
const IMAGE_URL = '/robot_billboard.png';

function Billboard({ url, speakState }) {
  const ref = useRef();
  const tex = useRef();
  const [mat] = useState(() => new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.25, color: 0xffffff, transparent: true }));
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      tex.current = t;
      mat.map = t;
      mat.needsUpdate = true;
    });
    // cleanup
    return () => {
      if (tex.current) tex.current.dispose();
      mat.dispose();
    };
  }, [url, mat]);

  // subtle bob / speak pulse
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = Math.sin(t * 0.25) * 0.06;
    const scale = speakState === 'speaking' ? 1.06 : 1.0;
    ref.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.08);
  });

  return (
    <mesh ref={ref} position={[0, 0.9, 0]}>
      <planeGeometry args={[1.6, 1.6]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export default function RobotWidgetFromImage({ onComplete }) {
  const { t, i18n } = useTranslation();
  const [speakState, setSpeakState] = useState('idle'); // 'idle' | 'speaking'
  const [flowIndex, setFlowIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const flow = [
    { id: 'greeting', text: "Hello! I'm GenieBot. I'll ask a few questions to find schemes for you. Ready to start?", type: 'choice', options: ['Yes', 'No'], reprompt: "Please say 'yes' or 'no'." },
    { id: 'age', text: 'What is your age?', type: 'number', reprompt: 'Please say your age as a number, for example 32.' },
    { id: 'income', text: 'What is your monthly household income (approx.)?', type: 'number', reprompt: 'Please say your income as a number, for example 15000.' },
    { id: 'confirm', text: 'Great — shall I fetch personalized schemes for you now?', type: 'choice', options: ['Yes', 'No'] }
  ];

  // TTS helper
  const speak = (text, lang = i18n.language || 'en-IN') => {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    return new Promise((res) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.onend = res;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  };

  // STT init (browser)
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = i18n.language || 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setListening(false);
      handleReply(text);
    };
    r.onerror = (e) => {
      console.warn('STT error', e);
      setListening(false);
    };
    recognitionRef.current = r;
    // cleanup
    return () => { if (recognitionRef.current) recognitionRef.current.abort(); recognitionRef.current = null; };
  }, [i18n.language]);

  // speak current node
  useEffect(() => {
    const node = flow[flowIndex];
    if (!node) return;
    setSpeakState('speaking');
    speak(node.text).then(() => {
      setSpeakState('idle');
      // auto-start listening for non-confirm nodes
      if (recognitionRef.current && node.type !== 'choice') {
        try { recognitionRef.current.start(); setListening(true); } catch (e) { /* ignore */ }
      }
    });
  }, [flowIndex]);

  function handleReply(text) {
    const node = flow[flowIndex];
    if (!node) return;
    // minimal validation
    if (node.type === 'number' && !/^\d+/.test(String(text).trim())) {
      speak(node.reprompt || 'I did not catch that. Could you repeat?');
      return;
    }
    const val = text.trim();
    setAnswers(prev => ({ ...prev, [node.id]: val }));
    // advance logic
    if (flowIndex < flow.length - 1) setFlowIndex(i => i + 1);
    else finalizeAnswers({ ...answers, [node.id]: val });
  }

  async function finalizeAnswers(finalAnswers) {
    setSpeakState('speaking');
    await speak('Thanks! Finding best schemes for you now.');
    setSpeakState('idle');
    // POST to your backend recommendations endpoint
    try {
      await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalAnswers)
      });
    } catch (e) {
      console.warn('recommendation post failed', e);
    }
    onComplete && onComplete(finalAnswers);
  }

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
      <div style={{ width: 540, height: 420, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <Canvas camera={{ position: [0, 1.3, 3] }}>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <ambientLight intensity={0.45} />
          {/* eslint-disable-next-line react/no-unknown-property */}
          <spotLight position={[2, 5, 3]} angle={0.4} intensity={1.2} penumbra={0.6} />
          {/* eslint-disable-next-line react/no-unknown-property */}
          <spotLight position={[-2, 3, -2]} angle={0.5} intensity={0.3} />
          <Billboard url={IMAGE_URL} speakState={speakState} />
          {/* eslint-disable-next-line react/no-unknown-property */}
          <mesh position={[0, 0, -1.7]}>
            {/* eslint-disable-next-line react/no-unknown-property */}
            <planeGeometry args={[6, 3]} />
            {/* eslint-disable-next-line react/no-unknown-property */}
            <meshStandardMaterial color={'#06060a'} />
          </mesh>
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ background: '#071023', padding: 16, borderRadius: 10 }}>
          <div style={{ fontWeight: 700, color: '#e6eef8' }}>GenieBot</div>
          <div style={{ color: '#bcd3ea', marginTop: 8, minHeight: 90 }}>
            <div style={{ fontWeight: 600 }}>{flow[flowIndex].text}</div>
            <div style={{ marginTop: 10 }}>
              {flow[flowIndex].type === 'choice' ? (
                flow[flowIndex].options.map(opt => (
                  <button key={opt} onClick={() => handleReply(opt)} style={{ marginRight: 8, padding: '4px 12px', borderRadius: '4px', background: '#2563eb', color: 'white' }}>{opt}</button>
                ))
              ) : (
                <div>
                  <input placeholder="Type or press speak" onKeyDown={e => {
                    if (e.key === 'Enter') handleReply(e.target.value);
                  }} style={{ padding: 8, width: '70%', marginRight: 8, borderRadius: '4px', border: '1px solid #374151', background: '#1f2937', color: 'white' }} />
                  <button onClick={() => {
                    if (!recognitionRef.current) { speak('Voice not available. Please type your answer.'); return; }
                    if (listening) { try { recognitionRef.current.stop(); setListening(false); } catch(e){ /* ignore */ } }
                    else { try { recognitionRef.current.start(); setListening(true); } catch(e){ speak('Could not start microphone.'); } }
                  }} style={{ padding: '8px 16px', borderRadius: '4px', background: listening ? '#dc2626' : '#2563eb', color: 'white' }}>{listening ? 'Stop' : 'Speak'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
