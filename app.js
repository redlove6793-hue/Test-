/* ==========================================================================
   부산 국제영화고등학교 발표 도우미 - Application Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------------------------------------------------
  // State Variables
  // ------------------------------------------------------------------------
  const DEFAULT_ROSTER = '1번 김영화, 2번 이시네마, 3번 박감독, 4번 최배우, 5번 정촬영, 6번 한편집, 7번 음사운드, 8번 윤조명, 9번 강시나리오, 10번 송제작';
  
  let roster = [];
  let drawnList = [];
  let isRolling = false;
  let soundEnabled = true;

  // Timer State
  let timerInterval = null;
  let totalTime = 180; // 3분 기본
  let timeLeft = 180;
  let isTimerRunning = false;
  let alarmInterval = null;

  // Audio Context
  let audioCtx = null;

  // ------------------------------------------------------------------------
  // DOM Elements
  // ------------------------------------------------------------------------
  const rosterInput = document.getElementById('roster-input');
  const rosterCountBadge = document.getElementById('roster-count');
  const sampleRosterBtn = document.getElementById('sample-roster-btn');
  const clearRosterBtn = document.getElementById('clear-roster-btn');
  const excludeDrawnCheckbox = document.getElementById('exclude-drawn-checkbox');
  const drawnChipsContainer = document.getElementById('drawn-chips');
  const resetDrawnBtn = document.getElementById('reset-drawn-btn');

  // Picker DOM
  const pickBtn = document.getElementById('pick-btn');
  const stageScreen = document.getElementById('stage-screen');
  const idleState = document.getElementById('idle-state');
  const rollingContainer = document.getElementById('rolling-container');
  const rollingDrum = document.getElementById('rolling-drum');

  // Timer DOM
  const timerDisplay = document.getElementById('timer-display');
  const timerStatus = document.getElementById('timer-status');
  const timerProgress = document.getElementById('timer-progress');
  const timerStartBtn = document.getElementById('timer-start-btn');
  const timerPauseBtn = document.getElementById('timer-pause-btn');
  const timerResetBtn = document.getElementById('timer-reset-btn');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const customMinInput = document.getElementById('custom-min');
  const customSecInput = document.getElementById('custom-sec');
  const customSetBtn = document.getElementById('custom-set-btn');

  // Modal DOM
  const winnerModal = document.getElementById('winner-modal');
  const winnerNameDisplay = document.getElementById('winner-name-display');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const rePickBtn = document.getElementById('re-pick-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  // ------------------------------------------------------------------------
  // Web Audio API Sound Generator
  // ------------------------------------------------------------------------
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTickSound() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) { console.error(e); }
  }

  function playWinSound() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 Fanfare
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.12;
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) { console.error(e); }
  }

  function playAlarmSound() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      
      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      };

      playBeep();
      setTimeout(playBeep, 300);
      setTimeout(playBeep, 600);
    } catch (e) { console.error(e); }
  }

  // ------------------------------------------------------------------------
  // Roster Management Functions
  // ------------------------------------------------------------------------
  function loadSavedRoster() {
    const savedRoster = localStorage.getItem('bifhs_roster');
    if (savedRoster !== null) {
      rosterInput.value = savedRoster;
    } else {
      rosterInput.value = DEFAULT_ROSTER;
    }

    const savedDrawn = localStorage.getItem('bifhs_drawn');
    if (savedDrawn) {
      try {
        drawnList = JSON.parse(savedDrawn);
      } catch (e) {
        drawnList = [];
      }
    }
    parseRoster();
    updateDrawnChipsUI();
  }

  function parseRoster() {
    const rawText = rosterInput.value.trim();
    if (!rawText) {
      roster = [];
    } else {
      roster = rawText.split(/,|\n/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
    }

    rosterCountBadge.textContent = `총 ${roster.length}명`;
    localStorage.setItem('bifhs_roster', rawText);
  }

  function updateDrawnChipsUI() {
    drawnChipsContainer.innerHTML = '';
    if (drawnList.length === 0) {
      drawnChipsContainer.innerHTML = '<span class="empty-drawn-msg">아직 발표한 학생이 없습니다.</span>';
      return;
    }

    drawnList.forEach(name => {
      const chip = document.createElement('div');
      chip.className = 'drawn-chip';
      chip.innerHTML = `<i class="fa-solid fa-user-check"></i> ${name}`;
      drawnChipsContainer.appendChild(chip);
    });

    localStorage.setItem('bifhs_drawn', JSON.stringify(drawnList));
  }

  // ------------------------------------------------------------------------
  // Random Picker Engine (2-second Rapid Rolling)
  // ------------------------------------------------------------------------
  function startRandomPick() {
    if (isRolling) return;
    parseRoster();

    if (roster.length === 0) {
      alert('발표자 명단을 입력해 주세요!');
      rosterInput.focus();
      return;
    }

    const excludeDrawn = excludeDrawnCheckbox.checked;
    let candidates = roster;

    if (excludeDrawn) {
      candidates = roster.filter(name => !drawnList.includes(name));
    }

    if (candidates.length === 0) {
      alert('모든 학생이 이미 발표를 마쳤습니다!\n추첨 기록 초기화 버튼을 눌러 다시 시작할 수 있습니다.');
      return;
    }

    // Switch Stage to Rolling State
    isRolling = true;
    idleState.classList.add('hidden');
    rollingContainer.classList.remove('hidden');
    pickBtn.disabled = true;

    let rollInterval = null;
    let duration = 2000; // 2 seconds
    let startTime = Date.now();

    rollInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      const randomName = candidates[randomIndex];
      rollingDrum.innerHTML = `<span class="rolling-name">${randomName}</span>`;
      playTickSound();

      // Check if 2 seconds elapsed
      if (Date.now() - startTime >= duration) {
        clearInterval(rollInterval);
        finishRandomPick(candidates);
      }
    }, 60);
  }

  function finishRandomPick(candidates) {
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const winner = candidates[winnerIndex];

    // Record drawn list
    if (excludeDrawnCheckbox.checked && !drawnList.includes(winner)) {
      drawnList.push(winner);
      updateDrawnChipsUI();
    }

    // Reset Stage Screen
    rollingContainer.classList.add('hidden');
    idleState.classList.remove('hidden');
    isRolling = false;
    pickBtn.disabled = false;

    // Show Winner Modal
    winnerNameDisplay.textContent = winner;
    winnerModal.classList.remove('hidden');
    playWinSound();
    launchConfetti();
  }

  // ------------------------------------------------------------------------
  // Timer Functions
  // ------------------------------------------------------------------------
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateTimerUI() {
    timerDisplay.textContent = formatTime(timeLeft);
    const progressFraction = timeLeft / totalTime;
    const maxOffset = 553; // 2 * PI * 88
    const strokeOffset = maxOffset * (1 - progressFraction);
    timerProgress.style.strokeDashoffset = strokeOffset;
  }

  function setTimer(seconds) {
    stopTimer();
    clearAlarmEffects();
    totalTime = Math.max(1, seconds);
    timeLeft = totalTime;
    timerStatus.textContent = '대기 중';
    updateTimerUI();
  }

  function startTimer() {
    if (isTimerRunning) return;
    getAudioContext();
    clearAlarmEffects();

    if (timeLeft <= 0) {
      timeLeft = totalTime;
    }

    isTimerRunning = true;
    timerStatus.textContent = '발표 진행 중...';
    timerStartBtn.disabled = true;
    timerPauseBtn.disabled = false;

    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerUI();

      if (timeLeft <= 0) {
        onTimerExpired();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!isTimerRunning) return;
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerStatus.textContent = '일시 정지';
    timerStartBtn.disabled = false;
    timerPauseBtn.disabled = true;
  }

  function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerStartBtn.disabled = false;
    timerPauseBtn.disabled = true;
    timerStatus.textContent = '대기 중';
  }

  function resetTimer() {
    stopTimer();
    clearAlarmEffects();
    timeLeft = totalTime;
    updateTimerUI();
  }

  function onTimerExpired() {
    stopTimer();
    timerStatus.textContent = '⏰ 발표 시간 종료!';
    
    // Add Expired Blinking Class
    document.querySelector('.timer-card').classList.add('timer-expired');

    // Play Alarm Sound repeatedly for 4 seconds
    playAlarmSound();
    alarmInterval = setInterval(playAlarmSound, 1200);
    setTimeout(() => {
      clearInterval(alarmInterval);
    }, 5000);
  }

  function clearAlarmEffects() {
    if (alarmInterval) clearInterval(alarmInterval);
    document.querySelector('.timer-card').classList.remove('timer-expired');
  }

  // ------------------------------------------------------------------------
  // Canvas Confetti Generator
  // ------------------------------------------------------------------------
  function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = winnerModal.clientWidth || window.innerWidth;
    canvas.height = winnerModal.clientHeight || window.innerHeight;

    const particles = [];
    const particleCount = 100;
    const colors = ['#f5c518', '#ffd700', '#e50914', '#ffffff', '#ff9f1c'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationFrame = null;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.opacity -= 0.015;
        p.rotation += p.rSpeed;

        if (p.opacity > 0) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationFrame = requestAnimationFrame(render);
      }
    }

    render();
  }

  // ------------------------------------------------------------------------
  // Event Listeners
  // ------------------------------------------------------------------------
  // Roster inputs
  rosterInput.addEventListener('input', parseRoster);

  sampleRosterBtn.addEventListener('click', () => {
    rosterInput.value = DEFAULT_ROSTER;
    parseRoster();
  });

  clearRosterBtn.addEventListener('click', () => {
    if (confirm('명단을 모두 비우시겠습니까?')) {
      rosterInput.value = '';
      parseRoster();
    }
  });

  resetDrawnBtn.addEventListener('click', () => {
    if (drawnList.length === 0) return;
    if (confirm('이미 발표한 학생 추첨 기록을 초기화하시겠습니까?')) {
      drawnList = [];
      updateDrawnChipsUI();
    }
  });

  // Picker Button
  pickBtn.addEventListener('click', () => {
    getAudioContext();
    startRandomPick();
  });

  // Modal Buttons
  closeModalBtn.addEventListener('click', () => {
    winnerModal.classList.add('hidden');
  });

  rePickBtn.addEventListener('click', () => {
    winnerModal.classList.add('hidden');
    setTimeout(() => {
      startRandomPick();
    }, 200);
  });

  // Sound Toggle
  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.innerHTML = soundEnabled 
      ? '<i class="fa-solid fa-volume-high"></i>' 
      : '<i class="fa-solid fa-volume-xmark"></i>';
    soundToggleBtn.style.opacity = soundEnabled ? '1' : '0.5';
  });

  // Fullscreen Toggle
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });

  // Timer Controls
  timerStartBtn.addEventListener('click', startTimer);
  timerPauseBtn.addEventListener('click', pauseTimer);
  timerResetBtn.addEventListener('click', resetTimer);

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const timeInSec = parseInt(btn.getAttribute('data-time'), 10);
      setTimer(timeInSec);
    });
  });

  customSetBtn.addEventListener('click', () => {
    const mins = parseInt(customMinInput.value, 10) || 0;
    const secs = parseInt(customSecInput.value, 10) || 0;
    const totalSecs = (mins * 60) + secs;
    if (totalSecs <= 0) {
      alert('1초 이상의 시간을 설정해주세요!');
      return;
    }
    setTimer(totalSecs);
  });

  // Init
  loadSavedRoster();
  setTimer(180); // default 3 min
});
