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

    const facilitiesStat = document.getElementById("admStatFacilities");
    const usersStat = document.getElementById("admStatUsers");
    const bookingsStat = document.getElementById("admStatBookings");
    const pendingStat = document.getElementById("admStatPending");
    const approvedStat = document.getElementById("admStatApproved");
    const cancelledStat = document.getElementById("admStatCancelled");

    const monthlyChart = document.getElementById("monthlyChart");
    const usageChart = document.getElementById("usageChart");
    const pendingPreview = document.getElementById("pendingPreview");

    let facilities = [];
    let users = [];
    let bookings = [];

    async function loadDashboard() {
        try {

            const [
                facilitiesResponse,
                usersResponse,
                bookingsResponse
            ] = await Promise.all([

                fetch("http://localhost:3000/facilities"),

                fetch("http://localhost:3000/admin/users"),

                fetch("http://localhost:3000/admin/bookings")

            ]);

            if (
                !facilitiesResponse.ok ||
                !usersResponse.ok ||
                !bookingsResponse.ok
            ) {
                throw new Error("Failed to load dashboard data.");
            }

            facilities = await facilitiesResponse.json();
            users = await usersResponse.json();
            bookings = await bookingsResponse.json();

            updateStats();
            renderMonthlyChart();
            renderUsageChart();
            renderPendingRequests();

        } catch (error) {

            console.error("Dashboard error:", error);

            facilitiesStat.textContent = "—";
            usersStat.textContent = "—";
            bookingsStat.textContent = "—";
            pendingStat.textContent = "—";
            approvedStat.textContent = "—";
            cancelledStat.textContent = "—";

            pendingPreview.innerHTML = `
                <div class="admin-empty">
                    Unable to load dashboard data.
                </div>
            `;
        }
    }

    // =========================
    // STATISTICS
    // =========================

    function updateStats() {

        facilitiesStat.textContent = facilities.length;

        usersStat.textContent = users.length;

        bookingsStat.textContent = bookings.length;

        const pending = bookings.filter(
            booking => booking.status === "pending"
        );

        const approved = bookings.filter(
            booking => booking.status === "approved"
        );

        const cancelled = bookings.filter(
            booking => booking.status === "cancelled"
        );

        pendingStat.textContent = pending.length;

        approvedStat.textContent = approved.length;

        cancelledStat.textContent = cancelled.length;
    }

    // =========================
    // MONTHLY BOOKINGS
    // =========================

    function renderMonthlyChart() {

        if (!monthlyChart) return;

        const months = [
            "Jan", "Feb", "Mar", "Apr",
            "May", "Jun", "Jul", "Aug",
            "Sep", "Oct", "Nov", "Dec"
        ];

        const monthlyCounts = new Array(12).fill(0);

        bookings.forEach(booking => {

            if (!booking.date) return;

            const date = new Date(booking.date);

            const month = date.getMonth();

            monthlyCounts[month]++;
        });

        const maxValue = Math.max(...monthlyCounts, 1);

        monthlyChart.innerHTML = months.map((month, index) => {

            const count = monthlyCounts[index];

            const height = (count / maxValue) * 100;

            return `
                <div class="bar-item">

                    <div class="bar-value">
                        ${count}
                    </div>

                    <div
                        class="bar"
                        style="height:${height}%"
                        title="${month}: ${count} bookings">
                    </div>

                    <div class="bar-label">
                        ${month}
                    </div>

                </div>
            `;

        }).join("");
    }

    // =========================
    // FACILITY USAGE
    // =========================

    function renderUsageChart() {

        if (!usageChart) return;

        if (bookings.length === 0) {

            usageChart.innerHTML = `
                <div class="admin-empty">
                    No booking data available.
                </div>
            `;

            return;
        }

        const facilityCounts = {};

        bookings.forEach(booking => {

            const facilityName = booking.facility_name;

            if (!facilityName) return;

            facilityCounts[facilityName] =
                (facilityCounts[facilityName] || 0) + 1;
        });

        const entries = Object.entries(facilityCounts);

        entries.sort((a, b) => b[1] - a[1]);

        const maxCount = Math.max(
            ...entries.map(entry => entry[1]),
            1
        );

        usageChart.innerHTML = entries.map(
            ([facilityName, count]) => {

                const percentage =
                    Math.round((count / maxCount) * 100);

                return `
                    <div class="usage-row">

                        <div class="usage-info">
                            <span>${facilityName}</span>
                            <strong>${count}</strong>
                        </div>

                        <div class="usage-bar">
                            <div
                                class="usage-fill"
                                style="width:${percentage}%">
                            </div>
                        </div>

                    </div>
                `;

            }
        ).join("");
    }

    // =========================
    // PENDING REQUESTS
    // =========================

    function renderPendingRequests() {

        if (!pendingPreview) return;

        const pendingBookings = bookings
            .filter(booking => booking.status === "pending")
            .slice(0, 5);

        if (pendingBookings.length === 0) {

            pendingPreview.innerHTML = `
                <div class="admin-empty">
                    No pending booking requests.
                </div>
            `;

            return;
        }

        pendingPreview.innerHTML = pendingBookings.map(
            booking => {

                return `
                    <div class="admin-request-row">

                        <div>
                            <strong>
                                Booking #${booking.booking_id}
                            </strong>

                            <div>
                                ${booking.user_name || "Unknown User"}
                                ·
                                ${booking.facility_name || "Unknown Facility"}
                            </div>

                            <small>
                                ${formatAdminDate(booking.date)}
                                ·
                                ${booking.start_time}
                                -
                                ${booking.end_time}
                            </small>
                        </div>

                        <span class="adm-badge warn">
                            Pending
                        </span>

                    </div>
                `;

            }
        ).join("");
    }

    // Load dashboard
    loadDashboard();
}

