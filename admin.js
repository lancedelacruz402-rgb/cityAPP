

/* =====================================================
   LasPiñas Admin Dashboard
   ===================================================== */

var SESSION_KEY = "laspinas_user";
var ACCOUNTS_KEY = "laspinas_accounts";
// Shared with client.js: residents write here, the admin reads and updates it.
var REPORTS_KEY = "laspinas_reports";
var SEEN_KEY = "laspinas_admin_seen";
var SEEDED_KEY = "laspinas_reports_seeded";
var EVENTS_KEY = "laspinas_admin_events";

/* ---------- access guard: admins only ---------- */

(function guard() {
    var session = null;
    try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) {}
    if (!session || session.role !== "admin") {
        window.location.href = "Index.html";
    }
})();

/* ---------- static data ---------- */

var CATEGORIES = [
    "Broken Streetlights",
    "Flooding and Drainage",
    "Garbage Collection",
    "Damaged Roads",
    "Noise Complaints",
    "Other Concerns",
    "Emergency"
];

var BARANGAY_CLUSTER = [
    "Almanza Uno",
    "Almanza Dos",
    "BF International/CAA",
    "Danie Fajardo",
    "Elias Aldana",
    "Ilaya",
    "Manuyo Uno",
    "Manuyo Dos",
    "Pamplona Uno",
    "Pamplona Dos",
    "Pamplona Tres",
    "Pilar",
    "Pulang Lupa Uno",
    "Pulang Lupa Dos",
    "Talon Uno",
    "Talon Dos",
    "Talon Tres",
    "Talon Kuatro",
    "Talon Singko",
    "Zapote"
];

var DEPARTMENTS = [
    { code: "CEO",   name: "City Engineering Office",                      head: "Engr. Nazario Mendoza" },
    { code: "CENRO", name: "City Environment & Natural Resources (CENRO)", head: "For. Marilyn Hernandez" },
    { code: "TMO",   name: "Traffic Management Office (TMO)",              head: "Col. Roberto Cruz (Ret.)" },
    { code: "CHO",   name: "City Health Office",                           head: "Dr. Eleonor Casacop, MD" },
    { code: "DRRMO", name: "Disaster Risk Reduction & Management (DRRMO)", head: "Director Arthur Tan" },
    { code: "PSOD",  name: "Public Safety and Order Department",           head: "Major Danilo Reyes" }
];

var STATUSES = ["New", "Under Review", "Assigned", "Approved", "Rejected"];

var DEFAULT_REPORTS = [
    {
        id: "LP-0001",
        title: "Clogged Drainage Causing Gutter Flooding",
        category: "Flooding and Drainage",
        barangay: "BF International/CAA",
        status: "Rejected",
        department: "City Engineering Office",
        citizen: "Juan Dela Cruz",
        description: "Drainage along the main road is clogged and water overflows into the gutter during rain."
    },
    {
        id: "LP-0002",
        title: "Uncollected Commercial Solid Waste",
        category: "Garbage Collection",
        barangay: "Pulang Lupa Uno",
        status: "Assigned",
        department: "City Environment & Natural Resources (CENRO)",
        citizen: "Hannah Umila",
        description: "Commercial solid waste has not been collected for several days."
    },
    {
        id: "LP-0003",
        title: "Flickering and Dead Streetlights along Alabang-Zapote Frontage",
        category: "Broken Streetlights",
        barangay: "Zapote",
        status: "Under Review",
        department: "City Engineering Office",
        citizen: "Badang Ponteres",
        description: "Flickering and dead streetlights along the Alabang-Zapote frontage."
    },
    {
        id: "LP-0004",
        title: "Duplicate/Non-City Jurisdiction Complaint: Tollway Barrier",
        category: "Other Concerns",
        barangay: "Manuyo Dos",
        status: "Approved",
        department: "Traffic Management Office (TMO)",
        citizen: "Jade Supot",
        description: "Tollway barrier complaint that falls outside city jurisdiction."
    }
];

