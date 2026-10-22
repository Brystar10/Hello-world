(() => {
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = "personalShiftCalendar.v1";
  const knownAnchor = "2026-10-26";
  let currentMonth = new Date(2026, 9, 1);
  let selectedDate = knownAnchor;
  let selectingDates = false;
  let selectedDates = new Set();
  let bulkFromCalendar = false;
  let toastTimer;
  let state = { shifts: [], defaults: { start: "07:00", end: "17:00", label: "Work shift" } };

  const pad = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromKey = key => { const [y,m,d] = key.split("-").map(Number); return new Date(y,m-1,d); };
  const parseTime = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
  const fmtTime = t => {
    if (!t || !t.includes(":")) return "";
    let [h,m] = t.split(":").map(Number); const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12; return `${h}:${pad(m)} ${suffix}`;
  };
  const fmtDate = key => fromKey(key).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const fmtShortDate = key => fromKey(key).toLocaleDateString(undefined,{month:"short",day:"numeric"});
  const shiftHours = s => {
    let mins = parseTime(s.end) - parseTime(s.start);
    if (mins <= 0) mins += 1440;
    return mins / 60;
  };
  const endDescription = s => parseTime(s.end) <= parseTime(s.start) ? "next day" : "";
  const escapeHtml = str => String(str ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.shifts)) state.shifts = parsed.shifts;
        if (parsed.defaults) state.defaults = {...state.defaults, ...parsed.defaults};
      }
    } catch (e) { console.warn("Could not load saved schedule", e); }
    $("defaultStart").value = state.defaults.start;
    $("defaultEnd").value = state.defaults.end;
    $("defaultLabel").value = state.defaults.label;
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      showToast("Could not save. Export a backup or free browser storage.");
      return false;
    }
  }
  function showToast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function shiftsOn(key) { return state.shifts.filter(s => s.date === key).sort((a,b) => a.start.localeCompare(b.start)); }
  function monthShifts() {
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
    return state.shifts.filter(s => { const d = fromKey(s.date); return d.getFullYear()===y && d.getMonth()===m; });
  }
  function renderCalendar() {
    $("monthTitle").textContent = currentMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"});
    const grid = $("calendarGrid"); grid.innerHTML = "";
    const year = currentMonth.getFullYear(), month = currentMonth.getMonth();
    const first = new Date(year,month,1), startOffset = first.getDay();
    const total = Math.ceil((startOffset + new Date(year,month+1,0).getDate())/7)*7;
    const todayKey = dateKey(new Date());
    for (let i=0;i<total;i++) {
      const d = new Date(year,month,1-startOffset+i), key = dateKey(d);
      const b = document.createElement("button");
      b.type="button";
      b.className = "calendar-day" + (d.getMonth()!==month?" outside":"") + (key===selectedDate?" selected":"") + (key===todayKey?" today":"") + (shiftsOn(key).length?" has-shift":"") + (selectingDates && selectedDates.has(key)?" multi-selected":"");
      b.innerHTML = `<span class="day-number">${d.getDate()}</span>`;
      b.setAttribute("aria-label", `${fmtDate(key)}${shiftsOn(key).length ? ", shift scheduled":""}`);
      b.addEventListener("click", () => {
        if (selectingDates) {
          if (selectedDates.has(key)) selectedDates.delete(key); else selectedDates.add(key);
          if (d.getMonth()!==currentMonth.getMonth()) currentMonth=new Date(d.getFullYear(),d.getMonth(),1);
          render(); return;
        }
        selectedDate=key; if(d.getMonth()!==currentMonth.getMonth()) currentMonth=new Date(d.getFullYear(),d.getMonth(),1); render();
      });
      grid.appendChild(b);
    }
    const ms = monthShifts();
    $("monthShiftCount").textContent = ms.length;
    $("monthHours").textContent = ms.reduce((n,s)=>n+shiftHours(s),0).toLocaleString(undefined,{maximumFractionDigits:1});
    $("selectDatesBtn").textContent = selectingDates ? "✓ Done selecting" : "☑ Select dates";
    $("addSelectedDatesBtn").textContent = `Add selected (${selectedDates.size})`;
    $("addSelectedDatesBtn").disabled = selectedDates.size===0;
    $("selectionHint").classList.toggle("hidden", !selectingDates);
    $("calendarHint").textContent = selectingDates ? "Tap dates to select or deselect" : "Tap a date to view or edit";
  }
  function renderSelectedDay() {
    $("selectedDateTitle").textContent = fmtDate(selectedDate);
    const content = $("selectedDayContent"), shifts = shiftsOn(selectedDate);
    if (!shifts.length) {
      content.innerHTML = `<div class="empty-state">No shifts scheduled for this date.<br>Tap “Add shift” to put one on the calendar.</div>`;
      return;
    }
    content.innerHTML = shifts.map(s => `<article class="shift-card"><span class="shift-accent"></span><div class="shift-main"><strong>${escapeHtml(s.label)}</strong><p>${fmtTime(s.start)} – ${fmtTime(s.end)}${endDescription(s) ? " · "+endDescription(s):""} · ${shiftHours(s)} hrs</p>${s.notes ? `<p>${escapeHtml(s.notes)}</p>`:""}</div><button class="edit-btn" data-edit="${escapeHtml(s.id)}">Edit</button></article>`).join("");
    content.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click",()=>openShiftDialog(b.dataset.edit)));
  }
  function render() { renderCalendar(); renderSelectedDay(); }
  function openDialog(id) { const d=$(id); if(typeof d.showModal==="function") d.showModal(); else d.setAttribute("open",""); }
  function closeDialog(id) { const d=$(id); if(typeof d.close==="function") d.close(); else d.removeAttribute("open"); }
  function openShiftDialog(id=null, date=selectedDate) {
    const existing = id ? state.shifts.find(s=>s.id===id) : null;
    $("shiftDialogTitle").textContent = existing ? "Edit shift" : "Add a shift";
    $("shiftDialogEyebrow").textContent = existing ? "UPDATE YOUR SCHEDULE" : "SHIFT DETAILS";
    $("shiftId").value = existing?.id || "";
    $("shiftDate").value = existing?.date || date;
    $("shiftLabel").value = existing?.label || state.defaults.label;
    $("shiftStart").value = existing?.start || state.defaults.start;
    $("shiftEnd").value = existing?.end || state.defaults.end;
    $("shiftNotes").value = existing?.notes || "";
    $("deleteShiftBtn").classList.toggle("hidden", !existing);
    openDialog("shiftDialog");
  }
  function newId() { return (crypto.randomUUID ? crypto.randomUUID() : "s"+Date.now()+Math.random().toString(16).slice(2)); }
  function makeShift(date,label,start,end,notes="") { return {id:newId(),date,label:label.trim()||"Work shift",start,end,notes:notes.trim()}; }
  function validDateKey(key) { if(!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false; const d=fromKey(key); return dateKey(d)===key; }
  function hasShift(key) { return state.shifts.some(s=>s.date===key); }
  function upsertShift(shift, replace=true) {
    if(replace) state.shifts = state.shifts.filter(s=>s.id!==shift.id && !(s.date===shift.date && s.id!==shift.id));
    state.shifts.push(shift);
  }

  $("prevMonth").addEventListener("click",()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1);renderCalendar();});
  $("nextMonth").addEventListener("click",()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1);renderCalendar();});
  $("todayBtn").addEventListener("click",()=>{const now=new Date();selectedDate=dateKey(now);currentMonth=new Date(now.getFullYear(),now.getMonth(),1);render();});
  $("addShiftBtn").addEventListener("click",()=>openShiftDialog());
  $("navAdd").addEventListener("click",()=>openShiftDialog());
  $("navCalendar").addEventListener("click",()=>{document.querySelector(".calendar-panel").scrollIntoView({behavior:"smooth",block:"start"});});
  $("navRepeat").addEventListener("click",()=>openDialog("recurringDialog"));
  $("recurringBtn").addEventListener("click",()=>{
    $("repeatStartDate").value = selectedDate || knownAnchor;
    const end = new Date(fromKey(selectedDate)); end.setMonth(end.getMonth()+3);
    $("repeatEndDate").value = dateKey(end);
    $("repeatStartTime").value=state.defaults.start; $("repeatEndTime").value=state.defaults.end; $("repeatLabel").value=state.defaults.label;
    openDialog("recurringDialog");
  });
  function openBulkDialog(dates, fromCalendar=false) {
    bulkFromCalendar = fromCalendar;
    $("bulkStartTime").value=state.defaults.start; $("bulkEndTime").value=state.defaults.end; $("bulkLabel").value=state.defaults.label;
    $("bulkDates").value=dates.join("\n");
    $("bulkDatesLabel").classList.toggle("hidden", fromCalendar);
    $("bulkTip").classList.toggle("hidden", fromCalendar);
    $("calendarSelectedSummary").classList.toggle("hidden", !fromCalendar);
    $("calendarSelectedSummary").textContent = fromCalendar ? `${dates.length} date${dates.length===1?"":"s"} selected: ${dates.slice().sort().map(fmtShortDate).join(", ")}` : "";
    openDialog("bulkDialog");
  }
  $("bulkBtn").addEventListener("click",()=>openBulkDialog([selectedDate]));
  $("selectDatesBtn").addEventListener("click",()=>{
    selectingDates = !selectingDates;
    if (!selectingDates && selectedDates.size===0) showToast("No dates selected");
    renderCalendar();
  });
  $("addSelectedDatesBtn").addEventListener("click",()=>{
    if (!selectedDates.size) return;
    openBulkDialog([...selectedDates].sort(), true);
  });
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.dataset.close)));
  document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)closeDialog(d.id);}));

  $("shiftForm").addEventListener("submit",e=>{
    e.preventDefault();
    const id=$("shiftId").value, date=$("shiftDate").value, label=$("shiftLabel").value.trim(), start=$("shiftStart").value, end=$("shiftEnd").value;
    if(!validDateKey(date)||!label||!start||!end){showToast("Please complete the date, label, and times.");return;}
    const shift=makeShift(date,label,start,end,$("shiftNotes").value);
    if(id) { shift.id=id; state.shifts=state.shifts.filter(s=>s.id!==id); }
    state.shifts.push(shift); persist(); selectedDate=date; currentMonth=new Date(fromKey(date).getFullYear(),fromKey(date).getMonth(),1); closeDialog("shiftDialog");render();showToast(id?"Shift updated":"Shift saved");
  });
  $("deleteShiftBtn").addEventListener("click",()=>{
    const id=$("shiftId").value; if(!id)return;
    if(confirm("Delete this shift?")){state.shifts=state.shifts.filter(s=>s.id!==id);persist();closeDialog("shiftDialog");render();showToast("Shift deleted");}
  });
  $("recurringForm").addEventListener("submit",e=>{
    e.preventDefault();
    const startKey=$("repeatStartDate").value,endKey=$("repeatEndDate").value;
    const weekdays=[0,1,2,3,4,5,6].filter(i=>$("day"+i).checked);
    if(!validDateKey(startKey)||!validDateKey(endKey)||endKey<startKey){showToast("Choose a valid date range.");return;}
    if(!weekdays.length){showToast("Select at least one weekday.");return;}
    if((fromKey(endKey)-fromKey(startKey))/86400000>730){showToast("Please generate no more than two years at a time.");return;}
    const replace=$("repeatReplace").checked,label=$("repeatLabel").value.trim()||"Work shift",start=$("repeatStartTime").value,end=$("repeatEndTime").value;
    let added=0,skipped=0;
    for(let d=fromKey(startKey);dateKey(d)<=endKey;d.setDate(d.getDate()+1)){
      const key=dateKey(d); if(!weekdays.includes(d.getDay()))continue;
      if(hasShift(key)&&!replace){skipped++;continue;}
      state.shifts=state.shifts.filter(s=>s.date!==key);
      state.shifts.push(makeShift(key,label,start,end));added++;
    }
    persist();closeDialog("recurringDialog");selectedDate=startKey;currentMonth=new Date(fromKey(startKey).getFullYear(),fromKey(startKey).getMonth(),1);render();
    showToast(`Generated ${added} shifts${skipped?`; skipped ${skipped} dates already containing shifts`:""}.`);
  });
  $("bulkForm").addEventListener("submit",e=>{
    e.preventDefault();
    const dates=[...new Set($("bulkDates").value.split(/[\s,;]+/).map(x=>x.trim()).filter(validDateKey))];
    if(!dates.length){showToast("Enter at least one valid date in YYYY-MM-DD format.");return;}
    const label=$("bulkLabel").value.trim()||"Work shift",start=$("bulkStartTime").value,end=$("bulkEndTime").value,replace=$("bulkReplace").checked;
    let added=0,skipped=0;
    for(const key of dates){
      if(hasShift(key)&&!replace){skipped++;continue;}
      state.shifts=state.shifts.filter(s=>s.date!==key);
      state.shifts.push(makeShift(key,label,start,end));added++;
    }
    persist();closeDialog("bulkDialog");selectedDate=dates[0];currentMonth=new Date(fromKey(selectedDate).getFullYear(),fromKey(selectedDate).getMonth(),1);
    if (bulkFromCalendar) { selectedDates.clear(); selectingDates=false; }
    $("bulkDatesLabel").classList.remove("hidden"); $("bulkTip").classList.remove("hidden"); $("calendarSelectedSummary").classList.add("hidden"); bulkFromCalendar=false;
    render();
    showToast(`Added ${added} shifts${skipped?`; skipped ${skipped} existing dates`:""}.`);
  });
  $("saveDefaultsBtn").addEventListener("click",()=>{
    state.defaults={start:$("defaultStart").value||"07:00",end:$("defaultEnd").value||"17:00",label:$("defaultLabel").value.trim()||"Work shift"};
    persist();showToast("Preferences saved");
  });
  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="shift-calendar-backup.json";a.click();URL.revokeObjectURL(url);showToast("Backup exported");
  });
  $("importInput").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(!Array.isArray(parsed.shifts)||!parsed.defaults)throw new Error("Invalid backup");
      if(!confirm(`Import ${parsed.shifts.length} shifts? This replaces the current schedule.`))return;
      state={shifts:parsed.shifts,defaults:{...state.defaults,...parsed.defaults}};persist();load();render();showToast("Backup imported");
    }catch(err){showToast("That backup file could not be read.");}
    e.target.value="";
  });
  $("clearBtn").addEventListener("click",()=>{
    if(confirm("Delete every shift from this device? This cannot be undone unless you exported a backup.")){state.shifts=[];persist();render();showToast("All shifts deleted");}
  });

  if("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
  load();
  const defaultEnd = new Date(2026,9,26); defaultEnd.setMonth(defaultEnd.getMonth()+3);
  $("repeatEndDate").value=dateKey(defaultEnd);
  render();
})();
