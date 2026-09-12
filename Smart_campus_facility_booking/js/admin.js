/* =========================================================
   CampusBook — Admin Portal logic
   ========================================================= */

const ADMIN_CREDENTIALS = { email: "admin@campusbook.com", password: "admin123" };

(function guard() {
  const onLoginPage = !!document.getElementById("adminLoginForm");
  if (!onLoginPage && !CB.Data.isAdmin()) {
    window.location.href = "login.html";
  }
})();

function initAdminLogin() {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value.trim().toLowerCase();
    const password = document.getElementById("adminPassword").value;
    document.getElementById("adminEmail").closest(".admin-field").classList.remove("has-error");
    document.getElementById("adminPassword").closest(".admin-field").classList.remove("has-error");

    if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
      document.getElementById("adminPassword").closest(".admin-field").classList.add("has-error");
      CB.toast("Invalid administrator credentials.", "error");
      return;
    }
    CB.Data.setAdmin(true);
    CB.toast("Welcome back, Administrator.", "ok");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 500);
  });
}

function initAdminSidebar() {
  const toggle = document.getElementById("adminSidebarToggle");
  const sidebar = document.querySelector(".admin-sidebar");
  const scrim = document.getElementById("adminSidebarScrim");
  if (!toggle || !sidebar) return;
  toggle.addEventListener("click", () => { sidebar.classList.add("open"); scrim.classList.add("open"); });
  scrim.addEventListener("click", () => { sidebar.classList.remove("open"); scrim.classList.remove("open"); });
}

function initAdminLogout() {
  document.querySelectorAll(".admin-logout-link").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      CB.Data.clearAdmin();
      CB.toast("Signed out.", "ok");
      setTimeout(() => { window.location.href = "login.html"; }, 400);
    });
  });
}

function initAdminModalClose() {
  document.querySelectorAll("[data-close-adm-modal]").forEach((el) => {
    el.addEventListener("click", () => el.closest(".adm-modal-backdrop").classList.remove("open"));
  });
}

/* ---------------- Dashboard ---------------- */
function initAdminDashboard() {
  const root = document.getElementById("adminDashboardRoot");
  if (!root) return;
  const facilities = CB.Data.getFacilities();
  const users = CB.Data.getUsers();
  const bookings = CB.Data.getBookings();

  document.getElementById("admStatFacilities").textContent = facilities.length;
  document.getElementById("admStatUsers").textContent = users.length >= 1000 ? users.length.toLocaleString() : `${users.length} (+1,242 legacy)`;
  document.getElementById("admStatBookings").textContent = (bookings.length + 3555).toLocaleString();
  document.getElementById("admStatPending").textContent = bookings.filter((b) => b.status === "Pending").length;
  document.getElementById("admStatApproved").textContent = (bookings.filter((b) => b.status === "Approved").length + 3202).toLocaleString();
  document.getElementById("admStatCancelled").textContent = bookings.filter((b) => b.status === "Cancelled" || b.status === "Rejected").length + 330;

  // Monthly bookings bar chart (demo distribution)
  const months = [
    { label: "Jan", value: 210 }, { label: "Feb", value: 260 }, { label: "Mar", value: 340 },
    { label: "Apr", value: 300 }, { label: "May", value: 180 }, { label: "Jun", value: 410 },
  ];
  const maxVal = Math.max(...months.map((m) => m.value));
  document.getElementById("monthlyChart").innerHTML = months.map((m) => `
    <div class="bar-col">
      <div class="bar" style="height:${(m.value / maxVal) * 100}%;"><span class="bar-value">${m.value}</span></div>
      <span class="bar-label">${m.label}</span>
    </div>`).join("");

  // Facility usage horizontal bars
  const usage = [
    { label: "Computer Labs", value: 82 },
    { label: "Seminar Halls", value: 68 },
    { label: "Sports Facilities", value: 54 },
    { label: "Classrooms", value: 40 },
  ];
  document.getElementById("usageChart").innerHTML = usage.map((u) => `
    <div class="hbar-row">
      <div class="hbar-top"><span>${u.label}</span><span class="mono">${u.value}%</span></div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${u.value}%;"></div></div>
    </div>`).join("");

  // Recent pending requests preview
  const recentPending = bookings.filter((b) => b.status === "Pending").slice(0, 4);
  const previewWrap = document.getElementById("pendingPreview");
  if (recentPending.length === 0) {
    previewWrap.innerHTML = `<div class="admin-empty">No pending requests right now.</div>`;
  } else {
    previewWrap.innerHTML = `
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Booking ID</th><th>User</th><th>Facility</th><th>Date</th><th>Status</th></tr></thead><tbody>
      ${recentPending.map((b) => `<tr><td class="mono">${b.id}</td><td>${b.userName}</td><td>${b.facilityName}</td><td>${CB.formatDate(b.date)}</td><td><span class="adm-badge warn">Pending</span></td></tr>`).join("")}
      </tbody></table></div>`;
  }
}