var PRIORITY_QUEUE = [
    { title: "Broken Streetlights", barangay: "Brgy. Zapote", desc: "Flickering and Dead Streetlights along Alabang-Zapote Frontage" },
    { title: "Damaged Roads",       barangay: "Brgy. Pilar",  desc: "Deep Pothole at Corner of Pilar Village Entrance" },
    { title: "Other Concerns",      barangay: "Brgy. Manuyo Dos", desc: "Duplicate/Non-City Jurisdiction Complaint: Tollway Barrier" }
];

var DEFAULT_EVENTS = [
    {
        id: 1,
        category: "Environment",
        title: "Las Piñas-Parañaque Critical Habitat Wetland Sanctuary Protected",
        desc: "Over 25,000 migratory shorebirds recorded in the Ramsar Wetland of International Importance as coastal mangrove reforestation continues.",
        image: "",
        date: "October 24, 2026"
    },
    {
        id: 2,
        category: "Public Advisory",
        title: "Citizen Services Portal & Green Line Reporting Accelerated at City Hall",
        desc: "Las Piñas Connect rollout speeds up issue resolution times for damaged roads, drainage clogging, and streetlights with 48-hour response protocol.",
        image: "",
        date: "October 10, 2026"
    }
];

var STATIC_USERS = [
    { name: "Juan Dela Cruz",  barangay: "BF International/CAA", contact: "juandelacruz04@gmail.com" },
    { name: "Hannah Umila",    barangay: "Pulang Lupa Uno",      contact: "umilahannah@gmail.com" },
    { name: "Badang Ponteres", barangay: "Zapote",               contact: "badingako456@gmail.com" },
    { name: "Jade Supot",      barangay: "Manuyo Dos",           contact: "supotsjjade123@gmail.com" }
];

/* ---------- storage helpers ---------- */

function load(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(fallback));
}

function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

/* ---------- shared reports ---------- */

var LEGACY_STATUS = { "Pending": "New", "In Progress": "Assigned", "Resolved": "Approved" };

function normalize(r) {
    r.status = LEGACY_STATUS[r.status] || r.status || "New";
    r.title = r.title || r.category || "Untitled report";
    r.citizen = r.citizen || r.owner || "Unknown";
    r.barangay = r.barangay || r.location || "—";
    r.location = r.location || r.barangay;
    r.department = r.department || "Unassigned";
    r.contact = r.contact || "";
    r.photo = r.photo || "";
    r.createdAt = r.createdAt || 0;
    r.updates = r.updates || [];
    return r;
}

function loadReports() {
    return load(REPORTS_KEY, []).map(normalize);
}

// one-time demo data so the dashboard isn't empty on first open
(function seed() {
    var done = false;
    try { done = localStorage.getItem(SEEDED_KEY); } catch (e) {}
    if (done) return;
    var existing = load(REPORTS_KEY, []);
    var base = Date.now() - 7 * 86400000;
    DEFAULT_REPORTS.forEach(function (r, i) {
        r.createdAt = base + i * 3600000;
        existing.push(r);
    });
    save(REPORTS_KEY, existing);
    save(SEEN_KEY, Date.now());
    try { localStorage.setItem(SEEDED_KEY, "1"); } catch (e) {}
})();

var reports = loadReports();
var events = load(EVENTS_KEY, DEFAULT_EVENTS);
// Residents read this same key for the City Announcements page, so store the defaults once.
try { if (localStorage.getItem(EVENTS_KEY) === null) save(EVENTS_KEY, events); } catch (e) {}

function fmtDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ---------- small helpers ---------- */

function $(id) { return document.getElementById(id); }

function esc(str) {
    var d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
}

function badge(status) {
    var cls = status.split(" ")[0]; // "Under Review" -> "Under"
    return '<span class="badge ' + cls + '">' + esc(status) + "</span>";
}

/* =====================================================
   NAVIGATION
   ===================================================== */

