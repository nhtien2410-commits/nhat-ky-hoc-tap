import React, { useEffect, useRef } from 'react';
import { celebrationManager } from '../three/CelebrationEffects';

function CelebrationCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      celebrationManager.init(canvasRef.current);
    }
    return () => {
      celebrationManager.destroy();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="celebration-overlay-canvas"
      aria-hidden="true"
    />
  );
}

export default React.memo(CelebrationCanvas);