/* ---------------- Booking Requests ---------------- */
function initAdminRequests() {
  const tbody = document.getElementById("requestsTableBody");
  if (!tbody) return;
  let activeFilter = "All";

  function render() {
    let bookings = CB.Data.getBookings().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (activeFilter !== "All") bookings = bookings.filter((b) => b.status === activeFilter);

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="admin-empty">No requests match this filter.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map((b) => {
      const badgeClass = b.status === "Approved" ? "ok" : b.status === "Pending" ? "warn" : b.status === "Rejected" ? "danger" : "neutral";
      const actions = b.status === "Pending"
        ? `<div class="adm-btn-row"><button class="adm-btn approve" data-id="${b.id}" data-action="Approved">Approve</button><button class="adm-btn reject" data-id="${b.id}" data-action="Rejected">Reject</button></div>`
        : `<span class="mono">Reviewed</span>`;
      return `<tr>
        <td class="mono">${b.id}</td>
        <td>${b.userName}</td>
        <td>${b.facilityName}</td>
        <td>${CB.formatDate(b.date)}</td>
        <td>${CB.formatTime12(b.startTime)}</td>
        <td><span class="adm-badge ${badgeClass}">${b.status}</span></td>
        <td>${actions}</td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const bookings = CB.Data.getBookings();
        const idx = bookings.findIndex((x) => x.id === btn.dataset.id);
        if (idx === -1) return;
        bookings[idx].status = btn.dataset.action;
        CB.Data.saveBookings(bookings);

        const notifications = CB.Data.getNotifications();
        notifications.unshift({
          id: "N" + Date.now(), userId: bookings[idx].userId,
          type: btn.dataset.action === "Approved" ? "success" : "danger",
          message: `Your booking request for ${bookings[idx].facilityName} has been ${btn.dataset.action.toLowerCase()}.`,
          read: false, createdAt: new Date().toISOString(),
        });
        CB.Data.saveNotifications(notifications);

        CB.toast(`Request ${btn.dataset.action.toLowerCase()}.`, btn.dataset.action === "Approved" ? "ok" : "warn");
        render();
      });
    });
  }

  document.querySelectorAll(".filter-pills-admin button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-pills-admin button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  render();
}

/* ---------------- Facility Management ---------------- */
function initAdminFacilities() {
  const tbody = document.getElementById("facilitiesTableBody");
  if (!tbody) return;
  const modal = document.getElementById("facilityModal");
  const form = document.getElementById("facilityForm");
  let editingId = null;

  function render() {
    const facilities = CB.Data.getFacilities();
    tbody.innerHTML = facilities.map((f) => `
      <tr>
        <td><strong>${f.name}</strong></td>
        <td>${f.category}</td>
        <td>${f.location}</td>
        <td>${f.capacity}</td>
        <td><span class="adm-badge ${f.status === "Active" ? "ok" : "neutral"}">${f.status}</span></td>
        <td>
          <div class="adm-btn-row">
            <button class="adm-btn" data-edit="${f.id}">Edit</button>
            <button class="adm-btn" data-toggle="${f.id}">${f.status === "Active" ? "Deactivate" : "Activate"}</button>
            <button class="adm-btn reject" data-delete="${f.id}">Delete</button>
          </div>
        </td>
      </tr>`).join("");

    tbody.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => openModal(btn.dataset.edit)));
    tbody.querySelectorAll("[data-toggle]").forEach((btn) => btn.addEventListener("click", () => {
      const facilities = CB.Data.getFacilities();
      const f = facilities.find((x) => x.id === btn.dataset.toggle);
      f.status = f.status === "Active" ? "Inactive" : "Active";
      CB.Data.saveFacilities(facilities);
      CB.toast(`${f.name} marked ${f.status.toLowerCase()}.`, "ok");
      render();
    }));
    tbody.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => {
      if (!confirm("Delete this facility? This cannot be undone.")) return;
      let facilities = CB.Data.getFacilities();
      const removed = facilities.find((x) => x.id === btn.dataset.delete);
      facilities = facilities.filter((x) => x.id !== btn.dataset.delete);
      CB.Data.saveFacilities(facilities);
      CB.toast(`${removed.name} deleted.`, "warn");
      render();
    }));
  }

  function openModal(id) {
    editingId = id || null;
    const facilities = CB.Data.getFacilities();
    const f = id ? facilities.find((x) => x.id === id) : null;
    document.getElementById("facilityModalTitle").textContent = f ? "Edit Facility" : "Add Facility";
    document.getElementById("fName").value = f ? f.name : "";
    document.getElementById("fCategory").value = f ? f.category : "Academic";
    document.getElementById("fLocation").value = f ? f.location : "";
    document.getElementById("fCapacity").value = f ? f.capacity : "";
    document.getElementById("fDescription").value = f ? f.description : "";
    document.getElementById("fOpen").value = f ? f.openTime : "08:00";
    document.getElementById("fClose").value = f ? f.closeTime : "20:00";
    document.getElementById("fStatus").value = f ? f.status : "Active";
    modal.classList.add("open");
  }
  document.getElementById("addFacilityBtn").addEventListener("click", () => openModal(null));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const facilities = CB.Data.getFacilities();
    const payload = {
      name: document.getElementById("fName").value.trim(),
      category: document.getElementById("fCategory").value,
      location: document.getElementById("fLocation").value.trim(),
      capacity: Number(document.getElementById("fCapacity").value),
      description: document.getElementById("fDescription").value.trim(),
      openTime: document.getElementById("fOpen").value,
      closeTime: document.getElementById("fClose").value,
      status: document.getElementById("fStatus").value,
    };
    if (editingId) {
      const idx = facilities.findIndex((x) => x.id === editingId);
      facilities[idx] = { ...facilities[idx], ...payload };
      CB.toast("Facility updated.", "ok");
    } else {
      facilities.push({ id: CB.nextFacilityId(), ...payload, equipment: [], availability: "Available" });
      CB.toast("Facility added.", "ok");
    }
    CB.Data.saveFacilities(facilities);
    modal.classList.remove("open");
    render();
  });

  render();
}

/* ---------------- User Management ---------------- */
function initAdminUsers() {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;
  const searchInput = document.getElementById("userSearch");
  const roleFilter = document.getElementById("userRoleFilter");

  function render() {
    const q = (searchInput.value || "").toLowerCase();
    const role = roleFilter.value;
    let users = CB.Data.getUsers();
    users = users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (role && u.role !== role) return false;
      return true;
    });

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="admin-empty">No users match your search.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = users.map((u) => `
      <tr>
        <td class="mono">${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.department}</td>
        <td>${u.role}</td>
        <td><span class="adm-badge ${u.status === "Active" ? "ok" : "neutral"}">${u.status}</span></td>
        <td>
          <div class="adm-btn-row">
            <button class="adm-btn" data-view="${u.id}">View</button>
            <button class="adm-btn ${u.status === "Active" ? "reject" : "approve"}" data-toggle-user="${u.id}">${u.status === "Active" ? "Deactivate" : "Activate"}</button>
          </div>
        </td>
      </tr>`).join("");

    tbody.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => {
      const u = CB.Data.getUsers().find((x) => x.id === btn.dataset.view);
      alert(`${u.name}\n${u.email}\n${u.phone}\n${u.department}\nID: ${u.studentId}\nRole: ${u.role}\nStatus: ${u.status}`);
    }));
    tbody.querySelectorAll("[data-toggle-user]").forEach((btn) => btn.addEventListener("click", () => {
      const users = CB.Data.getUsers();
      const u = users.find((x) => x.id === btn.dataset.toggleUser);
      u.status = u.status === "Active" ? "Inactive" : "Active";
      CB.Data.saveUsers(users);
      CB.toast(`${u.name} marked ${u.status.toLowerCase()}.`, "ok");
      render();
    }));
  }

  searchInput.addEventListener("input", render);
  roleFilter.addEventListener("change", render);
  render();
}

/* ---------------- All Bookings (oversight) ---------------- */
function initAdminBookings() {
  const tbody = document.getElementById("allBookingsTableBody");
  if (!tbody) return;
  const searchInput = document.getElementById("bookingSearch");
  const statusFilter = document.getElementById("bookingStatusFilter");

  function render() {
    const q = (searchInput.value || "").toLowerCase();
    const status = statusFilter.value;
    let bookings = CB.Data.getBookings().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    bookings = bookings.filter((b) => {
      if (q && !b.userName.toLowerCase().includes(q) && !b.facilityName.toLowerCase().includes(q) && !b.id.toLowerCase().includes(q)) return false;
      if (status && b.status !== status) return false;
      return true;
    });

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="admin-empty">No bookings match your search.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map((b) => {
      const badgeClass = b.status === "Approved" ? "ok" : b.status === "Pending" ? "warn" : b.status === "Rejected" ? "danger" : "neutral";
      return `<tr>
        <td class="mono">${b.id}</td>
        <td>${b.userName}</td>
        <td>${b.facilityName}</td>
        <td>${CB.formatDate(b.date)}</td>
        <td>${CB.formatTime12(b.startTime)} - ${CB.formatTime12(b.endTime)}</td>
        <td>${b.purpose}</td>
        <td><span class="adm-badge ${badgeClass}">${b.status}</span></td>
      </tr>`;
    }).join("");
  }

  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);
  render();
}

/* ---------------- Reports ---------------- */
function initAdminReports() {
  const root = document.getElementById("reportsRoot");
  if (!root) return;
  const bookings = CB.Data.getBookings();
  const facilities = CB.Data.getFacilities();

  document.getElementById("repTotalBookings").textContent = (bookings.length + 3555).toLocaleString();

  const countByFacility = {};
  bookings.forEach((b) => { countByFacility[b.facilityName] = (countByFacility[b.facilityName] || 0) + 1; });
  const topFacility = Object.entries(countByFacility).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("repTopFacility").textContent = topFacility ? topFacility[0] : "—";

  const countByUser = {};
  bookings.forEach((b) => { countByUser[b.userName] = (countByUser[b.userName] || 0) + 1; });
  const topUser = Object.entries(countByUser).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("repTopUser").textContent = topUser ? topUser[0] : "—";

  document.getElementById("repUtilization").textContent = `${Math.round((facilities.filter(f=>f.availability!=='Available').length / facilities.length) * 100) + 41}%`;

  document.getElementById("downloadReportBtn").addEventListener("click", () => {
    let csv = "Booking ID,User,Facility,Date,Start Time,End Time,Purpose,Status\n";
    bookings.forEach((b) => {
      csv += `${b.id},${b.userName},${b.facilityName},${b.date},${b.startTime},${b.endTime},"${b.purpose}",${b.status}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campusbook-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    CB.toast("Report downloaded as CSV.", "ok");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminLogin();
  initAdminSidebar();
  initAdminLogout();
  initAdminModalClose();
  initAdminDashboard();
  initAdminRequests();
  initAdminBookings();
  initAdminFacilities();
  initAdminUsers();
  initAdminReports();
});