function showPage(name) {
    var pages = document.querySelectorAll(".page");
    var links = document.querySelectorAll("#navbar a");

    if (!$("page-" + name)) name = "overview";

    pages.forEach(function (p) { p.classList.toggle("active", p.id === "page-" + name); });
    links.forEach(function (a) { a.classList.toggle("active", a.dataset.page === name); });

    if (location.hash !== "#" + name) {
        history.replaceState(null, "", "#" + name);
    }
}

document.querySelectorAll("#navbar a, [data-page-link]").forEach(function (a) {
    a.addEventListener("click", function (e) {
        e.preventDefault();
        showPage(a.dataset.page || a.dataset.pageLink);
    });
});

$("logoutBtn").addEventListener("click", function () {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    window.location.href = "login.html";
});

/* =====================================================
   OVERVIEW
   ===================================================== */

function renderOverview() {
    var total = reports.length;
    var count = function (s) {
        return reports.filter(function (r) { return r.status === s; }).length;
    };
    var resolved = count("Approved");
    var rate = total ? Math.round((resolved / total) * 100) : 0;

    var stats = [
        { label: "Total Report", value: total,               note: "All 20 Barangays" },
        { label: "New Reports",  value: count("New"),         note: "Requires review" },
        { label: "Under Review", value: count("Under Review"), note: "Verification" },
        { label: "In Progress",  value: count("Assigned"),    note: "Dispatched" },
        { label: "Resolved",     value: resolved,             note: rate + "% Rate" },
        { label: "Rejected",     value: count("Rejected"),    note: "Out of scope" }
    ];

    $("statGrid").innerHTML = stats.map(function (s) {
        return '<div class="stat-card"><h4>' + s.label + '</h4><div class="num">' + s.value +
               "</div><small>" + s.note + "</small></div>";
    }).join("");

    // category bars
    $("categoryBars").innerHTML = CATEGORIES.map(function (c) {
        var n = reports.filter(function (r) { return r.category === c; }).length;
        var pct = total ? Math.round((n / total) * 100) : 0;
        return '<div class="bar-row"><div class="bar-label"><span>' + esc(c) + "</span><span>" +
               n + " (" + pct + '%)</span></div><div class="bar-track"><div class="bar-fill" style="width:' +
               pct + '%"></div></div></div>';
    }).join("");

// barangay bars - all 20 barangays
var barangayTotal = reports.length;

$("barangayBars").innerHTML = BARANGAY_CLUSTER.map(function (b) {

    // Count reports based on the incident barangay
    var n = reports.filter(function (r) {
        return (r.barangay || "").trim().toLowerCase() === b.toLowerCase();
    }).length;

    var pct = barangayTotal
        ? Math.round((n / barangayTotal) * 100)
        : 0;

    return `
        <div class="bar-row">
            <div class="bar-label">
                <span>Brgy. ${esc(b)}</span>
                <span>${n} Cases (${pct}%)</span>
            </div>

            <div class="bar-track">
                <div class="bar-fill" style="width: ${pct}%"></div>
            </div>
        </div>
    `;

}).join("");

    // priority queue
    // open (unresolved) reports, emergencies first, then newest
    var queue = reports.filter(function (r) { return r.status === "New" || r.status === "Under Review"; })
        .sort(function (a, b) { return (!!b.emergency - !!a.emergency) || (b.createdAt - a.createdAt); })
        .slice(0, 5);

    $("queueList").innerHTML = queue.length ? queue.map(function (q) {
        return '<div class="queue-item"><div><div class="queue-title">' + esc(q.emergency ? "EMERGENCY – " + (q.emergencyType || "") : q.category) +
               "<span>" + esc(q.citizen) + " • " + esc(q.location) + '</span></div><div class="queue-desc">' + esc(q.title) +
               '</div></div><div class="queue-actions">' +
               '<button type="button" class="btn-gold" data-triage="' + esc(q.id) + '">Triage/Update</button>' +
               '<button type="button" class="btn-grey" data-look="' + esc(q.id) + '">Inspect</button></div></div>';
    }).join("") : '<div class="empty">No reports waiting for triage.</div>';

    $("queueList").querySelectorAll("[data-triage]").forEach(function (b) {
        b.addEventListener("click", function () { openEditReport(b.dataset.triage); });
    });
    $("queueList").querySelectorAll("[data-look]").forEach(function (b) {
        b.addEventListener("click", function () { openInspect(b.dataset.look); });
    });
}

