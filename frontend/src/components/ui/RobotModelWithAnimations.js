import { useFrame, useLoader } from '@react-three/fiber';
/* eslint-disable react/no-unknown-property */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * modelUrl: local path to your glb (replace with '/models/robot.glb' when you add it to public/)
 */
const defaultModelUrl = '/robot.glb'; 

/**
 * RobotModelWithAnimations
 * - Loads GLB
 * - Creates AnimationMixer and maps clips by lowercase name
 * - Exposes methods: playIdle, playSpeak, playNod, playCelebrate, stopAll
 */
const RobotModelWithAnimations = forwardRef(({ modelUrl = defaultModelUrl, initialScale = 1 }, ref) => {
  // Load GLTF (fallback: try to load; if fails, show simple box)
  // Load GLTF
  const gltf = useLoader(GLTFLoader, modelUrl);

  const rootRef = useRef();
  const mixerRef = useRef(null);
  const actionsRef = useRef({});
  const activeActionRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

  // Setup mixer and actions
  useEffect(() => {
    if (!gltf || !gltf.scene) return;
    const scene = gltf.scene || gltf.scenes?.[0];
    // Ensure scene is added to root if not already (useLoader usually handles this structure but we need to be sure)
    
    // Create mixer
    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;

    // Map clips by normalized name
    const clips = gltf.animations || [];
    const map = {};
    clips.forEach((clip) => {
      const name = (clip.name || '').toLowerCase();
      map[name] = mixer.clipAction(clip);
    });
    actionsRef.current = map;

    // Play idle if exists
    if (map['idle']) {
      map['idle'].reset().fadeIn(0.3).play();
      activeActionRef.current = map['idle'];
    }

    // cleanup on unmount
    return () => {
      try {
        mixer.stopAllAction();
        mixer.uncacheRoot(scene);
      } catch (e) { /* ignore */ }
    };
  }, [gltf]);

  // Mixer update loop
  useFrame(() => {
    if (mixerRef.current) {
      const dt = clockRef.current.getDelta();
      mixerRef.current.update(dt);
    }
  });

  // Helper to cross-fade to a named action
  function crossFadeTo(name, { duration = 0.25, loopOnce = true } = {}) {
    const actions = actionsRef.current || {};
    const next = actions[name?.toLowerCase()];
    if (!next) {
      // If requested action not found, fallback to idle
      const idle = actions['idle'];
      if (idle && activeActionRef.current !== idle) {
        activeActionRef.current?.fadeOut(duration);
        idle.reset().fadeIn(duration).play();
        activeActionRef.current = idle;
      }
      return;
    }
    // If same action already active, restart if desired
    if (activeActionRef.current === next) {
      if (loopOnce) {
        next.reset().play();
      }
      return;
    }
    const prev = activeActionRef.current;
    try {
      prev && prev.fadeOut(duration);
      next.reset();
      if (loopOnce) {
        next.setLoop(THREE.LoopOnce, 0);
        next.clampWhenFinished = true;
      } else {
        next.setLoop(THREE.LoopRepeat);
      }
      next.fadeIn(duration).play();
      activeActionRef.current = next;
    } catch (err) {
      console.warn('Animation play error', err);
    }
  }

  // Expose imperative API to parent via ref
  useImperativeHandle(ref, () => ({
    playIdle: (opts) => crossFadeTo('idle', opts),
    playSpeak: (opts) => crossFadeTo('speak', { duration: 0.12, loopOnce: true, ...opts }),
    playNod: (opts) => crossFadeTo('nod', { duration: 0.12, loopOnce: true, ...opts }),
    playCelebrate: (opts) => crossFadeTo('celebrate', { duration: 0.12, loopOnce: true, ...opts }),
    stopAll: () => {
      const a = actionsRef.current || {};
      Object.values(a).forEach(act => { try { act.stop(); } catch (e) { /* ignore */ } });
      activeActionRef.current = null;
    }
  }), []);

  // If gltf not loaded or model is not a .glb, show fallback placeholder
  if (!gltf || !gltf.scene) {
    // simple fallback mesh that visually stands in place
    return (
      <group ref={rootRef} scale={[initialScale, initialScale, initialScale]}>
        <mesh position={[0, 0.6, 0]} rotation={[0.15, 0.4, 0]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial color={'#24262b'} metalness={0.4} roughness={0.45} />
        </mesh>
      </group>
    );
  }

  return (
    <primitive 
        object={gltf.scene} 
        ref={rootRef} 
        scale={[initialScale, initialScale, initialScale]} 
    />
  );
});

RobotModelWithAnimations.displayName = 'RobotModelWithAnimations';

export default RobotModelWithAnimations;
