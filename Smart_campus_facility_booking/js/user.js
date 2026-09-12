/* =========================================================
   CampusBook — User Portal logic
   ========================================================= */

(function guard() {
  CB.requireUserAuth();
})();

function initSidebarToggle() {
  const toggle = document.getElementById("sidebarToggle");
  const sidebar = document.querySelector(".app-sidebar");
  const scrim = document.getElementById("sidebarScrim");
  if (!toggle || !sidebar) return;
  const open = () => { sidebar.classList.add("open"); scrim.classList.add("open"); };
  const close = () => { sidebar.classList.remove("open"); scrim.classList.remove("open"); };
  toggle.addEventListener("click", open);
  scrim.addEventListener("click", close);
}

function initLogout() {
  document.querySelectorAll(".logout-link").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      CB.Data.clearSession();
      CB.toast("You have been logged out.", "ok");
      setTimeout(() => { window.location.href = "../login.html"; }, 500);
    });
  });
}

function populateUserChip() {
  const session = CB.Data.getSession();
  if (!session) return;
  document.querySelectorAll(".user-chip .avatar-circle").forEach((el) => {
    el.textContent = session.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  });
  document.querySelectorAll(".user-chip .user-chip-name").forEach((el) => { el.textContent = session.name; });
}

function currentUserBookings() {
  const session = CB.Data.getSession();
  return CB.Data.getBookings().filter((b) => b.userId === session.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* ---------------- Dashboard ---------------- */
function initDashboard() {
  const root = document.getElementById("dashboardRoot");
  if (!root) return;
  const session = CB.Data.getSession();
  const bookings = currentUserBookings();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  document.getElementById("greetingText").textContent = `${greeting}, ${session.name.split(" ")[0]} \uD83D\uDC4B`;

  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === "Pending").length;
  const approved = bookings.filter((b) => b.status === "Approved").length;
  const cancelled = bookings.filter((b) => b.status === "Cancelled" || b.status === "Rejected").length;
  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statApproved").textContent = approved;
  document.getElementById("statCancelled").textContent = cancelled;

  const upcoming = bookings
    .filter((b) => b.status === "Approved" || b.status === "Pending")
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  const upcomingWrap = document.getElementById("upcomingWrap");
  if (upcoming) {
    upcomingWrap.innerHTML = `
      <div class="upcoming-card">
        <div>
          <div class="facility-name">${upcoming.facilityName}</div>
          <div class="meta">${CB.formatDate(upcoming.date)} &middot; ${CB.formatTime12(upcoming.startTime)} - ${CB.formatTime12(upcoming.endTime)}</div>
          <span class="badge ${CB.statusBadgeClass(upcoming.status)}" style="margin-top:10px;">${upcoming.status}</span>
        </div>
        <a href="my-bookings.html" class="btn btn-outline">View Booking</a>
      </div>`;
  } else {
    upcomingWrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        <h3>No upcoming bookings</h3>
        <p>Browse facilities and reserve your next slot.</p>
      </div>`;
  }

  const recWrap = document.getElementById("recommendedGrid");
  const facilities = CB.Data.getFacilities().filter((f) => f.status === "Active" && f.availability === "Available").slice(0, 3);
  recWrap.innerHTML = facilities.map(renderFacilityCard).join("");
}

/* ---------------- My Bookings ---------------- */
function initMyBookings() {
  const tbody = document.getElementById("bookingsTableBody");
  if (!tbody) return;

  function render() {
    const bookings = currentUserBookings();
    if (bookings.length === 0) {
      document.getElementById("bookingsEmpty").style.display = "block";
      document.getElementById("bookingsTableWrap").style.display = "none";
      return;
    }
    document.getElementById("bookingsEmpty").style.display = "none";
    document.getElementById("bookingsTableWrap").style.display = "block";

    tbody.innerHTML = bookings.map((b) => `
      <tr data-id="${b.id}">
        <td class="mono">${b.id}</td>
        <td>${b.facilityName}</td>
        <td>${CB.formatDate(b.date)}</td>
        <td>${CB.formatTime12(b.startTime)} - ${CB.formatTime12(b.endTime)}</td>
        <td>${b.purpose}</td>
        <td><span class="badge ${CB.statusBadgeClass(b.status)}">${b.status}</span></td>
        <td>${(b.status === "Pending" || b.status === "Approved") ? `<button class="btn btn-danger btn-sm cancel-btn" data-id="${b.id}">Cancel</button>` : `<span style="color:var(--ink-soft); font-size:0.85rem;">&mdash;</span>`}</td>
      </tr>`).join("");

    tbody.querySelectorAll(".cancel-btn").forEach((btn) => {
      btn.addEventListener("click", () => openCancelModal(btn.dataset.id, render));
    });
  }
  render();
}

function openCancelModal(bookingId, onDone) {
  const backdrop = document.getElementById("cancelModal");
  backdrop.classList.add("open");
  backdrop.dataset.bookingId = bookingId;

  document.getElementById("cancelConfirmBtn").onclick = () => {
    const bookings = CB.Data.getBookings();
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx > -1) {
      bookings[idx].status = "Cancelled";
      CB.Data.saveBookings(bookings);
      const notifications = CB.Data.getNotifications();
      notifications.unshift({
        id: "N" + Date.now(), userId: bookings[idx].userId, type: "neutral",
        message: `Your booking for ${bookings[idx].facilityName} has been cancelled.`,
        read: false, createdAt: new Date().toISOString(),
      });
      CB.Data.saveNotifications(notifications);
    }
    backdrop.classList.remove("open");
    CB.toast("Booking cancelled.", "ok");
    if (onDone) onDone();
  };
}

function initModalCloseButtons() {
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => el.closest(".modal-backdrop").classList.remove("open"));
  });
}

/* ---------------- Booking History ---------------- */
function initBookingHistory() {
  const tbody = document.getElementById("historyTableBody");
  if (!tbody) return;
  let activeFilter = "All";

  function render() {
    let bookings = currentUserBookings();
    if (activeFilter !== "All") bookings = bookings.filter((b) => b.status === activeFilter);

    if (bookings.length === 0) {
      document.getElementById("historyEmpty").style.display = "block";
      document.getElementById("historyTableWrap").style.display = "none";
      return;
    }
    document.getElementById("historyEmpty").style.display = "none";
    document.getElementById("historyTableWrap").style.display = "block";

    tbody.innerHTML = bookings.map((b) => `
      <tr>
        <td class="mono">${b.id}</td>
        <td>${b.facilityName}</td>
        <td>${CB.formatDate(b.date)}</td>
        <td>${CB.formatTime12(b.startTime)} - ${CB.formatTime12(b.endTime)}</td>
        <td><span class="badge ${CB.statusBadgeClass(b.status)}">${b.status}</span></td>
      </tr>`).join("");
  }

  document.querySelectorAll(".filter-pills button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-pills button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  render();
}

/* ---------------- Notifications ---------------- */
function initNotifications() {
  const wrap = document.getElementById("notificationsWrap");
  if (!wrap) return;
  const session = CB.Data.getSession();

  function iconFor(type) {
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
      pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
      danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      neutral: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>',
    };
    return icons[type] || icons.info;
  }

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(mins, 1)} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  function render() {
    const notifications = CB.Data.getNotifications().filter((n) => n.userId === session.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (notifications.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><h3>No notifications yet</h3><p>Updates about your bookings will appear here.</p></div>`;
      return;
    }
    wrap.innerHTML = notifications.map((n) => `
      <div class="notif-card ${n.read ? "" : "unread"}" data-id="${n.id}">
        <div class="notif-icon ${n.type}">${iconFor(n.type)}</div>
        <div>
          <p>${n.message}</p>
          <div class="notif-time">${timeAgo(n.createdAt)}</div>
        </div>
        ${!n.read ? '<span class="notif-dot"></span>' : ""}
      </div>`).join("");

    wrap.querySelectorAll(".notif-card.unread").forEach((card) => {
      card.addEventListener("click", () => {
        const notifications = CB.Data.getNotifications();
        const idx = notifications.findIndex((n) => n.id === card.dataset.id);
        if (idx > -1) { notifications[idx].read = true; CB.Data.saveNotifications(notifications); }
        render();
      });
    });
  }
  render();

  const markAllBtn = document.getElementById("markAllReadBtn");
  if (markAllBtn) {
    markAllBtn.addEventListener("click", () => {
      const notifications = CB.Data.getNotifications().map((n) => n.userId === session.id ? { ...n, read: true } : n);
      CB.Data.saveNotifications(notifications);
      render();
      CB.toast("All notifications marked as read.", "ok");
    });
  }
}

