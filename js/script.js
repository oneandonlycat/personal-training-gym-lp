/* #region ACCORDION — 質問の開閉アニメーション */
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    const isOpen = header.classList.contains('open');

    header.classList.toggle('open');

    // 開閉に応じて高さを調整（CSS の max-height を制御）
    content.style.maxHeight = isOpen ? null : content.scrollHeight + "px";
  });
});
/* #endregion */


/* #region FLATPICKR — 日本語化＋曜日付きフォーマット */
flatpickr.localize(flatpickr.l10ns.ja);

function formatWithWeekday(date) {
  const youbi = ["日","月","火","水","木","金","土"];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const w = youbi[date.getDay()];
  return `${y}-${m}-${d}（${w}）`;
}
/* #endregion */



/* #region HOLIDAYS — 日本の祝日計算（固定＋移動＋振替） */
const holidayNames = {
  "01-01": "元日",
  "02-11": "建国記念の日",
  "02-23": "天皇誕生日",
  "04-29": "昭和の日",
  "05-03": "憲法記念日",
  "05-04": "みどりの日",
  "05-05": "こどもの日",
  "08-11": "山の日",
  "11-03": "文化の日",
  "11-23": "勤労感謝の日"
};

// 第◯月曜を求める（成人の日など）
function nthMonday(year, month, nth) {
  const date = new Date(year, month - 1, 1);
  let count = 0;
  while (true) {
    if (date.getDay() === 1) count++;
    if (count === nth) break;
    date.setDate(date.getDate() + 1);
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// 祝日一覧を生成（固定＋移動＋振替）
function getJapaneseHolidays(year) {
  const holidays = [];

  // 固定祝日
  Object.keys(holidayNames).forEach(md => {
    holidays.push(`${year}-${md}`);
  });

  // 春分・秋分（天文学的計算）
  const shunbun = Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
  const shubun = Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
  holidays.push(`${year}-03-${String(shunbun).padStart(2, "0")}`);
  holidays.push(`${year}-09-${String(shubun).padStart(2, "0")}`);

  // 移動祝日（ハッピーマンデー）
  holidays.push(nthMonday(year, 1, 2));
  holidays.push(nthMonday(year, 7, 3));
  holidays.push(nthMonday(year, 9, 3));
  holidays.push(nthMonday(year, 10, 2));

  // 振替休日
  const holidaySet = new Set(holidays);
  const addFurikae = [];

  holidays.forEach(dateStr => {
    const date = new Date(dateStr);
    if (date.getDay() === 0) {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);

      while (holidaySet.has(next.toISOString().slice(0, 10))) {
        next.setDate(next.getDate() + 1);
      }

      addFurikae.push(next.toISOString().slice(0, 10));
    }
  });

  addFurikae.forEach(d => holidaySet.add(d));

  return Array.from(holidaySet);
}

const year = new Date().getFullYear();
const holidays = getJapaneseHolidays(year);
/* #endregion */


/* #region TIME OPTIONS — 選択した曜日に応じて時間帯を生成 */
function generateTimeOptions(select, minHour, maxHour) {
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "時間を選択してください";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  for (let h = minHour; h < maxHour; h++) {
    if (h === 11) continue; // 11時台は除外

    const start = `${String(h).padStart(2, "0")}:00`;
    const end = `${String(h + 1).padStart(2, "0")}:00`;
    const label = `${start}〜${end}`;

    const opt = document.createElement("option");
    opt.value = label;
    opt.textContent = label;
    select.appendChild(opt);
  }
}
/* #endregion */


/* #region FLATPICKR SETUP — 日付選択後に時間帯を有効化 */
function setupDateTime(dateSelector, timeSelector) {
  const timeSelect = document.querySelector(timeSelector);
  timeSelect.disabled = true;

  flatpickr(dateSelector, {
    locale: "ja",
    dateFormat: "Y-m-d",
    minDate: "today",
    disableMobile: true, 
    
    // カレンダーの各日付にクラス付与（祝日・土日）
    onDayCreate: function(dObj, dStr, fp, dayElem) {
      const date = dayElem.dateObj;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const ymd = `${y}-${m}-${d}`;
      const md = `${m}-${d}`;
      const dow = date.getDay();

      if (dow === 0) dayElem.classList.add("sunday", "disabled");
      if (dow === 6) dayElem.classList.add("saturday");

      if (holidays.includes(ymd)) {
        dayElem.classList.add("holiday", "disabled");

        let name = holidayNames[md];
        if (!name) {
          if (ymd === nthMonday(year, 1, 2)) name = "成人の日";
          if (ymd === nthMonday(year, 7, 3)) name = "海の日";
          if (ymd === nthMonday(year, 9, 3)) name = "敬老の日";
          if (ymd === nthMonday(year, 10, 2)) name = "スポーツの日";
        }
        if (!name) name = "振替休日";

        dayElem.setAttribute("title", name);
      }
    },

    // 日付選択後に時間帯を生成
    onChange: function(selectedDates, dateStr, instance) {
      if (selectedDates.length === 0) return;

      instance.input.value = formatWithWeekday(selectedDates[0]);

      const dow = selectedDates[0].getDay();
      if (dow >= 1 && dow <= 5) {
        generateTimeOptions(timeSelect, 7, 22);
      } else if (dow === 6) {
        generateTimeOptions(timeSelect, 8, 20);
      }

      timeSelect.disabled = false;
    }
  });
}

setupDateTime("#date1", "#time1");
setupDateTime("#date2", "#time2");
setupDateTime("#date3", "#time3");
/* #endregion */


/* #region TEL FORMAT — 入力中の電話番号を自動整形 */
document.getElementById("tel").addEventListener("input", function () {
  let val = this.value.replace(/[^0-9]/g, "");

  const areaCodes = [
    "011","015","017","018","019",
    "022","023","024","025","026","027","028","029",
    "03","04","042","043","044","045","046","047","048","049",
    "052","053","054","055","056","057","058","059",
    "06",
    "072","073","074","075","076","077","078","079",
    "082","083","084","085","086","087","088","089",
    "092","093","094","095","096","097","098","099"
  ];

  if (val.length === 11) {
    this.value = val.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    return;
  }

  if (val.length === 10) {
    let area = areaCodes.find(code => val.startsWith(code));

    if (area) {
      let a = area.length;
      let b = val.length - a - 4;
      this.value = val.replace(new RegExp(`(\\d{${a}})(\\d{${b}})(\\d{4})`), "$1-$2-$3");
      return;
    }

    this.value = val.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    return;
  }

  this.value = val;
});
/* #endregion */


/* #region FORM SUBMIT — 必須チェック＋GAS送信＋トースト表示 */
document.getElementById("apply-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const form = e.target;
  const submitButton = form.querySelector("button[type='submit']");

  // 二重送信防止
  submitButton.disabled = true;
  submitButton.textContent = "送信中...";

  const date1 = form.date1.value.trim();
  const time1 = form.time1.value.trim();

  if (!date1 || !time1) {
    alert("第1希望日と時間は必ず選択してください。");
    submitButton.disabled = false;
    submitButton.textContent = "送信する";
    return;
  }

  fetch("https://script.google.com/macros/s/AKfycbzGfSf5gGRen3lQ516dQkxtUAHFmXYvdOfB0aku2ik0G4zIz_RBY51eZ_3xTJF0vvbq4Q/exec", {
    method: "POST",
    body: new FormData(form)
  })
    .then(res => res.text())
    .then(text => {

      const toast = document.getElementById("toast");

      // トースト表示（中央固定）
      toast.style.display = "block";

      // 3秒後に非表示
      setTimeout(() => {
        toast.style.display = "none";
      }, 3000);

      form.reset();
      submitButton.disabled = false;
      submitButton.textContent = "送信する";
    })
    .catch(err => {
      alert("送信失敗しました");
      submitButton.disabled = false;
      submitButton.textContent = "送信する";
    });
});
/* #endregion */


