/* =========================================================
   CampusBook — Core data layer & shared utilities
   Frontend-only demo. All "database" state lives in localStorage.
   ========================================================= */

const CB = (function () {
  const KEYS = {
    facilities: "cb_facilities",
    bookings: "cb_bookings",
    notifications: "cb_notifications",
    users: "cb_users",
    session: "cb_session",
    adminSession: "cb_admin_session",
    seeded: "cb_seeded_v1",
  };

  /* ---------------- Seed demo data (runs once) ---------------- */
  function seed() {
    if (localStorage.getItem(KEYS.seeded)) return;

    const facilities = [
      { id: "F001", name: "Central Auditorium", category: "Academic", location: "Main Block, Ground Floor", capacity: 500, equipment: ["Stage Lighting", "Sound System", "Projector", "Air Conditioning"], openTime: "08:00", closeTime: "21:00", status: "Active", availability: "Available", description: "The university's flagship venue for convocations, guest lectures and large-scale events, fitted with tiered seating and a full AV rig." },
      { id: "F002", name: "Seminar Hall A", category: "Academic", location: "Academic Block, 1st Floor", capacity: 250, equipment: ["Projector", "Sound System", "Air Conditioning", "Wi-Fi"], openTime: "08:00", closeTime: "20:00", status: "Active", availability: "Available", description: "A tiered seminar hall suited to department seminars, guest talks and mid-sized conferences." },
      { id: "F003", name: "Seminar Hall B", category: "Academic", location: "Academic Block, 1st Floor", capacity: 180, equipment: ["Projector", "Sound System", "Wi-Fi"], openTime: "08:00", closeTime: "20:00", status: "Active", availability: "Booked", description: "A compact seminar hall ideal for workshops and departmental sessions." },
      { id: "F004", name: "Computer Lab 01", category: "Academic", location: "Block A, 2nd Floor", capacity: 60, equipment: ["60 Workstations", "Projector", "Air Conditioning", "Wi-Fi"], openTime: "08:00", closeTime: "19:00", status: "Active", availability: "Available", description: "A fully networked lab for programming labs, hackathons and technical workshops." },
      { id: "F005", name: "Computer Lab 02", category: "Academic", location: "Block A, 2nd Floor", capacity: 45, equipment: ["45 Workstations", "Projector", "Wi-Fi"], openTime: "08:00", closeTime: "19:00", status: "Active", availability: "Available", description: "A mid-sized lab suited for tutorials, coding contests and short training sessions." },
      { id: "F006", name: "Smart Classroom 101", category: "Academic", location: "Block B, 1st Floor", capacity: 70, equipment: ["Smart Board", "Projector", "Air Conditioning"], openTime: "08:00", closeTime: "18:00", status: "Active", availability: "Available", description: "An interactive classroom with a smart board, suited for lectures and flipped-classroom sessions." },
      { id: "F007", name: "Innovation Lab", category: "Academic", location: "Block C, Ground Floor", capacity: 40, equipment: ["3D Printers", "Prototyping Bench", "Wi-Fi", "Whiteboard Walls"], openTime: "09:00", closeTime: "20:00", status: "Active", availability: "Available", description: "A maker space for capstone projects, prototyping and student-led R&D." },
      { id: "F008", name: "Conference Room", category: "Academic", location: "Admin Block, 3rd Floor", capacity: 20, equipment: ["Video Conferencing", "Projector", "Whiteboard"], openTime: "08:00", closeTime: "19:00", status: "Active", availability: "Available", description: "A boardroom-style space for committee meetings, panel interviews and video conferences." },
      { id: "F009", name: "Basketball Court", category: "Sports", location: "Sports Complex", capacity: 30, equipment: ["Floodlights", "Scoreboard"], openTime: "06:00", closeTime: "21:00", status: "Active", availability: "Available", description: "A full-size outdoor court with floodlighting for evening matches and practice." },
      { id: "F010", name: "Badminton Court", category: "Sports", location: "Indoor Sports Hall", capacity: 16, equipment: ["Wooden Flooring", "Nets", "Floodlights"], openTime: "06:00", closeTime: "22:00", status: "Active", availability: "Available", description: "Two indoor courts with sprung wooden flooring for singles and doubles play." },
      { id: "F011", name: "Cricket Ground", category: "Sports", location: "Sports Complex, East Wing", capacity: 40, equipment: ["Practice Nets", "Pavilion", "Scoreboard"], openTime: "06:00", closeTime: "19:00", status: "Active", availability: "Available", description: "A full-size cricket ground with practice nets, used for inter-department tournaments." },
      { id: "F012", name: "Gymnasium", category: "Sports", location: "Sports Complex, 1st Floor", capacity: 50, equipment: ["Free Weights", "Cardio Machines", "Air Conditioning"], openTime: "05:30", closeTime: "22:00", status: "Active", availability: "Booked", description: "A fully equipped fitness centre for strength training and cardio." },
      { id: "F013", name: "Library Discussion Room", category: "Student Spaces", location: "Central Library, 2nd Floor", capacity: 10, equipment: ["Whiteboard", "Wi-Fi", "Air Conditioning"], openTime: "08:00", closeTime: "22:00", status: "Active", availability: "Available", description: "A quiet, glass-walled room for group study and project discussions." },
      { id: "F014", name: "Innovation Meeting Room", category: "Student Spaces", location: "Block C, 1st Floor", capacity: 12, equipment: ["Display Screen", "Wi-Fi", "Whiteboard"], openTime: "09:00", closeTime: "20:00", status: "Active", availability: "Available", description: "A club and society meeting room with a wall display for planning sessions." },
      { id: "F015", name: "Study Room 3", category: "Student Spaces", location: "Central Library, 3rd Floor", capacity: 8, equipment: ["Wi-Fi", "Reading Lamps"], openTime: "08:00", closeTime: "23:00", status: "Active", availability: "Available", description: "A silent-study room for focused, individual or paired revision." },
    ];

    const bookings = [
      { id: "BK-2026-001", userId: "U1001", userName: "Ayush Verma", facilityId: "F002", facilityName: "Seminar Hall A", date: "2026-09-20", startTime: "10:00", endTime: "12:00", purpose: "Department Alumni Talk", participants: 120, status: "Approved", createdAt: "2026-09-08T09:12:00" },
      { id: "BK-2026-002", userId: "U1001", userName: "Ayush Verma", facilityId: "F004", facilityName: "Computer Lab 01", date: "2026-09-22", startTime: "14:00", endTime: "16:00", purpose: "DBMS Project Practice Session", participants: 12, status: "Pending", createdAt: "2026-09-10T11:40:00" },
      { id: "BK-2026-003", userId: "U1001", userName: "Ayush Verma", facilityId: "F010", facilityName: "Badminton Court", date: "2026-09-05", startTime: "17:00", endTime: "18:00", purpose: "Inter-hostel Practice", participants: 4, status: "Rejected", createdAt: "2026-08-30T16:02:00" },
      { id: "BK-2026-004", userId: "U1001", userName: "Ayush Verma", facilityId: "F013", facilityName: "Library Discussion Room", date: "2026-08-28", startTime: "15:00", endTime: "17:00", purpose: "Capstone Group Discussion", participants: 5, status: "Cancelled", createdAt: "2026-08-25T10:00:00" },
      { id: "BK-2026-005", userId: "U1002", userName: "Priya Singh", facilityId: "F004", facilityName: "Computer Lab 01", date: "2026-09-21", startTime: "14:00", endTime: "16:00", purpose: "Coding Club Workshop", participants: 40, status: "Approved", createdAt: "2026-09-09T08:15:00" },
      { id: "BK-2026-006", userId: "U1003", userName: "Rahul Sharma", facilityId: "F002", facilityName: "Seminar Hall A", date: "2026-09-20", startTime: "10:00", endTime: "12:00", purpose: "IEEE Chapter Meet", participants: 90, status: "Pending", createdAt: "2026-09-11T13:22:00" },
      { id: "BK-2026-007", userId: "U1004", userName: "Sneha Patil", facilityId: "F009", facilityName: "Basketball Court", date: "2026-09-18", startTime: "17:00", endTime: "18:30", purpose: "Inter-branch Tournament", participants: 20, status: "Pending", createdAt: "2026-09-10T18:03:00" },
    ];

    const notifications = [
      { id: "N001", userId: "U1001", type: "success", message: "Your booking request for Seminar Hall A has been approved.", read: false, createdAt: "2026-09-08T09:30:00" },
      { id: "N002", userId: "U1001", type: "pending", message: "Your booking request for Computer Lab 01 is pending approval.", read: false, createdAt: "2026-09-10T11:41:00" },
      { id: "N003", userId: "U1001", type: "danger", message: "Your booking request for Badminton Court has been rejected.", read: true, createdAt: "2026-09-01T09:00:00" },
      { id: "N004", userId: "U1001", type: "neutral", message: "Your booking for Library Discussion Room has been cancelled.", read: true, createdAt: "2026-08-25T10:05:00" },
      { id: "N005", userId: "U1001", type: "info", message: "Central Auditorium is now open for Founders' Week bookings.", read: true, createdAt: "2026-08-20T12:00:00" },
    ];

    const users = [
      { id: "U1001", name: "Ayush Verma", email: "ayush.verma@campus.edu", phone: "+91 98765 43210", department: "Computer Science & Engineering", studentId: "CSE21B045", role: "Student", status: "Active", password: "demo1234" },
      { id: "U1002", name: "Priya Singh", email: "priya.singh@campus.edu", phone: "+91 98123 45678", department: "Electronics & Communication", studentId: "ECE21B012", role: "Student", status: "Active", password: "demo1234" },
      { id: "U1003", name: "Rahul Sharma", email: "rahul.sharma@campus.edu", phone: "+91 97654 32109", department: "Mechanical Engineering", studentId: "ME20B078", role: "Student", status: "Active", password: "demo1234" },
      { id: "U1004", name: "Sneha Patil", email: "sneha.patil@campus.edu", phone: "+91 96543 21098", department: "Information Technology", studentId: "IT22B033", role: "Student", status: "Active", password: "demo1234" },
      { id: "U1005", name: "Dr. Kavita Rao", email: "kavita.rao@campus.edu", phone: "+91 95432 10987", department: "Computer Science & Engineering", studentId: "FAC-CSE-014", role: "Faculty", status: "Active", password: "demo1234" },
      { id: "U1006", name: "Arjun Mehta", email: "arjun.mehta@campus.edu", phone: "+91 94321 09876", department: "Civil Engineering", studentId: "CE21B091", role: "Student", status: "Inactive", password: "demo1234" },
    ];

    localStorage.setItem(KEYS.facilities, JSON.stringify(facilities));
    localStorage.setItem(KEYS.bookings, JSON.stringify(bookings));
    localStorage.setItem(KEYS.notifications, JSON.stringify(notifications));
    localStorage.setItem(KEYS.users, JSON.stringify(users));
    localStorage.setItem(KEYS.seeded, "true");
  }

  /* ---------------- Generic storage helpers ---------------- */
  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  const Data = {
    getFacilities: () => get(KEYS.facilities, []),
    saveFacilities: (f) => set(KEYS.facilities, f),
    getBookings: () => get(KEYS.bookings, []),
    saveBookings: (b) => set(KEYS.bookings, b),
    getNotifications: () => get(KEYS.notifications, []),
    saveNotifications: (n) => set(KEYS.notifications, n),
    getUsers: () => get(KEYS.users, []),
    saveUsers: (u) => set(KEYS.users, u),
    getSession: () => get(KEYS.session, null),
    setSession: (s) => set(KEYS.session, s),
    clearSession: () => localStorage.removeItem(KEYS.session),
    isAdmin: () => get(KEYS.adminSession, false) === true,
    setAdmin: (v) => set(KEYS.adminSession, v),
    clearAdmin: () => localStorage.removeItem(KEYS.adminSession),
  };

  /* ---------------- ID generation ---------------- */
  function nextBookingId() {
    const bookings = Data.getBookings();
    const year = new Date().getFullYear();
    let max = 0;
    bookings.forEach((b) => {
      const m = b.id.match(/BK-(\d+)-(\d+)/);
      if (m) max = Math.max(max, parseInt(m[2], 10));
    });
    return `BK-${year}-${String(max + 1).padStart(3, "0")}`;
  }
  function nextFacilityId() {
    const f = Data.getFacilities();
    let max = 0;
    f.forEach((x) => {
      const m = x.id.match(/F(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `F${String(max + 1).padStart(3, "0")}`;
  }
  function nextUserId() {
    const u = Data.getUsers();
    let max = 1000;
    u.forEach((x) => {
      const m = x.id.match(/U(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `U${max + 1}`;
  }

  /* ---------------- Toasts ---------------- */
  function ensureToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }
  const ICONS = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
  };
  function toast(message, type = "ok", timeout = 3800) {
    const stack = ensureToastStack();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `${ICONS[type] || ICONS.ok}<span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.transition = "all .2s ease";
      setTimeout(() => el.remove(), 200);
    }, timeout);
  }

  /* ---------------- Mobile nav ---------------- */
  function initMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("open")));
  }

  /* ---------------- Auth guards ---------------- */
  function requireUserAuth() {
    if (!Data.getSession()) {
      window.location.href = pathTo("login.html");
    }
  }
  function pathTo(target) {
    // works whether called from root or /user//admin subfolder
    const inSub = /\/(user|admin)\//.test(window.location.pathname);
    return inSub ? "../" + target : target;
  }

  /* ---------------- Format helpers ---------------- */
  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }
  function formatTime12(t) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }
  function statusBadgeClass(status) {
    switch (status) {
      case "Approved": return "ok";
      case "Pending": return "warn";
      case "Rejected": return "danger";
      case "Cancelled": return "neutral";
      default: return "neutral";
    }
  }
  function categoryIconSvg(category) {
    if (category === "Sports") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3C9.5 5.6 9.5 18.4 12 21"/></svg>';
    }
    if (category === "Student Spaces") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 4v5h5"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>';
  }
  function catClass(category) {
    if (category === "Sports") return "sports";
    if (category === "Student Spaces") return "student";
    return "academic";
  }

  return {
    seed, Data, KEYS,
    nextBookingId, nextFacilityId, nextUserId,
    toast, initMobileNav, requireUserAuth, pathTo,
    formatDate, formatTime12, statusBadgeClass, categoryIconSvg, catClass,
  };
})();

CB.seed();
document.addEventListener("DOMContentLoaded", CB.initMobileNav);

/* =========================================================
   Public pages: facilities listing, details, auth forms
   ========================================================= */

function renderFacilityCard(f) {
  const availBadge = f.availability === "Available"
    ? '<span class="badge ok">Available</span>'
    : f.availability === "Booked"
      ? '<span class="badge warn">Booked</span>'
      : '<span class="badge neutral">Maintenance</span>';
  return `
    <div class="facility-card" data-id="${f.id}" data-category="${f.category}" data-location="${f.location}" data-capacity="${f.capacity}" data-availability="${f.availability}" data-name="${f.name.toLowerCase()}">
      <div class="facility-media icon-${CB.catClass(f.category)}">
        <span class="cat-bar tag-${CB.catClass(f.category)}"></span>
        ${CB.categoryIconSvg(f.category)}
      </div>
      <div class="facility-body">
        <h3>${f.name}</h3>
        <div class="facility-meta">
          <span>📍 ${f.location}</span>
          <span>👥 Capacity: ${f.capacity}</span>
          <span>🏷️ ${f.category}</span>
        </div>
        ${availBadge}
        <div class="facility-actions">
          <a class="btn btn-ghost" href="facility-details.html?id=${f.id}">View Details</a>
          <a class="btn btn-primary" href="facility-details.html?id=${f.id}#book">Book Now</a>
        </div>
      </div>
    </div>`;
}

function initFacilitiesPage() {
  const grid = document.getElementById("facilityGrid");
  if (!grid) return;
  const facilities = CB.Data.getFacilities().filter((f) => f.status === "Active");
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const locationFilter = document.getElementById("locationFilter");
  const availabilityFilter = document.getElementById("availabilityFilter");
  const resultCount = document.getElementById("resultCount");
  const emptyState = document.getElementById("emptyState");

  // populate location filter dynamically
  const locations = [...new Set(facilities.map((f) => f.location))];
  locations.forEach((loc) => {
    const opt = document.createElement("option");
    opt.value = loc;
    opt.textContent = loc;
    locationFilter.appendChild(opt);
  });

  // preselect category from query string (from landing page links)
  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get("category");
  if (initialCategory) categoryFilter.value = initialCategory;

  function apply() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const loc = locationFilter.value;
    const avail = availabilityFilter.value;

    const filtered = facilities.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q) && !f.location.toLowerCase().includes(q)) return false;
      if (cat && f.category !== cat) return false;
      if (loc && f.location !== loc) return false;
      if (avail && f.availability !== avail) return false;
      return true;
    });

    grid.innerHTML = filtered.map(renderFacilityCard).join("");
    resultCount.textContent = `${filtered.length} facilit${filtered.length === 1 ? "y" : "ies"} found`;
    emptyState.style.display = filtered.length === 0 ? "block" : "none";
    grid.style.display = filtered.length === 0 ? "none" : "grid";
  }

  [searchInput, categoryFilter, locationFilter, availabilityFilter].forEach((el) => {
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });

  apply();
}

function initFacilityDetailsPage() {
  const root = document.getElementById("detailsRoot");
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const facility = CB.Data.getFacilities().find((f) => f.id === id) || CB.Data.getFacilities()[0];

  document.title = `${facility.name} — CampusBook`;
  document.getElementById("facName").textContent = facility.name;
  document.getElementById("facDesc").textContent = facility.description;
  document.getElementById("facCategory").textContent = facility.category;
  document.getElementById("facLocation").textContent = facility.location;
  document.getElementById("facCapacity").textContent = facility.capacity;
  document.getElementById("facHoursOpen").textContent = CB.formatTime12(facility.openTime);
  document.getElementById("facHoursClose").textContent = CB.formatTime12(facility.closeTime);
  const equipWrap = document.getElementById("facEquipment");
  equipWrap.innerHTML = facility.equipment.map((e) => `<span class="equip-chip">${e}</span>`).join("");
  const media = document.getElementById("facMedia");
  media.classList.add(`icon-${CB.catClass(facility.category)}`);
  media.innerHTML = CB.categoryIconSvg(facility.category);
  const badge = document.getElementById("facAvailBadge");
  const availClass = facility.availability === "Available" ? "ok" : facility.availability === "Booked" ? "warn" : "neutral";
  badge.className = `badge ${availClass}`;
  badge.innerHTML = facility.availability;

  document.getElementById("bookingFacilityId").value = facility.id;

  const checkBtn = document.getElementById("checkAvailabilityBtn");
  const confirmBtn = document.getElementById("confirmBookingBtn");
  const resultBox = document.getElementById("availabilityResult");
  const confirmedBox = document.getElementById("bookingConfirmed");

  checkBtn.addEventListener("click", () => {
    const date = document.getElementById("bookDate").value;
    const start = document.getElementById("bookStart").value;
    const end = document.getElementById("bookEnd").value;
    const purpose = document.getElementById("bookPurpose").value.trim();

    if (!date || !start || !end || !purpose) {
      resultBox.className = "badge danger";
      resultBox.style.display = "inline-flex";
      resultBox.textContent = "✕ Please fill in date, time and purpose first.";
      confirmBtn.style.display = "none";
      return;
    }
    if (start >= end) {
      resultBox.className = "badge danger";
      resultBox.style.display = "inline-flex";
      resultBox.textContent = "✕ End time must be after start time.";
      confirmBtn.style.display = "none";
      return;
    }

    // check clashing bookings for same facility/date/time (demo logic)
    const bookings = CB.Data.getBookings();
    const clash = bookings.some((b) =>
      b.facilityId === facility.id &&
      b.date === date &&
      b.status !== "Rejected" && b.status !== "Cancelled" &&
      start < b.endTime && end > b.startTime
    );

    if (clash || facility.availability === "Maintenance") {
      resultBox.className = "badge danger";
      resultBox.style.display = "inline-flex";
      resultBox.textContent = "✕ Facility is not available at this time.";
      confirmBtn.style.display = "none";
    } else {
      resultBox.className = "badge ok";
      resultBox.style.display = "inline-flex";
      resultBox.textContent = "✓ Facility is available";
      confirmBtn.style.display = "inline-flex";
    }
  });

  confirmBtn.addEventListener("click", () => {
    const session = CB.Data.getSession();
    if (!session) {
      CB.toast("Please log in to confirm a booking.", "warn");
      window.location.href = `login.html?redirect=facility-details.html?id=${facility.id}`;
      return;
    }
    const date = document.getElementById("bookDate").value;
    const start = document.getElementById("bookStart").value;
    const end = document.getElementById("bookEnd").value;
    const purpose = document.getElementById("bookPurpose").value.trim();
    const participants = document.getElementById("bookParticipants").value || 1;

    const booking = {
      id: CB.nextBookingId(),
      userId: session.id,
      userName: session.name,
      facilityId: facility.id,
      facilityName: facility.name,
      date, startTime: start, endTime: end, purpose,
      participants: Number(participants),
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    const bookings = CB.Data.getBookings();
    bookings.push(booking);
    CB.Data.saveBookings(bookings);

    const notifications = CB.Data.getNotifications();
    notifications.unshift({
      id: "N" + Date.now(),
      userId: session.id,
      type: "pending",
      message: `Your booking request for ${facility.name} is pending approval.`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    CB.Data.saveNotifications(notifications);

    document.getElementById("bookingForm").style.display = "none";
    confirmedBox.style.display = "block";
    confirmedBox.innerHTML = `
      <h3>Booking Confirmed!</h3>
      <div class="hours-row"><span>Booking ID</span><strong>${booking.id}</strong></div>
      <div class="hours-row"><span>Facility</span><strong>${facility.name}</strong></div>
      <div class="hours-row"><span>Date</span><strong>${CB.formatDate(date)}</strong></div>
      <div class="hours-row"><span>Time</span><strong>${CB.formatTime12(start)} - ${CB.formatTime12(end)}</strong></div>
      <div class="hours-row"><span>Status</span><span class="badge warn">Pending</span></div>
      <a href="user/my-bookings.html" class="btn btn-primary btn-block" style="margin-top:18px;">View My Bookings</a>
    `;
    CB.toast("Booking request submitted successfully.", "ok");
  });
}

/* ---------------- Login / Register simulation ---------------- */
function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const users = CB.Data.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email);

    clearFieldError("loginEmail");
    clearFieldError("loginPassword");

    if (!user) {
      setFieldError("loginEmail", "No account found with this email.");
      return;
    }
    if (user.status === "Inactive") {
      CB.toast("This account has been deactivated. Contact administration.", "error");
      return;
    }
    if (user.password !== password) {
      setFieldError("loginPassword", "Incorrect password. Try demo1234.");
      return;
    }
    CB.Data.setSession({ id: user.id, name: user.name, email: user.email, department: user.department });
    CB.toast(`Welcome back, ${user.name.split(" ")[0]}!`, "ok");
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    setTimeout(() => { window.location.href = redirect || "user/dashboard.html"; }, 600);
  });
}

function initRegisterPage() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    const fields = ["regName", "regEmail", "regPhone", "regDepartment", "regId", "regPassword", "regConfirm"];
    fields.forEach(clearFieldError);

    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const phone = document.getElementById("regPhone").value.trim();
    const department = document.getElementById("regDepartment").value;
    const studentId = document.getElementById("regId").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirm").value;

    if (name.length < 3) { setFieldError("regName", "Enter your full name."); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError("regEmail", "Enter a valid email address."); valid = false; }
    else if (CB.Data.getUsers().some((u) => u.email.toLowerCase() === email.toLowerCase())) { setFieldError("regEmail", "An account with this email already exists."); valid = false; }
    if (!/^[+\d][\d\s-]{8,14}$/.test(phone)) { setFieldError("regPhone", "Enter a valid phone number."); valid = false; }
    if (!department) { setFieldError("regDepartment", "Select your department."); valid = false; }
    if (studentId.length < 4) { setFieldError("regId", "Enter your student / faculty ID."); valid = false; }
    if (password.length < 6) { setFieldError("regPassword", "Password must be at least 6 characters."); valid = false; }
    if (confirm !== password) { setFieldError("regConfirm", "Passwords do not match."); valid = false; }

    if (!valid) return;

    const users = CB.Data.getUsers();
    const newUser = {
      id: CB.nextUserId(), name, email, phone, department, studentId,
      role: "Student", status: "Active", password,
    };
    users.push(newUser);
    CB.Data.saveUsers(users);
    CB.toast("Account created successfully. Please log in.", "ok");
    setTimeout(() => { window.location.href = "login.html"; }, 900);
  });
}

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const field = input.closest(".field");
  field.classList.add("has-error");
  field.querySelector(".error-msg").textContent = message;
}
function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const field = input.closest(".field");
  field.classList.remove("has-error");
}

document.addEventListener("DOMContentLoaded", () => {
  initFacilitiesPage();
  initFacilityDetailsPage();
  initLoginPage();
  initRegisterPage();
});