/* ---------------- Booking Requests ---------------- */
/* ---------------- Booking Requests ---------------- */
function initAdminRequests() {
    const tbody = document.getElementById("requestsTableBody");
    if (!tbody) return;

    const filterButtons = document.querySelectorAll(".filter-pills-admin button");

    let allBookings = [];
    let activeFilter = "All";

    async function loadBookings() {
        try {
            const response = await fetch("http://localhost:3000/admin/bookings");

            if (!response.ok) {
                throw new Error("Failed to load bookings");
            }

            allBookings = await response.json();

            render();

        } catch (error) {
            console.error("Error loading booking requests:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="admin-empty">
                            Unable to load booking requests.
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    function render() {

        let bookings = allBookings;

        // Apply filter
        if (activeFilter !== "All") {
            bookings = bookings.filter(
                (b) =>
                    (b.status || "").toLowerCase() ===
                    activeFilter.toLowerCase()
            );
        }

        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="admin-empty">
                            No requests found.
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bookings.map((b) => {

            let badgeClass = "neutral";

            if (b.status === "approved") {
                badgeClass = "ok";
            } else if (b.status === "pending") {
                badgeClass = "warn";
            } else if (b.status === "rejected") {
                badgeClass = "danger";
            }

            return `
                <tr>

                    <td class="mono">
                        ${b.booking_id}
                    </td>

                    <td>
                        ${b.user_name || "—"}
                        <br>
                        <small>${b.user_email || ""}</small>
                    </td>

                    <td>
                        ${b.facility_name || "—"}
                    </td>

                    <td>
                        ${formatAdminDate(b.date)}
                    </td>

                    <td>
                        ${b.start_time} - ${b.end_time}
                    </td>

                    <td>
                        <span class="adm-badge ${badgeClass}">
                            ${b.status}
                        </span>
                    </td>

                    <td>
                        ${
                            b.status === "pending"
                            ? `
                                <div class="adm-btn-row">

                                    <button
                                        class="adm-btn approve"
                                        data-booking-id="${b.booking_id}"
                                        data-action="approved">
                                        Approve
                                    </button>

                                    <button
                                        class="adm-btn reject"
                                        data-booking-id="${b.booking_id}"
                                        data-action="rejected">
                                        Reject
                                    </button>

                                </div>
                            `
                            : `
                                <span class="mono">
                                    Reviewed
                                </span>
                            `
                        }
                    </td>

                </tr>
            `;

        }).join("");
    }

    // Filter buttons
    filterButtons.forEach((button) => {

        button.addEventListener("click", () => {

            filterButtons.forEach((btn) => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            activeFilter = button.dataset.filter;

            render();
        });

    });

    // Approve / Reject
    tbody.addEventListener("click", async (e) => {

        const button = e.target.closest("[data-action]");

        if (!button) return;

        const bookingId = button.dataset.bookingId;
        const action = button.dataset.action;

        const actionText =
            action === "approved"
                ? "approve"
                : "reject";

        const confirmed = confirm(
            `Are you sure you want to ${actionText} booking #${bookingId}?`
        );

        if (!confirmed) return;

        try {

            const response = await fetch(
                `http://localhost:3000/admin/bookings/${bookingId}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        status: action
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(
                    data.message ||
                    "Failed to update booking."
                );

                return;
            }

            alert(data.message);

            // Reload latest MySQL data
            await loadBookings();

        } catch (error) {

            console.error(error);

            alert("Unable to connect to server.");
        }
    });

    // Initial load
    loadBookings();
}

/* ---------------- Facility Management ---------------- */
function initAdminFacilities() {
    const tbody = document.getElementById("facilitiesTableBody");
    const addBtn = document.getElementById("addFacilityBtn");
    const modal = document.getElementById("facilityModal");
    const form = document.getElementById("facilityForm");

    if (!tbody || !addBtn || !modal || !form) return;

    const modalTitle = document.getElementById("facilityModalTitle");

    const fName = document.getElementById("fName");
    const fCategory = document.getElementById("fCategory");
    const fCapacity = document.getElementById("fCapacity");
    const fLocation = document.getElementById("fLocation");
    const fDescription = document.getElementById("fDescription");
    const fOpen = document.getElementById("fOpen");
    const fClose = document.getElementById("fClose");
    const fStatus = document.getElementById("fStatus");

    let facilities = [];
    let editingFacilityId = null;

    // Load facilities from MySQL
    async function loadFacilities() {
        try {
            const response = await fetch("http://localhost:3000/facilities");

            if (!response.ok) {
                throw new Error("Failed to load facilities");
            }

            facilities = await response.json();
            renderFacilities();

        } catch (error) {
            console.error("Error loading facilities:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="admin-empty">
                            Unable to load facilities.
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    // Display facilities
    function renderFacilities() {

        if (facilities.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="admin-empty">
                            No facilities found.
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = facilities.map((facility) => {

            const status = (facility.status || "active").toLowerCase();

            const badgeClass =
                status === "active" ? "ok" : "neutral";

            return `
                <tr>

                    <td>
                        <strong>${facility.name || "—"}</strong>
                        <br>
                        <small>${facility.description || ""}</small>
                    </td>

                    <td>
                        ${facility.category || "—"}
                    </td>

                    <td>
                        ${facility.location || "—"}
                    </td>

                    <td>
                        ${facility.capacity || "—"}
                    </td>

                    <td>
                        <span class="adm-badge ${badgeClass}">
                            ${facility.status || "Active"}
                        </span>
                    </td>

                    <td>
                        <div class="adm-btn-row">

                            <button
                                class="adm-btn"
                                data-edit-facility="${facility.facility_id}">
                                Edit
                            </button>

                            <button
                                class="adm-btn"
                                data-delete-facility="${facility.facility_id}">
                                Delete
                            </button>

                        </div>
                    </td>

                </tr>
            `;

        }).join("");
    }

    // Open modal for adding
    addBtn.addEventListener("click", () => {

        editingFacilityId = null;

        modalTitle.textContent = "Add Facility";

        form.reset();

        fStatus.value = "Active";

        modal.classList.add("open");
    });

    // Edit / Delete buttons
    tbody.addEventListener("click", async (e) => {

        const editButton = e.target.closest("[data-edit-facility]");
        const deleteButton = e.target.closest("[data-delete-facility]");

        // EDIT
        if (editButton) {

            const facilityId = editButton.dataset.editFacility;

            const facility = facilities.find(
                (f) => String(f.facility_id) === String(facilityId)
            );

            if (!facility) return;

            editingFacilityId = facility.facility_id;

            modalTitle.textContent = "Edit Facility";

            fName.value = facility.name || "";
            fCategory.value = facility.category || "Academic";
            fCapacity.value = facility.capacity || "";
            fLocation.value = facility.location || "";
            fDescription.value = facility.description || "";
            fOpen.value = facility.open_time
                ? String(facility.open_time).substring(0, 5)
                : "";
            fClose.value = facility.close_time
                ? String(facility.close_time).substring(0, 5)
                : "";

            fStatus.value =
                (facility.status || "active").toLowerCase() === "active"
                    ? "Active"
                    : "Inactive";

            modal.classList.add("open");

            return;
        }

        // DELETE
        if (deleteButton) {

            const facilityId = deleteButton.dataset.deleteFacility;

            const confirmed = confirm(
                "Are you sure you want to delete this facility?"
            );

            if (!confirmed) return;

            try {

                const response = await fetch(
                    `http://localhost:3000/facility/${facilityId}`,
                    {
                        method: "DELETE"
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message || "Failed to delete facility.");
                    return;
                }

                alert("Facility deleted successfully.");

                await loadFacilities();

            } catch (error) {

                console.error(error);
                alert("Unable to connect to server.");

            }
        }
    });

    // Save facility
    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const facilityData = {
            name: fName.value.trim(),
            category: fCategory.value,
            capacity: Number(fCapacity.value),
            location: fLocation.value.trim(),
            description: fDescription.value.trim(),
            open_time: fOpen.value,
            close_time: fClose.value,
            status: fStatus.value.toLowerCase()
        };

        if (
            !facilityData.name ||
            !facilityData.capacity ||
            !facilityData.location ||
            !facilityData.open_time ||
            !facilityData.close_time
        ) {
            alert("Please fill all required fields.");
            return;
        }

        if (facilityData.open_time >= facilityData.close_time) {
            alert("Closing time must be after opening time.");
            return;
        }

        try {

            let response;

            // EDIT
            if (editingFacilityId) {

                response = await fetch(
                    `http://localhost:3000/facility/${editingFacilityId}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(facilityData)
                    }
                );

            } 
            // ADD
            else {

                response = await fetch(
                    "http://localhost:3000/facility",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(facilityData)
                    }
                );
            }

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to save facility.");
                return;
            }

            alert(
                editingFacilityId
                    ? "Facility updated successfully."
                    : "Facility added successfully."
            );

            modal.classList.remove("open");

            form.reset();

            editingFacilityId = null;

            await loadFacilities();

        } catch (error) {

            console.error(error);
            alert("Unable to connect to server.");

        }
    });

    // Initial load
    loadFacilities();
}


/* ---------------- User Management ---------------- */
function initAdminUsers() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    const searchInput = document.getElementById("userSearch");
    const roleFilter = document.getElementById("userRoleFilter");

    let allUsers = [];

    // =========================
    // LOAD USERS
    // =========================
    async function loadUsers() {
        try {
            const response = await fetch("http://localhost:3000/admin/users");

            if (!response.ok) {
                throw new Error("Failed to load users");
            }

            allUsers = await response.json();

            render();

        } catch (error) {
            console.error("Error loading users:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="admin-empty">
                            Unable to load users.
                        </div>
                    </td>
                </tr>
            `;
        }
    }


    // =========================
    // DISPLAY USERS
    // =========================
    function render() {

        const q = (searchInput.value || "").toLowerCase();
        const role = (roleFilter.value || "").toLowerCase();

        let users = allUsers.filter((u) => {

            const name = (u.name || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const userRole = (u.role || "").toLowerCase();

            const matchesSearch =
                !q ||
                name.includes(q) ||
                email.includes(q);

            const matchesRole =
                !role ||
                userRole === role;

            return matchesSearch && matchesRole;
        });


        if (users.length === 0) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="admin-empty">
                            No users found.
                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        tbody.innerHTML = users.map((u) => {

            const status = (u.status || "active").toLowerCase();

            const badgeClass =
                status === "active" ? "ok" : "neutral";

            // Button changes according to current status
            const statusButton =
                status === "active"
                    ? `
                        <button
                            class="adm-btn reject"
                            data-user-status="${u.user_id}"
                            data-new-status="inactive">
                            Deactivate
                        </button>
                    `
                    : `
                        <button
                            class="adm-btn approve"
                            data-user-status="${u.user_id}"
                            data-new-status="active">
                            Activate
                        </button>
                    `;


            return `
                <tr>

                    <td class="mono">
                        ${u.user_id}
                    </td>

                    <td>
                        ${u.name || "—"}
                    </td>

                    <td>
                        ${u.email || "—"}
                    </td>

                    <td>
                        ${u.department || "—"}
                    </td>

                    <td>
                        ${u.role || "—"}
                    </td>

                    <td>
                        <span class="adm-badge ${badgeClass}">
                            ${status}
                        </span>
                    </td>

                    <td>
                        <div class="adm-btn-row">

                            <button
                                class="adm-btn"
                                data-view-user="${u.user_id}">
                                View
                            </button>

                            ${statusButton}

                        </div>
                    </td>

                </tr>
            `;

        }).join("");
    }


    // =========================
    // VIEW / ACTIVATE / DEACTIVATE
    // =========================
    tbody.addEventListener("click", async (e) => {

        // -------------------------
        // VIEW USER
        // -------------------------
        const viewButton = e.target.closest("[data-view-user]");

        if (viewButton) {

            const userId = viewButton.dataset.viewUser;

            const user = allUsers.find(
                (u) => String(u.user_id) === String(userId)
            );

            if (!user) return;

            alert(
                `Name: ${user.name}\n` +
                `Email: ${user.email}\n` +
                `Phone: ${user.phone || "—"}\n` +
                `Department: ${user.department || "—"}\n` +
                `ID Number: ${user.id_number || "—"}\n` +
                `Role: ${user.role || "—"}\n` +
                `Status: ${user.status || "—"}`
            );

            return;
        }


        // -------------------------
        // ACTIVATE / DEACTIVATE
        // -------------------------
        const statusButton = e.target.closest("[data-user-status]");

        if (!statusButton) return;

        const userId = statusButton.dataset.userStatus;
        const newStatus = statusButton.dataset.newStatus;

        const actionText =
            newStatus === "active"
                ? "activate"
                : "deactivate";


        const confirmed = confirm(
            `Are you sure you want to ${actionText} this user?`
        );

        if (!confirmed) return;


        try {

            const response = await fetch(
                `http://localhost:3000/admin/users/${userId}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );


            const data = await response.json();


            if (!response.ok) {

                alert(
                    data.message ||
                    "Failed to update user status."
                );

                return;
            }


            alert(data.message);


            // Reload latest data from MySQL
            await loadUsers();


        } catch (error) {

            console.error(
                "Error updating user status:",
                error
            );

            alert(
                "Unable to connect to server."
            );
        }

    });


    // =========================
    // SEARCH & ROLE FILTER
    // =========================

    searchInput.addEventListener(
        "input",
        render
    );

    roleFilter.addEventListener(
        "change",
        render
    );


    // =========================
    // INITIAL LOAD
    // =========================

    loadUsers();
}
/* ---------------- All Bookings (oversight) ---------------- */
/* ---------------- All Bookings (oversight) ---------------- */
function initAdminBookings() {
    const tbody = document.getElementById("allBookingsTableBody");
    if (!tbody) return;

    const searchInput = document.getElementById("bookingSearch");
    const statusFilter = document.getElementById("bookingStatusFilter");

    let allBookings = [];

    async function loadBookings() {
        try {
            const response = await fetch("http://localhost:3000/admin/bookings");

            if (!response.ok) {
                throw new Error("Failed to load bookings");
            }

            allBookings = await response.json();
            render();

        } catch (error) {
            console.error("Error loading bookings:", error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="admin-empty">
                            Unable to load bookings.
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    function render() {
        const q = (searchInput.value || "").toLowerCase();
        const status = statusFilter.value.toLowerCase();

        let bookings = allBookings.filter((b) => {

            const bookingId = String(b.booking_id).toLowerCase();
            const userName = (b.user_name || "").toLowerCase();
            const facilityName = (b.facility_name || "").toLowerCase();

            const matchesSearch =
                !q ||
                bookingId.includes(q) ||
                userName.includes(q) ||
                facilityName.includes(q);

            const matchesStatus =
                !status ||
                (b.status || "").toLowerCase() === status;

            return matchesSearch && matchesStatus;
        });

        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="admin-empty">
                            No bookings match your search.
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bookings.map((b) => {

            let badgeClass = "neutral";

            if (b.status === "approved") {
                badgeClass = "ok";
            } else if (b.status === "pending") {
                badgeClass = "warn";
            } else if (
                b.status === "rejected" ||
                b.status === "cancelled"
            ) {
                badgeClass = "danger";
            }

            return `
                <tr>
                    <td class="mono">${b.booking_id}</td>

                    <td>
                        ${b.user_name}
                        <br>
                        <small>${b.user_email}</small>
                    </td>

                    <td>${b.facility_name}</td>

                    <td>${formatAdminDate(b.date)}</td>

                    <td>
                        ${b.start_time} - ${b.end_time}
                    </td>

                    <td>${b.purpose || "—"}</td>

                    <td>
                        <span class="adm-badge ${badgeClass}">
                            ${b.status}
                        </span>
                    </td>

                    <td>
                        ${
                            b.status === "pending"
                            ? `
                                <div class="adm-btn-row">
                                    <button
                                        class="adm-btn approve"
                                        data-booking-id="${b.booking_id}"
                                        data-action="approved">
                                        Approve
                                    </button>

                                    <button
                                        class="adm-btn reject"
                                        data-booking-id="${b.booking_id}"
                                        data-action="rejected">
                                        Reject
                                    </button>
                                </div>
                            `
                            : `<span class="mono">Reviewed</span>`
                        }
                    </td>
                </tr>
            `;

        }).join("");
    }

    /* Approve / Reject button */
    tbody.addEventListener("click", async (e) => {

        const button = e.target.closest("[data-action]");

        if (!button) return;

        const bookingId = button.dataset.bookingId;
        const action = button.dataset.action;

        const actionText =
            action === "approved" ? "approve" : "reject";

        const confirmed = confirm(
            `Are you sure you want to ${actionText} booking #${bookingId}?`
        );

        if (!confirmed) return;

        try {

            const response = await fetch(
                `http://localhost:3000/admin/bookings/${bookingId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: action
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to update booking.");
                return;
            }

            alert(data.message);

            // Reload bookings after approval/rejection
            loadBookings();

        } catch (error) {

            console.error(error);

            alert("Unable to connect to server.");
        }
    });

    searchInput.addEventListener("input", render);
    statusFilter.addEventListener("change", render);

    loadBookings();
}



/* Format MySQL date for Admin page */
function formatAdminDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

/* ---------------- Reports ---------------- */
/* ---------------- Reports ---------------- */
function initAdminReports() {
    const root = document.getElementById("reportsRoot");
    if (!root) return;

    const totalBookings = document.getElementById("repTotalBookings");
    const topFacility = document.getElementById("repTopFacility");
    const topUser = document.getElementById("repTopUser");
    const utilization = document.getElementById("repUtilization");
    const downloadBtn = document.getElementById("downloadReportBtn");

    let bookings = [];
    let facilities = [];

    async function loadReports() {
        try {

            const [bookingResponse, facilityResponse] = await Promise.all([
                fetch("http://localhost:3000/admin/bookings"),
                fetch("http://localhost:3000/facilities")
            ]);

            if (!bookingResponse.ok || !facilityResponse.ok) {
                throw new Error("Failed to load report data");
            }

            bookings = await bookingResponse.json();
            facilities = await facilityResponse.json();

            generateReport();

        } catch (error) {

            console.error("Error loading reports:", error);

            totalBookings.textContent = "Error";
            topFacility.textContent = "—";
            topUser.textContent = "—";
            utilization.textContent = "—";
        }
    }

    function generateReport() {

        // Total bookings
        totalBookings.textContent = bookings.length;


        // Most booked facility
        const facilityCount = {};

        bookings.forEach((booking) => {

            const facilityName = booking.facility_name;

            if (!facilityName) return;

            facilityCount[facilityName] =
                (facilityCount[facilityName] || 0) + 1;
        });

        const facilityEntries =
            Object.entries(facilityCount);

        if (facilityEntries.length > 0) {

            facilityEntries.sort(
                (a, b) => b[1] - a[1]
            );

            topFacility.textContent =
                facilityEntries[0][0];

        } else {

            topFacility.textContent = "—";
        }


        // Most active user
        const userCount = {};

        bookings.forEach((booking) => {

            const userName = booking.user_name;

            if (!userName) return;

            userCount[userName] =
                (userCount[userName] || 0) + 1;
        });

        const userEntries =
            Object.entries(userCount);

        if (userEntries.length > 0) {

            userEntries.sort(
                (a, b) => b[1] - a[1]
            );

            topUser.textContent =
                userEntries[0][0];

        } else {

            topUser.textContent = "—";
        }


        // Facility utilization
        const totalFacilities = facilities.length;

        const activeFacilities =
            facilities.filter(
                (facility) =>
                    facility.status === "active"
            ).length;

        if (totalFacilities > 0) {

            const percentage =
                Math.round(
                    (activeFacilities / totalFacilities) * 100
                );

            utilization.textContent =
                `${percentage}%`;

        } else {

            utilization.textContent = "0%";
        }
    }


    // Download CSV report
    downloadBtn.addEventListener("click", () => {

        if (bookings.length === 0) {
            alert("No booking data available.");
            return;
        }

        let csv =
            "Booking ID,User,Email,Facility,Date,Start Time,End Time,Purpose,Participants,Status\n";

        bookings.forEach((booking) => {

            csv +=
                `"${booking.booking_id}",` +
                `"${booking.user_name || ""}",` +
                `"${booking.user_email || ""}",` +
                `"${booking.facility_name || ""}",` +
                `"${formatAdminDate(booking.date)}",` +
                `"${booking.start_time || ""}",` +
                `"${booking.end_time || ""}",` +
                `"${booking.purpose || ""}",` +
                `"${booking.participants || ""}",` +
                `"${booking.status || ""}"\n`;
        });

        const blob = new Blob(
            [csv],
            { type: "text/csv" }
        );

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;
        a.download =
            "campusbook-report.csv";

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        if (typeof CB !== "undefined" && CB.toast) {
            CB.toast(
                "Report downloaded as CSV.",
                "ok"
            );
        }
    });


    // Load report data
    loadReports();
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