/* #region FADE-IN — スクロール時のアニメーション制御 */
document.addEventListener('DOMContentLoaded', () => {

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  /* ----- セクション単位のフェードイン ----- */
  const sections = document.querySelectorAll('.fade-in');

  const sectionObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  sections.forEach(section => sectionObserver.observe(section));


  /* ----- カード単位のフェードイン ----- */
  const cards = document.querySelectorAll('.fade-in-card');

  if (isMobile) {

    // SP：カードを個別にフェードイン
    const cardObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    cards.forEach(card => cardObserver.observe(card));

  } else {

    // PC：同じ親のカードをグループ化して順番にフェードイン
    const groups = new Map();

    cards.forEach(card => {
      const parent = card.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(card);
    });

    groups.forEach(groupCards => {

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {

            groupCards.forEach((card, i) => {
              card.style.animationDelay = `${i * 200}ms`;
              card.classList.add('in-view');
            });

            obs.disconnect();
          }
        });
      }, { threshold: 0.2 });

      if (groupCards.length > 0) {
        observer.observe(groupCards[0]);
      }
    });
  }

});
/* #endregion */

/* #region GA4タグ */
flatpickr.localize(flatpickr.l10ns.ja);

document.querySelectorAll("[data-gtag]").forEach(el => {
  el.addEventListener("click", () => {
    const eventName = el.getAttribute("data-gtag");
    gtag("event", eventName);
  });
});

/* #endregion */