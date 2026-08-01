/* ==========================================================================
   스마트 출석부 - Firebase Cloud Firestore & Google Auth Integration Engine
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ------------------------------------------------------------------------
// 1. Firebase Config Setup (Vite Env or Direct Fallback)
// ------------------------------------------------------------------------
const getEnv = (key, fallback) => {
  try {
    if (import.meta && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyCXi40lNWao1_FlEcmO7ZNeo4tvjm_xsDw"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "psh-test-87e5d.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "psh-test-87e5d"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "psh-test-87e5d.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "501499047227"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:501499047227:web:87a913b97d407a63019b1e"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-7F7BM89ENK")
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------------------------------------------------------------------
// 2. Mock 20 Students Seed Data
// ------------------------------------------------------------------------
const MOCK_STUDENTS = [
  { id: 1, name: "강하늘", number: 1, note: "" },
  { id: 2, name: "고은지", number: 2, note: "" },
  { id: 3, name: "김민준", number: 3, note: "" },
  { id: 4, name: "김서연", number: 4, note: "" },
  { id: 5, name: "박도현", number: 5, note: "" },
  { id: 6, name: "박소율", number: 6, note: "" },
  { id: 7, name: "서지후", number: 7, note: "" },
  { id: 8, name: "손예은", number: 8, note: "" },
  { id: 9, name: "송우진", number: 9, note: "" },
  { id: 10, name: "신유나", number: 10, note: "" },
  { id: 11, name: "안현우", number: 11, note: "" },
  { id: 12, name: "윤하은", number: 12, note: "" },
  { id: 13, name: "이준서", number: 13, note: "" },
  { id: 14, name: "이지안", number: 14, note: "" },
  { id: 15, name: "임건우", number: 15, note: "" },
  { id: 16, name: "장채원", number: 16, note: "" },
  { id: 17, name: "정시우", number: 17, note: "" },
  { id: 18, name: "조아린", number: 18, note: "" },
  { id: 19, name: "최현준", number: 19, note: "" },
  { id: 20, name: "한수아", number: 20, note: "" }
];

// ------------------------------------------------------------------------
// 3. Application State & DOM Elements
// ------------------------------------------------------------------------
let currentUser = null;
let studentsList = [...MOCK_STUDENTS];
let attendanceMap = {}; // { studentId: { status: 'present'|'late'|'absent'|'leave', note: '' } }
let selectedDate = new Date().toISOString().split('T')[0];
let currentFilter = 'all';
let searchQuery = '';
let unsubscribeAttendance = null;

// DOM Selectors
const loggedOutState = document.getElementById('logged-out-state');
const loggedInState = document.getElementById('logged-in-state');
const googleLoginBtn = document.getElementById('google-login-btn');
const googleLogoutBtn = document.getElementById('google-logout-btn');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const authAlertBanner = document.getElementById('auth-alert-banner');

const attendanceDateInput = document.getElementById('attendance-date');
const todayBtn = document.getElementById('today-btn');
const seedStudentsBtn = document.getElementById('seed-students-btn');
const allPresentBtn = document.getElementById('all-present-btn');

const countPresent = document.getElementById('count-present');
const countLate = document.getElementById('count-late');
const countAbsent = document.getElementById('count-absent');
const countLeave = document.getElementById('count-leave');
const statTotalBadge = document.getElementById('stat-total-badge');
const attendanceRatePercent = document.getElementById('attendance-rate-percent');
const attendanceProgressBar = document.getElementById('attendance-progress-bar');

const studentSearchInput = document.getElementById('student-search-input');
const filterTabs = document.querySelectorAll('.filter-tab');
const studentCardsGrid = document.getElementById('student-cards-grid');

const vercelGuideBtn = document.getElementById('vercel-guide-btn');
const vercelModal = document.getElementById('vercel-modal');
const closeVercelModalBtn = document.getElementById('close-vercel-modal-btn');
const confirmVercelModalBtn = document.getElementById('confirm-vercel-modal-btn');

// ------------------------------------------------------------------------
// 4. Firebase Authentication Setup
// ------------------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    loggedOutState.classList.add('hidden');
    loggedInState.classList.remove('hidden');
    authAlertBanner.classList.add('hidden');
    
    userAvatar.src = user.photoURL || 'https://via.placeholder.com/34';
    userName.textContent = user.displayName || '교사';
    userEmail.textContent = user.email || '';
  } else {
    loggedOutState.classList.remove('hidden');
    loggedInState.classList.add('hidden');
    authAlertBanner.classList.remove('hidden');
  }
  loadStudentsAndAttendance();
});

googleLoginBtn.addEventListener('click', async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google Auth Error:", error);
    alert("구글 로그인 중 오류가 발생했습니다: " + error.message);
  }
});

googleLogoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
});

// ------------------------------------------------------------------------
// 5. Firestore DB Operations (Students & Attendance Sync)
// ------------------------------------------------------------------------
async function loadStudentsAndAttendance() {
  try {
    // 1. Fetch Students
    const studentsSnap = await getDocs(collection(db, "students"));
    if (!studentsSnap.empty) {
      studentsList = [];
      studentsSnap.forEach(docSnap => {
        studentsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      studentsList.sort((a, b) => Number(a.number || a.id) - Number(b.number || b.id));
    } else {
      studentsList = [...MOCK_STUDENTS];
    }

    // 2. Real-time Listen to Selected Date Attendance
    if (unsubscribeAttendance) unsubscribeAttendance();

    const dateDocRef = doc(db, "attendance", selectedDate);
    unsubscribeAttendance = onSnapshot(dateDocRef, (docSnap) => {
      if (docSnap.exists()) {
        attendanceMap = docSnap.data().records || {};
      } else {
        // Default to present for everyone if not initialized
        attendanceMap = {};
        studentsList.forEach(st => {
          attendanceMap[st.id] = { status: 'present', note: '' };
        });
      }
      renderRosterGrid();
      updateStatsSummary();
    }, (err) => {
      console.warn("Firestore snapshot listen (offline/read fallback):", err);
      // Fallback local state if permissions or offline
      if (Object.keys(attendanceMap).length === 0) {
        studentsList.forEach(st => {
          attendanceMap[st.id] = { status: 'present', note: '' };
        });
      }
      renderRosterGrid();
      updateStatsSummary();
    });
  } catch (e) {
    console.error("Firestore sync error:", e);
    renderRosterGrid();
    updateStatsSummary();
  }
}

// Batch Seed 20 Mock Students into Firestore DB
seedStudentsBtn.addEventListener('click', async () => {
  if (!currentUser) {
    if (!confirm("가상 엑셀 명단(20명)을 화면에 불러옵니다. (Firestore DB에 완전히 저장하려면 상단 구글 교사 로그인이 필요합니다. 계속하시겠습니까?)")) {
      return;
    }
  }

  try {
    const batch = writeBatch(db);
    MOCK_STUDENTS.forEach(student => {
      const studentRef = doc(db, "students", String(student.id));
      batch.set(studentRef, {
        number: student.number,
        name: student.name,
        updatedAt: new Date().toISOString()
      });
    });

    if (currentUser) {
      await batch.commit();
      alert("✅ Firestore DB에 가상 엑셀 명단 20명이 성공적으로 등록되었습니다!");
    } else {
      alert("✅ 화면에 가상 엑셀 명단 20명이 장착되었습니다!");
    }

    studentsList = [...MOCK_STUDENTS];
    loadStudentsAndAttendance();
  } catch (e) {
    console.error("Seed Error:", e);
    alert("명단 업로드 중 오류가 발생했습니다: " + e.message);
  }
});

// Update Status for a single student
async function setStudentStatus(studentId, newStatus) {
  if (!attendanceMap[studentId]) {
    attendanceMap[studentId] = { status: 'present', note: '' };
  }
  attendanceMap[studentId].status = newStatus;

  renderRosterGrid();
  updateStatsSummary();
  saveAttendanceToFirestore();
}

// Update Note for a single student
async function setStudentNote(studentId, noteText) {
  if (!attendanceMap[studentId]) {
    attendanceMap[studentId] = { status: 'present', note: '' };
  }
  attendanceMap[studentId].note = noteText;
  saveAttendanceToFirestore();
}

// Save all attendance to Firestore doc by Date
async function saveAttendanceToFirestore() {
  if (!currentUser) return; // Requires login for Firestore writes
  try {
    const dateDocRef = doc(db, "attendance", selectedDate);
    await setDoc(dateDocRef, {
      date: selectedDate,
      records: attendanceMap,
      updatedBy: currentUser.email,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error("Save Attendance Firestore error:", e);
  }
}

// Mark All Students Present
allPresentBtn.addEventListener('click', () => {
  studentsList.forEach(st => {
    if (!attendanceMap[st.id]) attendanceMap[st.id] = { note: '' };
    attendanceMap[st.id].status = 'present';
  });
  renderRosterGrid();
  updateStatsSummary();
  saveAttendanceToFirestore();
});

// ------------------------------------------------------------------------
// 6. UI Render Engine
// ------------------------------------------------------------------------
function renderRosterGrid() {
  studentCardsGrid.innerHTML = '';

  const filtered = studentsList.filter(st => {
    // Search Filter
    const matchesSearch = st.name.includes(searchQuery) || String(st.number).includes(searchQuery);
    
    // Status Filter
    const currentStatus = attendanceMap[st.id]?.status || 'present';
    const matchesFilter = (currentFilter === 'all') || (currentStatus === currentFilter);

    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    studentCardsGrid.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-user-slash spinner-icon"></i>
        <p>조건에 일치하는 학생이 없거나 명단이 비어있습니다.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(st => {
    const record = attendanceMap[st.id] || { status: 'present', note: '' };
    const status = record.status || 'present';

    const card = document.createElement('div');
    card.className = `student-card status-border-${status}`;

    let statusText = '🟢 출석';
    let statusClass = 'status-present';
    if (status === 'late') { statusText = '🟡 지각'; statusClass = 'status-late'; }
    if (status === 'absent') { statusText = '🔴 결석'; statusClass = 'status-absent'; }
    if (status === 'leave') { statusText = '🔵 조퇴'; statusClass = 'status-leave'; }

    card.innerHTML = `
      <div class="card-top">
        <div class="student-identity">
          <span class="student-num-badge">${st.number}</span>
          <span class="student-name">${st.name}</span>
        </div>
        <span class="student-status-badge ${statusClass}">${statusText}</span>
      </div>

      <div class="status-button-group">
        <button class="status-btn btn-present ${status === 'present' ? 'active' : ''}" data-id="${st.id}" data-status="present">출석</button>
        <button class="status-btn btn-late ${status === 'late' ? 'active' : ''}" data-id="${st.id}" data-status="late">지각</button>
        <button class="status-btn btn-absent ${status === 'absent' ? 'active' : ''}" data-id="${st.id}" data-status="absent">결석</button>
        <button class="status-btn btn-leave ${status === 'leave' ? 'active' : ''}" data-id="${st.id}" data-status="leave">조퇴</button>
      </div>

      <input type="text" class="card-note-input" data-id="${st.id}" placeholder="특이사항 / 메모 입력..." value="${record.note || ''}">
    `;

    studentCardsGrid.appendChild(card);
  });

  // Attach Event Listeners to rendered cards
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const st = e.target.getAttribute('data-status');
      setStudentStatus(id, st);
    });
  });

  document.querySelectorAll('.card-note-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      setStudentNote(id, e.target.value);
    });
  });
}

function updateStatsSummary() {
  const total = studentsList.length;
  let present = 0, late = 0, absent = 0, leave = 0;

  studentsList.forEach(st => {
    const stStatus = attendanceMap[st.id]?.status || 'present';
    if (stStatus === 'present') present++;
    if (stStatus === 'late') late++;
    if (stStatus === 'absent') absent++;
    if (stStatus === 'leave') leave++;
  });

  countPresent.textContent = present;
  countLate.textContent = late;
  countAbsent.textContent = absent;
  countLeave.textContent = leave;
  statTotalBadge.textContent = `총 ${total}명`;

  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  attendanceRatePercent.textContent = `${rate}%`;
  attendanceProgressBar.style.width = `${rate}%`;
}

// ------------------------------------------------------------------------
// 7. Event Listeners & Date Setup
// ------------------------------------------------------------------------
attendanceDateInput.value = selectedDate;

attendanceDateInput.addEventListener('change', (e) => {
  selectedDate = e.target.value;
  loadStudentsAndAttendance();
});

todayBtn.addEventListener('click', () => {
  selectedDate = new Date().toISOString().split('T')[0];
  attendanceDateInput.value = selectedDate;
  loadStudentsAndAttendance();
});

studentSearchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderRosterGrid();
});

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.getAttribute('data-filter');
    renderRosterGrid();
  });
});

// Vercel Guide Modal
vercelGuideBtn.addEventListener('click', () => {
  vercelModal.classList.remove('hidden');
});

closeVercelModalBtn.addEventListener('click', () => {
  vercelModal.classList.add('hidden');
});

confirmVercelModalBtn.addEventListener('click', () => {
  vercelModal.classList.add('hidden');
});

// Initial Render
renderRosterGrid();
updateStatsSummary();