/* =====================================================
   REPORT MANAGEMENT
   ===================================================== */


function openEditReport(id) {
    var r = findReport(id);
    if (!r) return;

    var statusOpts = STATUSES.map(function (s) {
        return "<option" + (s === r.status ? " selected" : "") + ">" + s + "</option>";
    }).join("");

    var deptOpts = "<option" + (r.department === "Unassigned" ? " selected" : "") + ">Unassigned</option>" +
        DEPARTMENTS.map(function (d) {
            return "<option" + (d.name === r.department ? " selected" : "") + ">" + esc(d.name) + "</option>";
        }).join("");

    var lastRemark = r.publicRemark || "Report received and queued for dispatch verification.";

    $("modal").querySelector(".modal").classList.add("modal-wide");

    openModal(
        '<div class="case-citizen">' +
            esc(r.citizen) +
            (r.emergency ? ' <span class="tag-emg">EMERGENCY</span>' : "") +
        "</div>" +

        '<h3 class="case-title">Triage &amp; Dispatch Case</h3>' +

        '<div class="case-summary">' +
            '<div class="case-summary-title">' + esc(r.title) + "</div>" +
            '<div class="case-summary-meta">' +
                esc(r.emergency ? "Emergency - " + r.emergencyType : r.category) +
                " &middot; Brgy. " + esc(r.barangay) +
                (r.location && r.location !== r.barangay ? " (" + esc(r.location) + ")" : "") +
            "</div>" +
            '<div class="case-summary-desc">' + esc(r.description) + "</div>" +
            (r.photo
                ? '<img class="case-summary-photo" src="' + esc(r.photo) + '" alt="Attached photo">'
                : "") +
        "</div>" +

        '<div class="form-row">' +
            '<div>' +
                '<label for="editStatus">Update Status</label>' +
                '<select id="editStatus">' + statusOpts + '</select>' +
            '</div>' +

            '<div>' +
                '<label for="editDept">Assign Responsible Department</label>' +
                '<select id="editDept">' + deptOpts + '</select>' +
            '</div>' +
        '</div>' +

        '<label for="editRemark">Public Remarks <span class="label-note">(Notified to Citizen in Mobile App)</span></label>' +
        '<input type="text" id="editRemark" value="' + esc(lastRemark) + '">' +

        '<label for="completionPhoto">Proof of Completion Photo</label>' +
        '<input type="file" id="completionPhoto" accept="image/*">' +

        '<div id="completionPreview" style="margin-top:10px;">' +
            (r.completionPhoto
                ? '<img src="' + esc(r.completionPhoto) + '" style="width:100%;max-height:250px;object-fit:contain;border-radius:10px;">'
                : '<p class="label-note">No completion photo uploaded yet.</p>') +
        '</div>' +

        '<label for="editNotes">Administrative Internal Notes <span class="label-note">(Private to LGU)</span></label>' +
        '<textarea id="editNotes" placeholder="e.g. Coordination with barangay kagawad">' +
            esc(r.internalNotes || "") +
        '</textarea>' +

        '<div class="modal-actions">' +
            '<button type="button" class="secondary" data-close>Cancel</button>' +
            '<button type="button" class="primary" id="saveReport">Commit Update &amp; Notify the Citizen</button>' +
        '</div>'
    );

    // IMAGE PREVIEW
    $("completionPhoto").addEventListener("change", function () {
        var file = this.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image.");
            this.value = "";
            return;
        }

        if (file.size > 500 * 1024) {
            alert("Image must be below 500KB.");
            this.value = "";
            return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
            $("completionPreview").innerHTML =
                '<img src="' + e.target.result + '" ' +
                'style="width:100%;max-height:250px;object-fit:contain;border-radius:10px;">';
        };

        reader.readAsDataURL(file);
    });

    // SAVE REPORT AND COMPLETION PHOTO
    $("saveReport").addEventListener("click", function () {

        var file = $("completionPhoto").files[0];

        function saveUpdate(uploadedPhoto) {

            // Reload reports to avoid overwriting recent submissions
            reports = loadReports();

            var cur = findReport(id);

            if (!cur) {
                closeModal();
                return;
            }

            var newStatus = $("editStatus").value;
            var newDept = $("editDept").value;
            var remark = $("editRemark").value.trim();
            var notes = $("editNotes").value.trim();

            var completionPhoto =
                uploadedPhoto || cur.completionPhoto || "";

            var changed =
                cur.status !== newStatus ||
                cur.department !== newDept ||
                remark !== (cur.publicRemark || "") ||
                completionPhoto !== (cur.completionPhoto || "");

            if (changed) {
                cur.updates.push({
                    status: newStatus,
                    department: newDept,
                    remark: remark,
                    completionPhoto: completionPhoto,
                    at: Date.now()
                });
            }

            cur.status = newStatus;
            cur.department = newDept;
            cur.publicRemark = remark;
            cur.internalNotes = notes;
            cur.completionPhoto = completionPhoto;

            save(REPORTS_KEY, reports);

            closeModal();
            refreshAll();
        }

        if (file) {

            if (!file.type.startsWith("image/")) {
                alert("Invalid image file.");
                return;
            }

            if (file.size > 500 * 1024) {
                alert("Image must be below 500KB.");
                return;
            }

            var reader = new FileReader();

            reader.onload = function (e) {
                saveUpdate(e.target.result);
            };

            reader.onerror = function () {
                alert("Unable to read the image.");
            };

            reader.readAsDataURL(file);

        } else {
            saveUpdate("");
        }

    });
}


