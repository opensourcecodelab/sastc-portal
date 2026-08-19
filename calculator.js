import { syllabusData } from './syllabus.js';
import { showToast } from './utils.js';

export function initCalculator() {
  const calcLevel = document.getElementById("calcLevel");
  const calcSemester = document.getElementById("calcSemester");
  const courseList = document.getElementById("courseList");
  
  const currentSemLabel = document.getElementById("currentSemLabel");
  const termGpaDisplay = document.getElementById("termGpaDisplay");
  const saveTermBtn = document.getElementById("saveTermBtn");
  
  const historyList = document.getElementById("historyList");
  const emptyHistoryMsg = document.getElementById("emptyHistoryMsg");
  const cumCreditsDisplay = document.getElementById("cumCredits");
  const cumCgpaDisplay = document.getElementById("cumCgpa");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  const getAdviceBtn = document.getElementById("getAdviceBtn");
  const aiAdvisorCard = document.getElementById("aiAdvisorCard");
  const aiAdvisorText = document.getElementById("aiAdvisorText");

  const gradePoints = {
    "A+": 4.00, "A": 3.75, "A-": 3.50,
    "B+": 3.25, "B": 3.00, "B-": 2.75,
    "C+": 2.50, "C": 2.25,
    "D": 2.00, "F": 0.00
  };

  let currentCourses = [];
  let semesterHistory = JSON.parse(localStorage.getItem('sastcGpaHistory')) || [];

  function getActiveDepartment() {
    let savedDept = localStorage.getItem('sastc_dept_preference') || 'CSE';
    if (savedDept === 'ALL') {
      savedDept = 'CSE'; // Default fallback if set to all
    }
    return ['CSE', 'AG', 'BBA'].includes(savedDept) ? savedDept : 'CSE';
  }

  function renderHistory() {
    if (semesterHistory.length === 0) {
      emptyHistoryMsg.style.display = 'block';
      historyList.innerHTML = '';
      historyList.appendChild(emptyHistoryMsg);
      cumCreditsDisplay.textContent = '0.00';
      cumCgpaDisplay.textContent = '0.00';
      return;
    }

    emptyHistoryMsg.style.display = 'none';
    historyList.innerHTML = '';
    
    let totalCredits = 0;
    let totalPoints = 0;

    semesterHistory.forEach((sem, index) => {
      totalCredits += sem.totalCredits;
      totalPoints += (sem.totalCredits * sem.gpa);

      const div = document.createElement('div');
      div.className = 'flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-sm';
      div.innerHTML = `
        <div>
          <span class="font-bold text-gray-700">${sem.dept} L${sem.level} S${sem.semester}</span>
          <span class="text-gray-500 ml-2">Cr: ${sem.totalCredits}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-bold text-indigo-600">${sem.gpa.toFixed(2)}</span>
          <button class="text-red-400 hover:text-red-600 delete-sem-btn" data-idx="${index}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
      historyList.appendChild(div);
    });

    const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
    cumCreditsDisplay.textContent = totalCredits.toFixed(2);
    cumCgpaDisplay.textContent = cgpa;

    document.querySelectorAll('.delete-sem-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-idx');
        semesterHistory.splice(idx, 1);
        saveHistory();
        renderHistory();
      });
    });
  }

  function saveHistory() {
    localStorage.setItem('sastcGpaHistory', JSON.stringify(semesterHistory));
  }

  function calculateTermGPA() {
    let termCredits = 0;
    let termPoints = 0;

    currentCourses.forEach(c => {
      const cred = parseFloat(c.credits) || 0;
      const gp = gradePoints[c.grade];
      if (gp !== undefined) {
        termCredits += cred;
        termPoints += (cred * gp);
      }
    });

    const gpa = termCredits > 0 ? (termPoints / termCredits).toFixed(2) : "0.00";
    if (termGpaDisplay) termGpaDisplay.textContent = gpa;
    return { gpa: parseFloat(gpa), credits: termCredits };
  }

  function loadCourses() {
    const dept = getActiveDepartment();
    const level = calcLevel.value;
    const sem = calcSemester.value;

    currentSemLabel.textContent = `(${dept} L${level} S${sem})`;
    courseList.innerHTML = '';
    currentCourses = [];

    const courses = syllabusData[dept]?.[level]?.[sem] || [];

    if (courses.length === 0) {
      courseList.innerHTML = '<p class="text-sm text-gray-500 italic">No courses found for this selection.</p>';
      calculateTermGPA();
      return;
    }

    courses.forEach((c, index) => {
      currentCourses.push({ ...c, grade: "A" }); // default grade
      
      const row = document.createElement("div");
      row.className = "flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100";
      
      row.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-indigo-600">${c.code}</div>
          <div class="text-sm text-gray-700 truncate" title="${c.name}">${c.name}</div>
        </div>
        <div class="text-sm font-medium text-gray-500 w-12 text-center bg-white border border-gray-200 rounded p-1">
          ${c.credits} Cr
        </div>
        <select class="setting-select w-20 p-1.5 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 grade-select" data-idx="${index}">
          ${Object.keys(gradePoints).map(g => `<option value="${g}" ${g === 'A' ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      `;
      courseList.appendChild(row);
    });

    document.querySelectorAll('.grade-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-idx');
        currentCourses[idx].grade = e.target.value;
        calculateTermGPA();
      });
    });

    calculateTermGPA();
  }

  // Event Listeners
  [calcLevel, calcSemester].forEach(el => {
    if (el) el.addEventListener('change', loadCourses);
  });

  // Listen for custom event from settings to reload if department changes
  window.addEventListener('sastc_dept_changed', () => {
    loadCourses();
  });

  if (saveTermBtn) {
    saveTermBtn.addEventListener('click', () => {
      if (currentCourses.length === 0) return;
      const { gpa, credits } = calculateTermGPA();
      if (credits === 0) return;

      const record = {
        dept: getActiveDepartment(),
        level: calcLevel.value,
        semester: calcSemester.value,
        gpa: gpa,
        totalCredits: credits,
        courses: currentCourses.map(c => ({ code: c.code, credits: c.credits, grade: c.grade }))
      };

      // Check if this semester already exists and replace it, or push new
      const existingIdx = semesterHistory.findIndex(s => s.dept === record.dept && s.level === record.level && s.semester === record.semester);
      if (existingIdx >= 0) {
        semesterHistory[existingIdx] = record;
      } else {
        semesterHistory.push(record);
      }

      saveHistory();
      renderHistory();
      
      // Visual feedback
      const originalText = saveTermBtn.innerHTML;
      saveTermBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
      saveTermBtn.classList.replace('bg-primary', 'bg-green-600');
      setTimeout(() => {
        saveTermBtn.innerHTML = originalText;
        saveTermBtn.classList.replace('bg-green-600', 'bg-primary');
      }, 2000);
    });
  }

  if (clearHistoryBtn) {
    let confirmTimeout;
    clearHistoryBtn.addEventListener('click', () => {
      if (clearHistoryBtn.classList.contains('confirming')) {
        semesterHistory = [];
        saveHistory();
        renderHistory();
        aiAdvisorCard.classList.add('hidden');
        
        clearHistoryBtn.classList.remove('confirming', 'bg-red-600', 'text-white');
        clearHistoryBtn.classList.add('bg-red-50', 'text-red-500');
        clearHistoryBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> <span>Clear</span>';
        clearTimeout(confirmTimeout);
        showToast("GPA history cleared");
      } else {
        clearHistoryBtn.classList.add('confirming', 'bg-red-600', 'text-white');
        clearHistoryBtn.classList.remove('bg-red-50', 'text-red-500');
        clearHistoryBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>Sure?</span>';
        
        confirmTimeout = setTimeout(() => {
          clearHistoryBtn.classList.remove('confirming', 'bg-red-600', 'text-white');
          clearHistoryBtn.classList.add('bg-red-50', 'text-red-500');
          clearHistoryBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> <span>Clear</span>';
        }, 3000);
      }
    });
  }

  if (getAdviceBtn) {
    getAdviceBtn.addEventListener('click', async () => {
      const { gpa, credits } = calculateTermGPA();
      
      const apiKeys = JSON.parse(localStorage.getItem("geminiApiKeys")) || [];
      if (apiKeys.length === 0) {
        showToast("Please add a Gemini API Key in the Settings tab first.");
        return;
      }

      aiAdvisorCard.classList.remove('hidden');
      aiAdvisorText.innerHTML = '<div class="flex items-center gap-2"><i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing your performance...</div>';

      // Randomize keys for load balancing
      const shuffledKeys = [...apiKeys].sort(() => 0.5 - Math.random());
      let success = false;
      let lastErrorMsg = "Error connecting to AI Advisor.";

      for (const key of shuffledKeys) {
        try {
          const res = await fetch("/api/advisor", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-gemini-api-key": key
            },
            body: JSON.stringify({
              cgpa: cumCgpaDisplay.textContent,
              termGpa: gpa,
              currentSemCourses: currentCourses,
              level: calcLevel.value,
              semester: calcSemester.value
            })
          });

          // Check if it's a rate limit error to auto-retry
          if (res.status === 429) {
            console.warn("Rate limited, falling back to next API key...");
            lastErrorMsg = "Rate limited. All keys exhausted.";
            continue;
          }

          const data = await res.json();
          if (data.error) {
            if (res.status === 400 && data.error.includes("Invalid")) {
              console.warn("Invalid key encountered:", key);
              lastErrorMsg = "Some API keys are invalid.";
              continue; // try next key
            }
            aiAdvisorText.innerHTML = `<span class="text-red-500 font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error}</span>`;
            success = true;
            break;
          } else if (data.text) {
            // simple formatting for bullets
            const formattedText = data.text.replace(/\n/g, '<br>').replace(/\* \*\*(.*?)\*\*/g, '<strong>$1</strong>');
            aiAdvisorText.innerHTML = formattedText;
            success = true;
            break;
          }
        } catch (err) {
          console.error("Network error on key fallback:", err);
        }
      }

      if (!success) {
        aiAdvisorText.innerHTML = `<span class="text-red-500 font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> ${lastErrorMsg}</span>`;
      }
    });
  }

  // Init
  if (calcLevel) {
    loadCourses();
    renderHistory();
  }
}
