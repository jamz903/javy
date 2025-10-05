import { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Stars, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import * as THREE from 'three'

function SpaceStation({ url, scale = 1, position = [0, 0, 0] }) {
  const meshRef = useRef();
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const clone = scene.clone();

    const colors = {
      "spacestation001_low_Main_0": "#e8f0f7",
      "spacestation002_low_Main_0": "#f0f4f8",
      "spacestation003_low_Main_0": "#d8e6f0",
      "spacestation004_low_Main_0": "#e8f0f7",
      "spacestation005_low_Main_0": "#c5d5e8",
      "spacestation006_low_Main_0": "#d0dfe8",
      "spacestation007_low_Main_0": "#b8cfe0",
      "spacestation008_low_Main_0": "#c5d5e8",
      "spacestation009_low_Main_0": "#7eb3ff",
      "spacestation010_low_Main_0": "#8bbfff",
      "spacestation011_low_Main_0": "#6fa8ff",
      "spacestation012_low_Main_0": "#7eb3ff",
      "spacestation013_low_Main_0": "#a8b8c8",
      "spacestation014_low_Main_0": "#b0c0d0",
      "spacestation015_low_Main_0": "#98a8b8",
      "spacestation016_low_Main_0": "#a8b8c8",
      "spacestation017_low_Main_0": "#7a8a9a",
      "spacestation018_low_Main_0": "#8595a5",
      "spacestation019_low_Main_0": "#6f7f8f",
      "spacestation020_low_Main_0": "#7a8a9a",
      "spacestation021_low_Main_0": "#dae8f5",
      "spacestation022_low_Main_0": "#e5f0fa",
      "spacestation023_low_Main_0": "#d0e0f0",
      "spacestation024_low_Main_0": "#dae8f5",
      "spacestation025_low_Main_0": "#6fa8ff",
      "spacestation026_low_Main_0": "#7eb3ff",
      "spacestation027_low_Main_0": "#8bbfff",
      "spacestation029_low_Main_0": "#e0e8f0",
      "spacestation030_low_Main_0": "#c5d5e8",
      "spacestation031_low_Main_0": "#7eb3ff",
      "spacestation032_low_Main_0": "#a8b8c8",
      "spacestation033_low_Main_0": "#d8e6f0",
      "spacestation034_low_Main_0": "#b8cfe0",
      "spacestation_low_Main_0": "#f0f4f8",
      "emit_low001_emitrED_0": "#4dd4ff",
      "emit_low_emitrED_0": "#6be5ff",
      "emit_low002_emitrED_0": "#4dd4ff",
    };

    clone.traverse((child) => {
      if (child.isMesh) {
        const isEmitMesh = child.name.includes('emit_low');
        const targetColor = colors[child.name];

        if (child.material) {
          child.material = child.material.clone();

          if (targetColor) {
            child.material.color.set(targetColor);
          }

          if (isEmitMesh) {
            child.material.emissive.set(targetColor || '#00ffff');
            child.material.emissiveIntensity = 7.0;
            child.material.metalness = 0.5;
            child.material.roughness = 1.0;
          } else {
            child.material.emissive.set('#1e40af');
            child.material.emissiveIntensity = 1;
            child.material.metalness = 0.3;
            child.material.roughness = 0.6;
          }
        }
      }
    });

    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.rotation.y += delta * 0.15;
      const floatY = Math.sin(t * 0.2) * 0.2;
      const targetY = position[1] + floatY;
      meshRef.current.position.y = damp(meshRef.current.position.y, targetY, 2, delta);
    }
  });

  return (
    <primitive
      ref={meshRef}
      object={clonedScene}
      scale={scale}
      position={position}
    />
  );
}

function damp(current, target, smoothness, delta) {
  return THREE.MathUtils.damp(current, target, smoothness, delta);
}

function CameraRig() {
  const cameraRef = useRef();

  useFrame((state, delta) => {
    if (cameraRef.current) {
      const targetX = state.pointer.x * 3;
      const targetY = 2 + state.pointer.y * 2;

      cameraRef.current.position.x = damp(cameraRef.current.position.x, targetX, 2, delta);
      cameraRef.current.position.y = damp(cameraRef.current.position.y, targetY, 2, delta);

      cameraRef.current.lookAt(0, 0, 0);
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 2, 8]} fov={60} />;
}

function Scene() {
  return (
    <>
      <CameraRig />
      <ambientLight intensity={6} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#4a90e2" />
      <spotLight position={[0, 10, 0]} intensity={1.5} angle={0.6} penumbra={1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Suspense fallback={null}>
        <SpaceStation
          url="/space_station.glb"
          scale={0.5}
          position={[0, 0, 0]}
        />
      </Suspense>
    </>
  );
}

export default function Home() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (message.trim() && !isLoading) {
      const userMessage = message;
      setMessage('');
      setIsLoading(true);

      localStorage.removeItem('chatMessages');

      // Navigate immediately with the message
      navigate('/chat', {
        state: {
          initialMessage: userMessage
        }
      });

      // Send API request in background
      try {
        const response = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            conversation_history: [],
            execute_api: true
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        // Update the chat page with the response via navigation state
        navigate('/chat', {
          state: {
            initialMessage: userMessage,
            initialResponse: data
          },
          replace: true
        });
      } catch (error) {
        console.error('Error sending message:', error);
        // Navigate with error state
        navigate('/chat', {
          state: {
            initialMessage: userMessage,
            error: error.message
          },
          replace: true
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAbout = () => {
    navigate('/about');
  };

  const handleDocumentation = () => {
    navigate('/documentation');
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 2, 8], fov: 60 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: 2,
            toneMappingExposure: 1.2
          }}
          shadows
        >
          <Scene />
          <EffectComposer>
            <Bloom
              intensity={3.0}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-between h-full px-6 py-12 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center pointer-events-auto group"
        >
          <div className="flex items-center justify-center gap-2 mb-4 transition-transform duration-300 ease-in-out group-hover:scale-105 cursor-pointer" onClick={handleAbout}>
            <Sparkles className="w-8 h-8 text-blue-400 transition-transform duration-300 group-hover:rotate-12" />
            <h1 className="text-5xl font-bold text-white tracking-tight">
              leona
            </h1>
          </div>
          <p className="text-gray-400 text-lg transition-all duration-300 group-hover:opacity-80">
            Low-Earth Observation & Natural-language Analytics
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center max-w-2xl pointer-events-auto group"
          onClick={handleDocumentation}
        >
          <h2 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight transition-transform duration-300 ease-in-out group-hover:scale-105 cursor-pointer">
            Bringing Space
            <span className="block bg-gradient-to-r from-blue-400 to-violet-600 bg-clip-text text-transparent">
              Down To Earth
            </span>
          </h2>
          <p className="text-gray-300 text-lg md:text-xl mb-8 opacity-80 transition-all duration-300 group-hover:opacity-60 group-hover:scale-95">
            Harness the power of
            <span className='bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent'>
              &nbsp;space
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="w-full max-w-3xl mb-8 pointer-events-auto"
        >
          <div className="relative">
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
              <Input
                type="text"
                placeholder="Ask anything about the universe..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full bg-transparent border-none text-white placeholder:text-gray-400 text-lg px-6 py-6 pr-14 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 rounded-xl h-10 w-10 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <p className="text-gray-500 text-sm text-center mt-4">
            Press Enter to send your message
          </p>
        </motion.div>
      </div>
    </div>
  );
}