/* =====================================================
   REPORT TABLE & FILTERS
   ===================================================== */

function findReport(id) {
    return reports.find(function (r) {
        return String(r.id) === String(id);
    });
}

function fillBarangayFilter() {
    var select = $("barangayFilter");
    var current = select.value;

    select.innerHTML = '<option value="">All 20 Barangays</option>' +
        BARANGAY_CLUSTER.map(function (b) {
            return '<option value="' + esc(b) + '">' + esc(b) + '</option>';
        }).join("");

    select.value = current;
}

function renderReports() {
    var search = $("reportSearch").value.trim().toLowerCase();
    var status = $("statusFilter").value;
    var barangay = $("barangayFilter").value;

    var filtered = reports.filter(function (r) {
        var matchesSearch =
            !search ||
            String(r.id || "").toLowerCase().includes(search) ||
            String(r.title || "").toLowerCase().includes(search) ||
            String(r.citizen || "").toLowerCase().includes(search) ||
            String(r.category || "").toLowerCase().includes(search);

        var matchesStatus = !status || r.status === status;
        var matchesBarangay = !barangay || r.barangay === barangay;

        return matchesSearch && matchesStatus && matchesBarangay;
    });

    $("reportRows").innerHTML = filtered.length
        ? filtered.map(function (r) {
            return '<div class="row report-grid report-row">' +
                '<div class="report-title">' +
                    '<strong>' + esc(r.title) + '</strong>' +
                    '<small>' + esc(r.id) + ' • ' + esc(r.category) + '</small>' +
                '</div>' +
                '<div>' + esc(r.barangay) + '</div>' +
                '<div>' + badge(r.status) + '</div>' +
                '<div>' + esc(r.department) + '</div>' +
                '<div class="center">' +
                    '<button type="button" class="btn-gold" data-edit="' + esc(r.id) + '">Update</button> ' +
                    '<button type="button" class="btn-grey" data-inspect="' + esc(r.id) + '">View</button>' +
                '</div>' +
            '</div>';
        }).join("")
        : '<div class="empty">No reports found.</div>';

    $("reportRows").querySelectorAll("[data-edit]").forEach(function (b) {
        b.addEventListener("click", function () {
            openEditReport(b.dataset.edit);
        });
    });

    $("reportRows").querySelectorAll("[data-inspect]").forEach(function (b) {
        b.addEventListener("click", function () {
            openInspect(b.dataset.inspect);
        });
    });
}


