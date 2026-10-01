/* =========================================================
   CampusBook — User Portal logic
   ========================================================= */

(function guard() {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        window.location.href = "../login.html";
    }
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
      localStorage.removeItem("user");
      CB.toast("You have been logged out.", "ok");
      setTimeout(() => { window.location.href = "../login.html"; }, 500);
    });
  });
}

function populateUserChip() {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) return;

    document.querySelectorAll(".user-chip .avatar-circle").forEach((el) => {
        el.textContent = user.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    });
}

function currentUserBookings() {
  const session = CB.Data.getSession();
  return CB.Data.getBookings().filter((b) => b.userId === session.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* ---------------- Dashboard ---------------- */
async function initDashboard() {

    const root = document.getElementById("dashboardRoot");

    if (!root) return;

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    // Greeting
    const hour = new Date().getHours();

    const greeting =
        hour < 12
            ? "Good Morning"
            : hour < 17
                ? "Good Afternoon"
                : "Good Evening";

    document.getElementById("greetingText").textContent =
        `${greeting}, ${user.name.split(" ")[0]} 👋`;

    try {

        // Get user's bookings
        const bookingResponse = await fetch(
            `http://localhost:3000/my-bookings/${user.user_id}`
        );

        const bookings = await bookingResponse.json();

        if (!bookingResponse.ok) {
            throw new Error("Unable to load bookings");
        }

        // Statistics
        const total = bookings.length;

        const pending = bookings.filter(
            b => b.status === "pending"
        ).length;

        const approved = bookings.filter(
            b => b.status === "approved"
        ).length;

        const cancelled = bookings.filter(
            b => b.status === "cancelled"
        ).length;

        document.getElementById("statTotal").textContent = total;
        document.getElementById("statPending").textContent = pending;
        document.getElementById("statApproved").textContent = approved;
        document.getElementById("statCancelled").textContent = cancelled;


        // Upcoming booking
        const upcomingWrap =
            document.getElementById("upcomingWrap");

        const upcoming = bookings
            .filter(
                b =>
                    b.status === "pending" ||
                    b.status === "approved"
            )
            .sort(
                (a, b) =>
                    new Date(a.date) - new Date(b.date)
            )[0];


        if (upcoming) {

            upcomingWrap.innerHTML = `
                <div class="upcoming-card">

                    <div>

                        <div class="facility-name">
                            ${upcoming.facility_name}
                        </div>

                        <div class="meta">
                            ${formatDashboardDate(upcoming.date)}
                            ·
                            ${upcoming.start_time}
                            -
                            ${upcoming.end_time}
                        </div>

                        <span class="badge">
                            ${upcoming.status}
                        </span>

                    </div>

                    <a href="my-bookings.html"
                       class="btn btn-outline">
                        View Booking
                    </a>

                </div>
            `;

        } else {

            upcomingWrap.innerHTML = `
                <div class="empty-state">

                    <h3>No upcoming bookings</h3>

                    <p>
                        Browse facilities and reserve your next slot.
                    </p>

                </div>
            `;
        }


        // Load recommended facilities
        const facilityResponse =
            await fetch("http://localhost:3000/facilities");

        const facilities =
            await facilityResponse.json();


        const recommended =
            facilities
                .filter(
                    f =>
                        f.status === "active" &&
                        f.availability === "available"
                )
                .slice(0, 3);


        const recWrap =
            document.getElementById("recommendedGrid");


        recWrap.innerHTML =
            recommended.map(f => `

                <div class="facility-card">

                    <div class="facility-media">
                        🏫
                    </div>

                    <div class="facility-body">

                        <h3>${f.name}</h3>

                        <div class="facility-meta">

                            <span>
                                📍 ${f.location}
                            </span>

                            <span>
                                👥 Capacity: ${f.capacity}
                            </span>

                            <span>
                                🏷️ ${f.category}
                            </span>

                        </div>

                        <span class="badge ok">
                            Available
                        </span>

                        <div class="facility-actions">

                            <a
                                href="../facility-details.html?id=${f.facility_id}"
                                class="btn btn-primary">
                                View Facility
                            </a>

                        </div>

                    </div>

                </div>

            `).join("");


    } catch (error) {

        console.error("Dashboard error:", error);

        document.getElementById("upcomingWrap").innerHTML = `
            <div class="empty-state">

                <h3>Unable to load dashboard</h3>

                <p>
                    Please make sure the server is running.
                </p>

            </div>
        `;
    }
}

function formatDashboardDate(date) {

    const d = new Date(date);

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
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
    const emptyState = document.getElementById("historyEmpty");
    const tableWrap = document.getElementById("historyTableWrap");
    const filterButtons = document.querySelectorAll(".filter-pills button");

    if (!tbody) return;

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        alert("Please login first.");
        window.location.href = "../login.html";
        return;
    }

    const userId = user.user_id;

    let allBookings = [];
    let activeFilter = "All";

    async function loadHistory() {
        try {
            const response = await fetch(
                `http://localhost:3000/my-bookings/${userId}`
            );

            if (!response.ok) {
                throw new Error("Failed to load booking history");
            }

            allBookings = await response.json();

            renderHistory();

        } catch (error) {

            console.error("Error loading booking history:", error);

            tableWrap.style.display = "none";
            emptyState.style.display = "block";

            emptyState.querySelector("h3").textContent =
                "Unable to load booking history";

            emptyState.querySelector("p").textContent =
                "Please make sure the server is running.";

        }
    }

    function renderHistory() {

        let historyBookings = allBookings.filter(
            booking =>
                booking.status === "approved" ||
                booking.status === "rejected" ||
                booking.status === "cancelled"
        );

        if (activeFilter !== "All") {
            historyBookings = historyBookings.filter(
                booking =>
                    booking.status.toLowerCase() ===
                    activeFilter.toLowerCase()
            );
        }

        if (historyBookings.length === 0) {

            tbody.innerHTML = "";

            tableWrap.style.display = "none";
            emptyState.style.display = "block";

            emptyState.querySelector("h3").textContent =
                "Nothing here yet";

            emptyState.querySelector("p").textContent =
                "Try a different filter.";

            return;
        }

        tableWrap.style.display = "block";
        emptyState.style.display = "none";

        tbody.innerHTML = historyBookings.map(booking => {

            let badgeClass = "neutral";

            if (booking.status === "approved") {
                badgeClass = "ok";
            }

            if (booking.status === "rejected") {
                badgeClass = "danger";
            }

            if (booking.status === "cancelled") {
                badgeClass = "neutral";
            }

            return `
                <tr>

                    <td class="mono">
                        #${booking.booking_id}
                    </td>

                    <td>
                        ${booking.facility_name || "—"}
                    </td>

                    <td>
                        ${formatHistoryDate(booking.date)}
                    </td>

                    <td>
                        ${booking.start_time || "—"}
                        -
                        ${booking.end_time || "—"}
                    </td>

                    <td>
                        <span class="status-badge ${badgeClass}">
                            ${capitalizeStatus(booking.status)}
                        </span>
                    </td>

                </tr>
            `;

        }).join("");
    }

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            filterButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            activeFilter = button.dataset.filter;

            renderHistory();
        });

    });

    function formatHistoryDate(dateString) {

        if (!dateString) return "—";

        const date = new Date(dateString);

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function capitalizeStatus(status) {

        if (!status) return "Unknown";

        return status.charAt(0).toUpperCase() +
               status.slice(1);
    }

    loadHistory();
}

