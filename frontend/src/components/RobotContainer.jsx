// RobotContainer.jsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { useRef } from 'react';
import RobotModelWithAnimations from './ui/RobotModelWithAnimations';

export default function RobotContainer() {
    const robotRef = useRef();

    // Example triggers
    async function onSpeakStart(text) {
        // play speak animation
        robotRef.current?.playSpeak();
        // text-to-speech
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-IN';
            u.onend = () => {
                // return to idle after speaking
                robotRef.current?.playIdle();
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
        }
    }

    function onConfirm() {
        robotRef.current?.playNod();
    }

    function onCelebrate() {
        robotRef.current?.playCelebrate();
        // optionally call playIdle after a timeout
        setTimeout(() => robotRef.current?.playIdle(), 1800);
    }

    return (
        <div style={{ width: 520, height: 420, borderRadius: 12, overflow: 'hidden' }}>
            <Canvas camera={{ position: [0, 1.6, 3] }}>
                {/* eslint-disable-next-line react/no-unknown-property */}
                <ambientLight intensity={0.5} />
                {/* eslint-disable-next-line react/no-unknown-property */}
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <React.Suspense fallback={null}>
                    <RobotModelWithAnimations ref={robotRef} modelUrl={'/models/robot.glb'} initialScale={1} />
                </React.Suspense>
                <OrbitControls enableZoom={false} enablePan={false} />
            </Canvas>

            {/* Example UI controls (demo) */}
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                    onClick={() => onSpeakStart('Hello! I will ask a few questions to find schemes for you.')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Speak
                </button>
                <button
                    onClick={onConfirm}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                    Nod
                </button>
                <button
                    onClick={onCelebrate}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                    Celebrate
                </button>
            </div>
        </div>
    );
}