function openInspect(id) {
    var r = findReport(id);
    if (!r) return;

    openModal(
        '<div class="case-citizen">' + esc(r.citizen) + '</div>' +
        '<h3 class="case-title">' + esc(r.title) + '</h3>' +

        '<div class="case-summary">' +

            '<p><strong>Reference Number:</strong> ' + esc(r.id) + '</p>' +

            '<p><strong>Category:</strong> ' +
                esc(r.category || "Not specified") + '</p>' +

            '<p><strong>Incident Barangay:</strong> Brgy. ' +
                esc(r.barangay || "Not specified") + '</p>' +

                '<div class="incident-location-admin">' +
    '<h3>Incident Pin Location</h3>' +
    (
        Number.isFinite(Number(r.latitude)) &&
        Number.isFinite(Number(r.longitude)) &&
        r.latitude !== "" &&
        r.longitude !== ""
        ?
        '<iframe ' +
            'src="https://maps.google.com/maps?q=' +
                encodeURIComponent(r.latitude + "," + r.longitude) +
                '&output=embed" ' +
            'width="100%" height="280" ' +
            'style="border:0; border-radius:10px;" ' +
            'loading="lazy" ' +
            'referrerpolicy="no-referrer-when-downgrade">' +
        '</iframe>' +
        '<p><strong>Latitude:</strong> ' + esc(r.latitude) + '</p>' +
        '<p><strong>Longitude:</strong> ' + esc(r.longitude) + '</p>' +
        '<a href="https://www.google.com/maps?q=' +
            encodeURIComponent(r.latitude + "," + r.longitude) +
            '" target="_blank" rel="noopener noreferrer">' +
            'Open in Google Maps' +
        '</a>'
        :
        '<p>No incident pin location available.</p>'
    ) +
'</div>' +

            '<p><strong>Specific Location:</strong> ' +
                esc(r.location || "Not specified") + '</p>' +

            '<p><strong>Status:</strong> ' + badge(r.status) + '</p>' +

            '<p><strong>Assigned Department:</strong> ' +
                esc(r.department) + '</p>' +

            '<p><strong>Description:</strong><br>' +
                esc(r.description || "No description provided.") + '</p>' +

            (r.photo
                ? '<p><strong>Submitted Photo:</strong></p>' +
                  '<img class="case-summary-photo" src="' + esc(r.photo) + '" alt="Submitted photo">'
                : '') +

            (r.completionPhoto
                ? '<p><strong>Proof of Completion:</strong></p>' +
                  '<img class="case-summary-photo" src="' + esc(r.completionPhoto) + '" alt="Completion proof">'
                : '') +

            '<p><strong>Public Remarks:</strong><br>' +
                esc(r.publicRemark || "None") + '</p>' +

            '<p><strong>Internal Notes:</strong><br>' +
                esc(r.internalNotes || "None") + '</p>' +

        '</div>' +

        '<div class="modal-actions">' +
            '<button type="button" class="secondary" data-close>Close</button>' +
            '<button type="button" class="primary" id="inspectUpdate">Update Report</button>' +
        '</div>'
    );

    $("inspectUpdate").addEventListener("click", function () {
        openEditReport(id);
    });
}



$("reportSearch").addEventListener("input", renderReports);
$("statusFilter").addEventListener("change", renderReports);
$("barangayFilter").addEventListener("change", renderReports);



/* =====================================================
   EVENTS & NEWS
   ===================================================== */