/* ---------------- Notifications ---------------- */
function initNotifications() {

    const notificationsWrap =
        document.getElementById("notificationsWrap");

    const markAllReadBtn =
        document.getElementById("markAllReadBtn");

    if (!notificationsWrap) return;

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        alert("Please login first.");
        window.location.href = "../login.html";
        return;
    }

    const userId = user.user_id;

    let notifications = [];

    async function loadNotifications() {

        try {

            const response = await fetch(
                `http://localhost:3000/notifications/${userId}`
            );

            if (!response.ok) {
                throw new Error("Failed to load notifications");
            }

            notifications = await response.json();

            renderNotifications();

        } catch (error) {

            console.error("Error loading notifications:", error);

            notificationsWrap.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load notifications</h3>
                    <p>Please make sure the server is running.</p>
                </div>
            `;
        }
    }

    function renderNotifications() {

        if (notifications.length === 0) {

            notificationsWrap.innerHTML = `
                <div class="empty-state">
                    <h3>No notifications</h3>
                    <p>You don't have any notifications yet.</p>
                </div>
            `;

            return;
        }

        notificationsWrap.innerHTML = notifications.map(notification => {

            const unread =
                Number(notification.is_read) === 0;

            const iconType =
                getNotificationType(notification.type);

            return `
                <div
                    class="notif-card ${unread ? "unread" : ""}"
                    data-notification-id="${notification.notification_id}"
                >

                    <div class="notif-icon ${iconType.className}">
                        ${iconType.icon}
                    </div>

                    <div>
                        <div>
                            ${notification.message}
                        </div>

                        <div class="notif-time">
                            ${formatNotificationDate(
                                notification.created_at
                            )}
                        </div>
                    </div>

                    ${
                        unread
                            ? `<div class="notif-dot"></div>`
                            : ""
                    }

                </div>
            `;

        }).join("");
    }

    function getNotificationType(type) {

        const value = (type || "").toLowerCase();

        if (value.includes("approved")) {
            return {
                className: "success",
                icon: "✓"
            };
        }

        if (value.includes("rejected")) {
            return {
                className: "danger",
                icon: "✕"
            };
        }

        if (value.includes("pending")) {
            return {
                className: "pending",
                icon: "!"
            };
        }

        if (value.includes("cancel")) {
            return {
                className: "neutral",
                icon: "↩"
            };
        }

        return {
            className: "info",
            icon: "i"
        };
    }

    function formatNotificationDate(dateString) {

        if (!dateString) return "";

        const date = new Date(dateString);

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // Clicking a notification marks it as read
    notificationsWrap.addEventListener("click", async (e) => {

        const card = e.target.closest("[data-notification-id]");

        if (!card) return;

        const notificationId =
            card.dataset.notificationId;

        const notification =
            notifications.find(
                n =>
                    String(n.notification_id) ===
                    String(notificationId)
            );

        if (!notification) return;

        if (Number(notification.is_read) === 1) return;

        try {

            const response = await fetch(
                `http://localhost:3000/notifications/${notificationId}/read`,
                {
                    method: "PATCH"
                }
            );

            if (!response.ok) {
                throw new Error("Failed to mark as read");
            }

            await loadNotifications();

        } catch (error) {

            console.error(error);
        }
    });

    // Mark all as read
    if (markAllReadBtn) {

        markAllReadBtn.addEventListener("click", async () => {

            try {

                const response = await fetch(
                    `http://localhost:3000/notifications/user/${userId}/read-all`,
                    {
                        method: "PATCH"
                    }
                );

                const data = await response.json();

                if (!response.ok) {

                    alert(
                        data.message ||
                        "Failed to mark notifications as read."
                    );

                    return;
                }

                await loadNotifications();

            } catch (error) {

                console.error(error);

                alert("Unable to connect to server.");
            }
        });
    }

    loadNotifications();
}

