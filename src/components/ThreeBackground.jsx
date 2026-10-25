import React, { useEffect, useRef } from 'react';
import { BackgroundScene } from '../three/BackgroundScene';

function ThreeBackground({ theme, isPaused }) {
  const canvasRef = useRef(null);
  const sceneInstanceRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      sceneInstanceRef.current = new BackgroundScene(canvasRef.current, theme);
      console.log('Three.js ambient scene initialized successfully');
    } catch (err) {
      console.warn('Three.js background initialization failed gracefully:', err);
    }

    return () => {
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.destroy();
        sceneInstanceRef.current = null;
      }
    };
  }, []);

  // Update theme dynamically
  useEffect(() => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setTheme(theme);
    }
  }, [theme]);

  // Pause / resume background when modal is open or when prop changes
  useEffect(() => {
    if (sceneInstanceRef.current) {
      if (isPaused) {
        sceneInstanceRef.current.pause();
      } else {
        sceneInstanceRef.current.resume();
      }
    }
  }, [isPaused]);

  return (
    <canvas 
      ref={canvasRef}
      className="threejs-ambient-canvas"
      aria-hidden="true"
    />
  );
}

export default React.memo(ThreeBackground);