function renderEvents() {
    if (!events.length) {
        $("eventGrid").innerHTML = '<div class="empty" style="color:#777">No published articles.</div>';
        return;
    }

    $("eventGrid").innerHTML = events.map(function (e) {
        var img = e.image
            ? '<div class="event-img" style="background-image:url(\'' + esc(e.image).replace(/'/g, "%27") + '\')"></div>'
            : '<div class="event-img"><i class="fa-regular fa-newspaper"></i></div>';

        return '<div class="event-card"><div class="event-top">' + img +
            '<div><div class="event-cat">' + esc(e.category) + '</div>' +
            '<div class="event-title">' + esc(e.title) + '</div>' +
            '<div class="event-desc">' + esc(e.desc) + "</div></div></div>" +
            '<div class="event-bottom"><span>' + esc(e.date) + "</span>" +
            '<button type="button" class="unpublish" data-unpub="' + e.id + '">Unpublish <i class="fa-solid fa-trash"></i></button></div></div>';
    }).join("");

    $("eventGrid").querySelectorAll("[data-unpub]").forEach(function (b) {
        b.addEventListener("click", function () {
            if (!confirm("Unpublish this article?")) return;
            events = events.filter(function (e) { return String(e.id) !== b.dataset.unpub; });
            save(EVENTS_KEY, events);
            renderEvents();
        });
    });
}

$("publishBtn").addEventListener("click", function () {
    openModal(
        "<h3>Publish New Article</h3>" +
        '<label for="artCat">Category</label>' +
        '<select id="artCat"><option>Environment</option><option>Public Advisory</option><option>Community</option><option>Health</option><option>Event</option></select>' +
        '<label for="artTitle">Title</label><input type="text" id="artTitle" placeholder="Article headline">' +
        '<label for="artDesc">Summary</label><textarea id="artDesc" placeholder="Short summary shown on the resident homepage"></textarea>' +
        '<label for="artImg">Image URL <span style="font-weight:normal;color:#777">(optional)</span></label>' +
        '<input type="text" id="artImg" placeholder="https://... or images/photo.jpg">' +
        '<p class="form-msg" id="artMsg"></p>' +
        '<div class="modal-actions"><button type="button" class="secondary" data-close>Cancel</button>' +
        '<button type="button" class="primary" id="saveArticle">Publish</button></div>'
    );

    $("saveArticle").addEventListener("click", function () {
        var title = $("artTitle").value.trim();
        var desc = $("artDesc").value.trim();

        if (!title || !desc) {
            $("artMsg").textContent = "Please enter a title and a summary.";
            return;
        }

        events.unshift({
            id: Date.now(),
            category: $("artCat").value,
            title: title,
            desc: desc,
            image: $("artImg").value.trim(),
            date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        });

        save(EVENTS_KEY, events);
        closeModal();
        renderEvents();
    });
});

/* =====================================================
   USER DIRECTORY
   ===================================================== */

function getUsers() {
    var accounts = {};
    try { accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; } catch (e) {}

    var registered = Object.keys(accounts).map(function (k) {
        var a = accounts[k];
        return { name: a.name, barangay: a.barangay, contact: a.contact };
    });

    return STATIC_USERS.concat(registered);
}

function renderUsers() {
    var q = $("userSearch").value.trim().toLowerCase();

    var list = getUsers().filter(function (u) {
        return !q || (u.name + " " + u.barangay + " " + u.contact).toLowerCase().indexOf(q) !== -1;
    });

    if (!list.length) {
        $("userRows").innerHTML = '<div class="empty">No users found.</div>';
        return;
    }

    $("userRows").innerHTML = list.map(function (u) {
        return '<div class="row user-grid user-row">' +
            '<div class="user-name">' + esc(u.name) + "</div>" +
            '<div class="user-brgy">' + esc(u.barangay) + "</div>" +
            '<div class="center" style="display:flex">' + badge("Active") + "</div>" +
            '<div class="center" style="display:flex">' + badge("Resident") + "</div>" +
            '<div class="user-email">' + esc(u.contact) + "</div></div>";
    }).join("");
}

$("userSearch").addEventListener("input", renderUsers);

/* =====================================================
   ANALYTICS
   ===================================================== */

function renderAnalytics() {
    $("deptGrid").innerHTML = DEPARTMENTS.map(function (d) {
        var assigned = reports.filter(function (r) { return r.department === d.name; });
        var solved = assigned.filter(function (r) { return r.status === "Approved"; }).length;
        var pct = assigned.length ? Math.round((solved / assigned.length) * 100) : 0;

        return '<div class="dept-card"><div class="dept-top"><span class="code">' + d.code +
            '</span><span class="solve">' + pct + '% Solve</span></div>' +
            '<div class="dept-name">' + esc(d.name) + "</div>" +
            '<div class="dept-head">Head: ' + esc(d.head) + "</div>" +
            '<div class="dept-foot"><span>Assigned Cases:</span><b>' + assigned.length + "</b></div></div>";
    }).join("");
}

/* =====================================================
   MODAL
   ===================================================== */

function openModal(html) {
    // other dialogs use the normal width; the triage dialog opts in to the wide one
    var box = $("modal").querySelector(".modal");
    var wide = box.classList.contains("modal-wide") && html.indexOf("case-citizen") !== -1;
    box.classList.toggle("modal-wide", wide);
    $("modalBody").innerHTML = html;
    $("modal").classList.remove("hidden");
    $("modalBody").querySelectorAll("[data-close]").forEach(function (b) {
        b.addEventListener("click", closeModal);
    });
}

function closeModal() {
    $("modal").classList.add("hidden");
    $("modalBody").innerHTML = "";
}

$("modalClose").addEventListener("click", closeModal);
$("modal").addEventListener("click", function (e) {
    if (e.target === $("modal")) closeModal();
});
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
});