/* ---------------- Profile ---------------- */
/* ---------------- Profile ---------------- */
function initProfile() {

    const root = document.getElementById("profileRoot");

    if (!root) return;

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    function renderProfile() {

        const initials = user.name
            .split(" ")
            .map(p => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

        document.getElementById("profileInitials").textContent = initials;

        document.getElementById("profileName").textContent =
            user.name;

        document.getElementById("profileRole").textContent =
            `${user.role} · ${user.department}`;

        document.getElementById("valEmail").textContent =
            user.email;

        document.getElementById("valPhone").textContent =
            user.phone || "—";

        document.getElementById("valDepartment").textContent =
            user.department || "—";

        document.getElementById("valStudentId").textContent =
            user.id_number || "—";
    }

    renderProfile();

    const editBtn =
        document.getElementById("editProfileBtn");

    const modal =
        document.getElementById("editProfileModal");

    editBtn.addEventListener("click", () => {

        document.getElementById("editName").value =
            user.name;

        document.getElementById("editPhone").value =
            user.phone || "";

        document.getElementById("editDepartment").value =
            user.department || "";

        modal.classList.add("open");
    });

    document
        .getElementById("editProfileForm")
        .addEventListener("submit", async (e) => {

            e.preventDefault();

            const name =
                document.getElementById("editName").value.trim();

            const phone =
                document.getElementById("editPhone").value.trim();

            const department =
                document.getElementById("editDepartment").value;

            if (!name || !phone || !department) {
                alert("Please fill all fields.");
                return;
            }

            try {

                const response = await fetch(
                    `http://localhost:3000/user/${user.user_id}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            name: name,
                            phone: phone,
                            department: department
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message || "Failed to update profile.");
                    return;
                }

                // Update localStorage user
                user.name = data.user.name;
                user.phone = data.user.phone;
                user.department = data.user.department;

                localStorage.setItem(
                    "user",
                    JSON.stringify(user)
                );

                renderProfile();

                populateUserChip();

                modal.classList.remove("open");

                CB.toast(
                    "Profile updated successfully.",
                    "ok"
                );

            } catch (error) {

                console.error("Profile update error:", error);

                alert(
                    "Unable to connect to server. Make sure the server is running."
                );
            }
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
