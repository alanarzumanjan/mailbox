"use client";

import { useEffect, useRef, useState } from "react";

export default function MailboxHero3D() {
  const containerRef = useRef(null);

  // Состояния для интерактивности внутри компонента
  const [fillPercent, setFillPercent] = useState(0);
  const [letterCount, setLetterCount] = useState(0);
  const [statusText, setStatusText] = useState("EMPTY");
  const [statusColor, setStatusColor] = useState("#059669");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanup = false;
    let autoTimer = null;

    // Динамический импорт Three.js и аддонов внутри useEffect (клиентский рендер)
    Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
      import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
    ]).then(([THREE, { OrbitControls }, { RoundedBoxGeometry }]) => {
      if (cleanup || !container) return;

      const CONFIG = {
        maxLetters: 7,
        dropInterval: 600,
        flightDuration: 300,
        resetDelay: 2600,
        letterSpacing: 0.235,
        letterThickness: 0.15,
      };

      const scene = new THREE.Scene();
      scene.background = null;

      const camera = new THREE.PerspectiveCamera(
        34,
        container.clientWidth / container.clientHeight,
        0.1,
        100,
      );
      // Установили камеру строго по центру, чтобы ящик стоял ровно прямо
      camera.position.set(0, 3.8, 9.5);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = true;
      controls.rotateSpeed = 0.45;
      controls.minPolarAngle = Math.PI * 0.3;
      controls.maxPolarAngle = Math.PI * 0.57;
      controls.target.set(0, 0.05, 0);
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.32;

      // Освещение
      scene.add(new THREE.HemisphereLight(0xffffff, 0xdbe4ed, 2.1));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
      keyLight.position.set(5, 8, 6);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xd1fae5, 1.6);
      fillLight.position.set(-5, 3, 3);
      scene.add(fillLight);

      // Материалы
      const darkMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.38,
        metalness: 0.3,
      });
      const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.3,
        metalness: 0.55,
      });
      const interiorMaterial = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.7,
        metalness: 0.05,
      });
      const silverMaterial = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.28,
        metalness: 0.8,
      });
      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        metalness: 0,
        roughness: 0.08,
        transmission: 0.18,
        transparent: true,
        opacity: 0.18,
        thickness: 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const letterMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.82,
      });

      function addBox(
        parent,
        width,
        height,
        depth,
        material,
        position,
        radius = 0.03,
      ) {
        const geometry = new RoundedBoxGeometry(
          width,
          height,
          depth,
          3,
          radius,
        );
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
      }

      const mailbox = new THREE.Group();
      mailbox.scale.set(0.7, 0.7, 0.7); // Сделали сам ящик компактнее
      scene.add(mailbox);

      const W = 3.8,
        H = 4.8,
        D = 2.25;
      const left = -W / 2,
        right = W / 2;
      const floorY = -1.83,
        ceilingY = 0.38;
      const frontZ = D / 2,
        backZ = -D / 2;

      // Корпус ящика
      addBox(mailbox, W, H, 0.16, darkMaterial, [0, 0, backZ]);
      addBox(mailbox, 0.15, H, D, darkMaterial, [left + 0.075, 0, 0]);
      addBox(mailbox, 0.15, H, D, darkMaterial, [right - 0.075, 0, 0]);
      addBox(
        mailbox,
        W + 0.15,
        0.18,
        D + 0.12,
        darkMaterial,
        [0, 2.4, 0],
        0.09,
      );
      addBox(mailbox, 3.35, 0.045, 1.85, edgeMaterial, [0, 2.505, 0], 0.025);
      addBox(
        mailbox,
        W + 0.15,
        0.2,
        D + 0.12,
        darkMaterial,
        [0, -2.4, 0],
        0.07,
      );

      // Интерьер и стекло
      addBox(mailbox, 3.45, 2.25, 0.035, interiorMaterial, [
        0,
        -0.73,
        backZ + 0.095,
      ]);
      addBox(mailbox, 3.48, 0.12, 1.95, silverMaterial, [0, floorY - 0.08, 0]);
      addBox(mailbox, 3.48, 0.09, 1.95, interiorMaterial, [0, ceilingY, 0]);
      addBox(
        mailbox,
        3.46,
        2.55,
        0.035,
        glassMaterial,
        [0, -0.76, 1.125],
        0.025,
      );

      // Прорезь для писем
      addBox(mailbox, 1.65, 0.3, 0.18, silverMaterial, [0, 1.55, 1.14], 0.055);
      addBox(
        mailbox,
        1.42,
        0.12,
        0.12,
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
        [0, 1.55, 1.24],
        0.025,
      );

      // Создание писем
      function createEnvelope() {
        const group = new THREE.Group();
        addBox(
          group,
          2.15,
          CONFIG.letterThickness,
          1.25,
          letterMaterial,
          [0, 0, 0],
          0.025,
        );
        return group;
      }

      const stackGroup = new THREE.Group();
      mailbox.add(stackGroup);
      const stackBaseY = floorY + 0.23;
      const letters = [];

      let currentCount = 0;
      let currentFlight = null;
      let isDropping = false;
      let isFull = false;

      const sensorData = [
        { fill: 20 },
        { fill: 34 },
        { fill: 55 },
        { fill: 66 },
        { fill: 76 },
        { fill: 84 },
        { fill: 89 },
      ];

      function updateUIState(cnt) {
        if (cnt === 0) {
          setFillPercent(0);
          setLetterCount(0);
          setStatusText("EMPTY");
          setStatusColor("#059669");
        } else {
          const dat = sensorData[cnt - 1];
          setFillPercent(dat.fill);
          setLetterCount(cnt);
          if (dat.fill >= 85) {
            setStatusText("FULL");
            setStatusColor("#ef4444");
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 2500);
          } else if (dat.fill >= 55) {
            setStatusText("FILLING");
            setStatusColor("#f59e0b");
          } else {
            setStatusText("ACTIVE");
            setStatusColor("#059669");
          }
        }
      }

      function addLetterToStack() {
        const index = letters.length;
        const envelope = createEnvelope();
        envelope.position.set(0, stackBaseY + index * CONFIG.letterSpacing, 0);
        envelope.rotation.y = (index % 2 === 0 ? 1 : -1) * 0.025;
        stackGroup.add(envelope);
        letters.push(envelope);
      }

      function dropLetter() {
        if (isDropping || isFull || currentCount >= CONFIG.maxLetters) return;
        isDropping = true;

        const envelope = createEnvelope();
        mailbox.add(envelope);

        const start = new THREE.Vector3(0, 1.55, 2.0);
        const endY = stackBaseY + currentCount * CONFIG.letterSpacing;
        const end = new THREE.Vector3(
          (Math.random() - 0.5) * 0.12,
          endY + 0.04,
          0.05,
        );

        envelope.position.copy(start);
        currentFlight = {
          envelope,
          start,
          end,
          startTime: performance.now(),
          duration: CONFIG.flightDuration,
        };
      }

      function resetMailbox() {
        letters.forEach((l) => stackGroup.remove(l));
        letters.length = 0;
        currentCount = 0;
        isFull = false;
        isDropping = false;
        setShowAlert(false);
        updateUIState(0);
      }

      // Привязываем кнопки к логике симуляции
      const dropBtn = document.getElementById("hero-drop-btn");
      const replayBtn = document.getElementById("hero-replay-btn");

      const handleDrop = () => {
        if (currentCount < CONFIG.maxLetters && !isDropping) {
          dropLetter();
        }
      };
      const handleReplay = () => {
        if (currentFlight) {
          mailbox.remove(currentFlight.envelope);
          currentFlight = null;
        }
        resetMailbox();
      };

      dropBtn?.addEventListener("click", handleDrop);
      replayBtn?.addEventListener("click", handleReplay);

      // Автоматический старт первого письма
      autoTimer = setTimeout(() => dropLetter(), 1000);

      // Анимационный цикл
      let animationFrameId;
      const clock = new THREE.Clock();

      function render(now) {
        animationFrameId = requestAnimationFrame(render);
        const time = clock.elapsedTime;

        mailbox.position.y = Math.sin(time * 0.75) * 0.025;

        // Полет письма
        if (currentFlight) {
          const elapsed = now - currentFlight.startTime;
          const raw = Math.min(elapsed / currentFlight.duration, 1);
          const t =
            raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;

          currentFlight.envelope.position.x = THREE.MathUtils.lerp(
            currentFlight.start.x,
            currentFlight.end.x,
            t,
          );
          currentFlight.envelope.position.z = THREE.MathUtils.lerp(
            currentFlight.start.z,
            currentFlight.end.z,
            t,
          );
          currentFlight.envelope.position.y =
            THREE.MathUtils.lerp(
              currentFlight.start.y,
              currentFlight.end.y,
              t,
            ) +
            Math.sin(raw * Math.PI) * 0.65;

          if (raw >= 1) {
            mailbox.remove(currentFlight.envelope);
            addLetterToStack();
            currentCount++;
            currentFlight = null;
            isDropping = false;
            updateUIState(currentCount);

            if (currentCount >= CONFIG.maxLetters) {
              isFull = true;
            } else {
              autoTimer = setTimeout(() => dropLetter(), CONFIG.dropInterval);
            }
          }
        }

        controls.update();
        renderer.render(scene, camera);
      }

      animationFrameId = requestAnimationFrame(render);

      // Resize handler
      const handleResize = () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        cleanup = true;
        clearTimeout(autoTimer);
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("resize", handleResize);
        dropBtn?.removeEventListener("click", handleDrop);
        replayBtn?.removeEventListener("click", handleReplay);
        if (renderer.domElement) renderer.domElement.remove();
      };
    });
  }, []);

  return (
    <div className="relative w-full max-w-[1050px] h-[480px] mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-xl shadow-slate-900/5">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-10"
      />

      {/* BOX CAPACITY — Справа вверху прямо над постбоксом */}
      <div className="absolute top-6 right-6 z-20 w-40 p-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-1">
          <span>BOX CAPACITY</span>
          <span style={{ color: statusColor }} className="font-bold">
            {statusText}
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tight">
          {fillPercent}
          <small className="text-xs font-normal text-slate-400">%</small>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
          <div
            className="h-full transition-all duration-700 ease-out rounded-full"
            style={{ width: `${fillPercent}%`, backgroundColor: statusColor }}
          />
        </div>
        <div className="font-mono text-[9px] text-slate-400 mt-2">
          {letterCount} / 7 LETTERS
        </div>
      </div>

      {/* FULL ALERT (Всплывающий алерт по центру при заполнении) */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-72 p-5 text-center bg-white/95 backdrop-blur-xl border border-rose-200 rounded-2xl shadow-2xl transition-all duration-300 pointer-events-none ${
          showAlert ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="w-10 h-10 mx-auto mb-3 grid place-items-center text-rose-500 bg-rose-50 rounded-xl">
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 3 2.5 20h19L12 3Z" />
            <path d="M12 9v5M12 17h.01" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Pickup triggered
        </h3>
        <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
          Mailbox capacity threshold reached.
          <br />
          Courier collection is now required.
        </p>
        <div className="inline-block mt-3 px-2 py-1 bg-rose-50 text-rose-700 font-mono text-[9px] rounded font-semibold">
          ROUTE #LV-104 · PRIORITY HIGH
        </div>
      </div>

      {/* КНОПКИ УПРАВЛЕНИЯ ВНИЗУ */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <button
          id="hero-drop-btn"
          className="inline-flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M4 19h16" />
          </svg>
          Drop Letter
        </button>

        <button
          id="hero-replay-btn"
          className="inline-flex items-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Replay
        </button>
      </div>
    </div>
  );
}