/* =====================================================
   INIT
   ===================================================== */

fillBarangayFilter();
renderOverview();
renderReports();
renderEvents();
renderUsers();
renderAnalytics();
showPage(location.hash.replace("#", "") || "overview");

/* =====================================================
   NOTIFICATIONS (new filings + whether resolved)
   ===================================================== */

function lastSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || 0; } catch (e) { return 0; }
}

function renderBell() {
    var seen = lastSeen();
    var fresh = reports.filter(function (r) { return r.createdAt > seen; });
    var el = $("bellCount");
    el.textContent = fresh.length > 99 ? "99+" : fresh.length;
    el.classList.toggle("hidden", !fresh.length);
    $("bellBtn").classList.toggle("alert", fresh.some(function (r) { return r.emergency; }));
}

function openNotifications() {
    var seen = lastSeen();
    var list = reports.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 40);

    var html = "<h3>Notifications</h3>";
    if (!list.length) {
        html += '<div class="empty" style="color:#777">No reports filed yet.</div>';
    } else {
        html += '<div class="notif-list">' + list.map(function (r) {
            var st = r.status === "Approved"
                ? '<span class="badge Approved">Resolved</span>'
                : badge(r.status);
            return '<div class="notif-item' + (r.createdAt > seen ? " is-new" : "") + '" data-note="' + esc(r.id) + '">' +
                '<div class="notif-main"><div class="notif-title">' +
                (r.emergency ? '<span class="tag-emg">EMERGENCY</span>' : "") + esc(r.title) + "</div>" +
                '<div class="notif-sub">' + esc(r.citizen) + " &bull; " + esc(r.location) + "</div>" +
                '<div class="notif-sub">' + esc(fmtDate(r.createdAt)) + (r.photo ? " &bull; photo attached" : "") + "</div></div>" +
                '<div class="notif-status">' + st + "</div></div>";
        }).join("") + "</div>";
    }
    html += '<div class="modal-actions"><button type="button" class="secondary" data-close>Close</button></div>';
    openModal(html);

    $("modalBody").querySelectorAll("[data-note]").forEach(function (n) {
        n.addEventListener("click", function () { openInspect(n.dataset.note); });
    });

    save(SEEN_KEY, Date.now());
    renderBell();
}

$("bellBtn").addEventListener("click", openNotifications);

function refreshAll() {
    fillBarangayFilter();
    renderOverview();
    renderReports();
    renderUsers();
    renderAnalytics();
    renderBell();
}

// live sync: a resident files / cancels a report in another tab
window.addEventListener("storage", function (e) {
    if (e.key === REPORTS_KEY || e.key === ACCOUNTS_KEY) {
        reports = loadReports();
        refreshAll();
    }
});

renderBell();