/* ---------------- Profile ---------------- */
function initProfile() {
  const root = document.getElementById("profileRoot");
  if (!root) return;
  const session = CB.Data.getSession();
  const users = CB.Data.getUsers();
  const user = users.find((u) => u.id === session.id);

  function render() {
    const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    document.getElementById("profileInitials").textContent = initials;
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileRole").textContent = `${user.role} \u00b7 ${user.department}`;
    document.getElementById("valEmail").textContent = user.email;
    document.getElementById("valDepartment").textContent = user.department;
    document.getElementById("valStudentId").textContent = user.studentId;
    document.getElementById("valPhone").textContent = user.phone;
  }
  render();

  const editBtn = document.getElementById("editProfileBtn");
  const modal = document.getElementById("editProfileModal");
  editBtn.addEventListener("click", () => {
    document.getElementById("editName").value = user.name;
    document.getElementById("editPhone").value = user.phone;
    document.getElementById("editDepartment").value = user.department;
    modal.classList.add("open");
  });

  document.getElementById("editProfileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    user.name = document.getElementById("editName").value.trim() || user.name;
    user.phone = document.getElementById("editPhone").value.trim() || user.phone;
    user.department = document.getElementById("editDepartment").value || user.department;

    const idx = users.findIndex((u) => u.id === user.id);
    users[idx] = user;
    CB.Data.saveUsers(users);
    CB.Data.setSession({ id: user.id, name: user.name, email: user.email, department: user.department });

    render();
    populateUserChip();
    modal.classList.remove("open");
    CB.toast("Profile updated successfully.", "ok");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSidebarToggle();
  initLogout();
  populateUserChip();
  initModalCloseButtons();
  initDashboard();
  initMyBookings();
  initBookingHistory();
  initNotifications();
  initProfile();
});
