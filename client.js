(function () {
  "use strict";

  /* ------------------------------------------------------------------
     CONFIG – adjust these to match your existing login page
     ------------------------------------------------------------------ */
  var CONFIG = {
    loginUrl: "Index.html",          // where to send people who aren't signed in
    sessionKey: "laspinas_user",     // localStorage key your login page writes to
    requireLogin: false,             // set true once your login stores the session
    reportsKey: "laspinas_reports",
    eventsKey: "laspinas_admin_events",   // articles published from the admin dashboard
    profilePrefix: "laspinas_profile_"
  };

  // Replace the blank entries with verified official numbers.
  var HOTLINES = [
    { label: "Emergency Hotline", number: "911" },
    { label: "City Police Contact", number: "" },
    { label: "Fire and Rescue Contact", number: "" }
  ];

  // Add or edit announcements here (image is optional).
  var ANNOUNCEMENTS = [
    {
      title: "Community Update",
      body: "Check this section for verified city announcements, advisories, and public notices.",
      date: "",
      image: ""   // e.g. "images/community.jpg"
    }
  ];

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return Math.floor(diff / 60) + " min ago";
    if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";
    if (diff < 604800) return Math.floor(diff / 86400) + " day(s) ago";
    return new Date(ts).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  }

  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  /* ------------------------------------------------------------------
     Session
     ------------------------------------------------------------------ */
  function getUser() {
    var raw = null;
    try { raw = localStorage.getItem(CONFIG.sessionKey); } catch (e) {}
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) { /* plain string */ }
    return { username: raw };
  }

  var user = getUser();
  if (CONFIG.requireLogin && !user) {
    window.location.replace(CONFIG.loginUrl);
    return;
  }
  user = user || { username: "resident" };
  var username = user.username || user.name || "resident";

  function getProfile() {
    var saved = readJSON(CONFIG.profilePrefix + username, {});
    return {
      name: saved.name || user.name || user.fullName || username,
      contact: saved.contact || "",
      barangay: saved.barangay || ""
    };
  }

  function firstName(name) { return String(name).trim().split(/\s+/)[0]; }

  function renderIdentity() {
    var p = getProfile();
    $("#avatarInitial").textContent = (p.name || "?").charAt(0).toUpperCase();
    $("#welcomeTitle").textContent = "Welcome, " + firstName(p.name) + "!";
  }

  /* ------------------------------------------------------------------
     Reports store (per user)
     ------------------------------------------------------------------ */
  // This store is SHARED with admin.js (same key "laspinas_reports").
  // Statuses are stored in the admin vocabulary:
  //   New / Under Review / Assigned / Approved / Rejected
  // and translated to resident-friendly labels for display.
  var LEGACY_STATUS = { "Pending": "New", "In Progress": "Assigned", "Resolved": "Approved" };

  function statusLabel(s) {
    s = LEGACY_STATUS[s] || s;
    if (s === "New") return "Pending";
    if (s === "Under Review" || s === "Assigned") return "In Progress";
    if (s === "Approved") return "Resolved";
    return s; // Rejected
  }

  function allReports() { return readJSON(CONFIG.reportsKey, []); }
  function myReports() {
    return allReports()
      .filter(function (r) { return r.owner === username; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
  }
  function saveReports(list) { return writeJSON(CONFIG.reportsKey, list); }

  function addReport(data) {
    var list = allReports();
    var p = getProfile();
    var now = Date.now();
    var id = "LP-" + now.toString(36).toUpperCase();
    var title = data.emergency
      ? "EMERGENCY: " + data.category
      : data.category + " – " + data.description.slice(0, 50) + (data.description.length > 50 ? "…" : "");
    list.push({
      id: id,
      owner: username,
      citizen: p.name,
      barangay: data.barangay,
      title: title,
      category: data.emergency ? "Emergency" : data.category,
      emergencyType: data.emergency ? data.category : "",
      location: data.location,
      latitude: data.latitude,
longitude: data.longitude,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      contact: data.contact || p.contact || "",
      photo: data.photo || "",
      emergency: !!data.emergency,
      status: "New",
      department: "Unassigned",
      updates: [],
      createdAt: now
    });
    if (!saveReports(list)) {
      // storage full – retry without the photo
      list[list.length - 1].photo = "";
      saveReports(list);
    }
    return id;
  }

  /* ------------------------------------------------------------------
     Announcements (published by the admin in Events & News)
     ------------------------------------------------------------------ */
  function getAnnouncements() {
    var list = readJSON(CONFIG.eventsKey, null);
    if (!Array.isArray(list) || !list.length) return list ? [] : ANNOUNCEMENTS;
    return list.map(function (a) {
      return { title: a.title || "", body: a.desc || a.body || "", date: a.date || "", image: a.image || "", category: a.category || "" };
    });
  }

  function annImg(a, cls) {
    return a.image
      ? '<img class="' + cls + '" src="' + escapeHTML(a.image) + '" alt="" onerror="this.style.display=\'none\'">'
      : '<div class="' + cls + '"></div>';
  }

  function renderAnnouncements() {
    var list = getAnnouncements();
    $("#announcementList").innerHTML = list.length
      ? list.map(function (a) {
          return '<article class="ann-card">' + annImg(a, "ann-card__img") +
            '<div class="ann-card__body">' +
            (a.category ? '<span class="ann-card__cat">' + escapeHTML(a.category) + '</span>' : "") +
            '<h3>' + escapeHTML(a.title) + '</h3><p>' + escapeHTML(a.body) + '</p>' +
            (a.date ? '<time>' + escapeHTML(a.date) + '</time>' : "") + '</div></article>';
        }).join("")
      : '<div class="empty">No announcements right now.</div>';
  }

  /* ------------------------------------------------------------------
     Home rendering
     ------------------------------------------------------------------ */
  function renderHome() {
    var reports = myReports();
    var count = function (s) { return reports.filter(function (r) { return statusLabel(r.status) === s; }).length; };
    $("#statPending").textContent = count("Pending");
    $("#statProgress").textContent = count("In Progress");
    $("#statResolved").textContent = count("Resolved");

    // announcements
    var anns = getAnnouncements().slice(0, 3);
    $("#announcements").innerHTML = anns.length ? anns.map(function (a) {
      return '<a class="announce__item" href="#announcements">' + annImg(a, "announce__thumb") +
        '<div><h4>' + escapeHTML(a.title) + '</h4><p>' + escapeHTML(a.body) + '</p>' +
        (a.date ? '<time>' + escapeHTML(a.date) + '</time>' : '') + '</div></a>';
    }).join("") : '<p class="note">No announcements right now.</p>';

    // activity
    var activity = $("#activity");
    if (!reports.length) {
      activity.innerHTML =
        "<li>No reports yet. Submit one and it will show up here.</li>" +
        "<li>Status updates on your concerns will appear here.</li>";
    } else {
      activity.innerHTML = reports.slice(0, 3).map(function (r) {
        var s = statusLabel(r.status), name = r.emergencyType || r.category;
        var text = s === "Pending" ? "Your report on “" + name + "” is waiting for review."
                 : s === "In Progress" ? "Your report on “" + name + "” is being handled."
                 : s === "Resolved" ? "Your report on “" + name + "” was resolved."
                 : "Your report on “" + name + "” was closed by the city.";
        var last = r.updates && r.updates.length ? r.updates[r.updates.length - 1].at : r.createdAt;
        return "<li><div>" + escapeHTML(text) + "<small>" + timeAgo(last) + "</small></div></li>";
      }).join("");
    }

    // hotlines
    $("#hotlines").innerHTML = HOTLINES.map(function (h) {
      var num = h.number
        ? '<a class="num" href="tel:' + escapeHTML(h.number.replace(/\s+/g, "")) + '">' + escapeHTML(h.number) + "</a>"
        : '<span class="num">—</span>';
      return "<li>" + num + "<span>" + escapeHTML(h.label) + "</span></li>";
    }).join("");
    $("#hotlineNote").textContent = HOTLINES.some(function (h) { return !h.number; })
      ? "Replace blank entries with verified official Las Piñas City contact numbers."
      : "";
  }

  /* ------------------------------------------------------------------
     Status page
     ------------------------------------------------------------------ */
  var activeFilter = "all";

  function renderStatus() {
    var list = myReports().filter(function (r) {
      return activeFilter === "all" || statusLabel(r.status) === activeFilter;
    });
    var box = $("#statusList");

    if (!list.length) {
      box.innerHTML = '<div class="empty">Nothing to show here yet. ' +
        '<a href="#report">Report an issue</a></div>';
      return;
    }

    box.innerHTML = list.map(function (r) {
      var label = statusLabel(r.status);
      var cls = "badge--" + label.replace(/\s+/g, "-");
      return '<article class="report">' +
        '<h4>' + escapeHTML(r.emergency ? (r.emergencyType || r.category) : r.category) + (r.emergency ? '<span class="tag-emg">EMERGENCY</span>' : "") + "</h4>" +
        "<p>" + escapeHTML(r.description) + "</p>" +
        '<div class="report__meta">' + escapeHTML(r.location) + " • " + escapeHTML(r.id) + " • " + timeAgo(r.createdAt) + "</div>" +
        (r.photo ? '<img src="' + r.photo + '" alt="Attached photo">' : "") +
        '<div class="report__side"><span class="badge ' + cls + '">' + escapeHTML(label) + "</span>" +
        (label === "Pending" ? '<button class="link-btn" data-cancel="' + escapeHTML(r.id) + '">Cancel report</button>' : "") +
        "</div></article>";
    }).join("");
  }

  $("#filters").addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    $$(".chip").forEach(function (c) { c.classList.toggle("is-active", c === btn); });
    renderStatus();
  });

  $("#statusList").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    if (!confirm("Cancel this report?")) return;
    var id = btn.dataset.cancel;
    saveReports(allReports().filter(function (r) { return !(r.id === id && r.owner === username); }));
    renderStatus();
    toast("Report cancelled");
  });

  /* ------------------------------------------------------------------
     Forms
     ------------------------------------------------------------------ */
  function readPhoto(file) {
    return new Promise(function (resolve) {
      if (!file || file.type.indexOf("image") !== 0) return resolve("");
      var reader = new FileReader();
      reader.onload = function () {
        // shrink so it fits in localStorage
        var img = new Image();
        img.onload = function () {
          var max = 640;
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement("canvas");
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = function () { resolve(""); };
        img.src = reader.result;
      };
      reader.onerror = function () { resolve(""); };
      reader.readAsDataURL(file);
    });
  }

  function missing(form, names) {
    return names.some(function (n) { return !form.elements[n].value.trim(); });
  }


/* -------------------------------------------------------
   INCIDENT LOCATION MAPS - OPENFREEMAP + MAPLIBRE
   ------------------------------------------------------- */

var incidentMaps = {};

function initIncidentMap(type) {
    var isEmergency = type === "emergency";

    var mapId = isEmergency ? "emergencyMap" : "reportMap";
    var latId = isEmergency ? "emergencyLatitude" : "reportLatitude";
    var lngId = isEmergency ? "emergencyLongitude" : "reportLongitude";
    var coordinatesId = isEmergency
        ? "emergencyCoordinates"
        : "reportCoordinates";

    var mapElement = document.getElementById(mapId);

    if (!mapElement || typeof maplibregl === "undefined") {
        console.error("MapLibre could not be loaded.");
        return;
    }

    // Prevent creating the same map twice
    if (incidentMaps[type]) {
        setTimeout(function () {
            incidentMaps[type].map.resize();
        }, 200);
        return;
    }

    // Default center: Las Piñas City
    var map = new maplibregl.Map({
        container: mapId,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [120.99, 14.45],
        zoom: 13
    });

    map.addControl(
        new maplibregl.NavigationControl(),
        "top-right"
    );

    var marker = null;

    function saveCoordinates(lng, lat) {
        document.getElementById(latId).value = lat.toFixed(7);
        document.getElementById(lngId).value = lng.toFixed(7);

        document.getElementById(coordinatesId).textContent =
            "Selected Location: " +
            lat.toFixed(6) + ", " + lng.toFixed(6);
    }

    function selectLocation(lng, lat) {
        if (!marker) {
            marker = new maplibregl.Marker({
                color: "#e63946",
                draggable: true
            })
            .setLngLat([lng, lat])
            .addTo(map);

            marker.on("dragend", function () {
                var position = marker.getLngLat();
                saveCoordinates(position.lng, position.lat);
            });

        } else {
            marker.setLngLat([lng, lat]);
        }

        saveCoordinates(lng, lat);
    }

    // Click map to place the pin
    map.on("click", function (e) {
        selectLocation(e.lngLat.lng, e.lngLat.lat);
    });

    // Clear selected pin after form reset
    function clearSelection() {
        if (marker) {
            marker.remove();
            marker = null;
        }

        document.getElementById(latId).value = "";
        document.getElementById(lngId).value = "";

        document.getElementById(coordinatesId).textContent =
            "No location selected yet.";
    }

    incidentMaps[type] = {
        map: map,
        clearSelection: clearSelection
    };

    var formId = isEmergency ? "emergencyForm" : "reportForm";
    var form = document.getElementById(formId);

    if (form) {
        form.addEventListener("reset", function () {
            setTimeout(clearSelection, 0);
        });
    }

    setTimeout(function () {
        map.resize();
    }, 300);
}


  
$("#reportForm").addEventListener("submit", function (e) {
    e.preventDefault();

    var f = e.target;
    var err = $("#reportError");
    err.textContent = "";

    if (missing(f, ["category", "barangay", "street", "description"])) {
        err.textContent = "Please fill in the category, location and description.";
        return;
    }

    readPhoto(f.elements.photo.files[0]).then(function (photo) {
        var barangay = f.elements.barangay.value;
        var street = f.elements.street.value.trim();
        var latitude = f.elements.latitude.value;
var longitude = f.elements.longitude.value;

if (!latitude || !longitude) {
    err.textContent = "Please pin the exact emergency location on the map.";
    return;
}

        var id = addReport({
            category: f.elements.category.value,
            barangay: barangay,
            location: barangay + ", " + street,
            description: f.elements.description.value.trim(),
            contact: f.elements.contact ? f.elements.contact.value.trim() : "",
            photo: photo,
            latitude: latitude,
longitude: longitude,
            
        });

        f.reset();
        toast("Report " + id + " submitted");
        location.hash = "#status";
    });
});


  
$("#emergencyForm").addEventListener("submit", function (e) {
    e.preventDefault();

    var f = e.target;
    var err = $("#emergencyError");
    err.textContent = "";

    if (missing(f, ["category", "barangay", "street", "description", "contact"])) {
        err.textContent = "All fields are required so responders can reach you.";
        return;
    }

    readPhoto(f.elements.photo.files[0]).then(function (photo) {
        var barangay = f.elements.barangay.value;
        var street = f.elements.street.value.trim();

        var id = addReport({
            category: f.elements.category.value,
            barangay: barangay,
            location: barangay + ", " + street,
            description: f.elements.description.value.trim(),
            contact: f.elements.contact.value.trim(),
            photo: photo,
            emergency: true,
            latitude: latitude,
longitude: longitude,
        });

        f.reset();
        toast("Emergency alert " + id + " sent");
        location.hash = "#status";
    });
});


  /* ------------------------------------------------------------------
     Notifications (status changes made by the admin)
     ------------------------------------------------------------------ */
  var seenKey = "laspinas_notif_seen_" + username;

  function buildNotifications() {
    var items = [];
    myReports().forEach(function (r) {
      var name = r.emergencyType || r.category;
      items.push({ at: r.createdAt, text: "Your " + (r.emergency ? "emergency alert" : "report") + " on “" + name + "” (" + r.id + ") was submitted.", kind: "info" });
      (r.updates || []).forEach(function (u) {
        var s = statusLabel(u.status);
        var text, kind = "info";
        if (s === "Resolved") { text = "Resolved: your report on “" + name + "” (" + r.id + ") has been resolved."; kind = "ok"; }
        else if (s === "Rejected") { text = "Your report on “" + name + "” (" + r.id + ") was closed by the city."; kind = "bad"; }
        else if (s === "In Progress") { text = "Your report on “" + name + "” (" + r.id + ") is now being handled" + (u.department && u.department !== "Unassigned" ? " by " + u.department : "") + "."; }
        else { text = "Your report on “" + name + "” (" + r.id + ") is back to pending review."; }
        if (u.remark) text += " Note from the city: “" + u.remark + "”";
        items.push({ at: u.at, text: text, kind: kind });
      });
    });
    return items.sort(function (a, b) { return b.at - a.at; });
  }

  function renderNotifications() {
    var items = buildNotifications();
    var seen = readJSON(seenKey, 0);
    var unread = items.filter(function (n) { return n.at > seen; }).length;
    var badge = $("#notifCount");
    badge.textContent = unread > 99 ? "99+" : unread;
    badge.hidden = !unread;
    $("#notifList").innerHTML = items.length
      ? items.slice(0, 30).map(function (n) {
          return '<li class="notif--' + n.kind + (n.at > seen ? " is-new" : "") + '"><div>' + escapeHTML(n.text) +
                 "<small>" + timeAgo(n.at) + "</small></div></li>";
        }).join("")
      : '<li class="notif__empty">No notifications yet.</li>';
  }

  $("#notifBtn").addEventListener("click", function (e) {
    e.stopPropagation();
    var panel = $("#notifPanel");
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      renderNotifications();
      writeJSON(seenKey, Date.now());
      setTimeout(function () { $("#notifCount").hidden = true; }, 0);
    }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#notifPanel")) $("#notifPanel").hidden = true;
  });

  // Live sync: when the admin changes a report in another tab
  window.addEventListener("storage", function (e) {
    var name = location.hash.replace("#", "");
    if (e.key === CONFIG.eventsKey) {
      if (name === "home" || name === "") renderHome();
      if (name === "announcements") renderAnnouncements();
      return;
    }
    if (e.key !== CONFIG.reportsKey) return;
    renderNotifications();
    if (name === "home" || name === "") renderHome();
    if (name === "status") renderStatus();
  });

  /* account */
  function fillAccount() {
    var p = getProfile(), f = $("#accountForm");
    f.elements.name.value = p.name;
    f.elements.username.value = username;
    f.elements.contact.value = p.contact;
    f.elements.barangay.value = p.barangay;
    $("#accountOk").textContent = "";
  }

  $("#accountForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    var name = f.elements.name.value.trim();
    if (!name) { $("#accountOk").textContent = ""; toast("Name can't be empty"); return; }
    writeJSON(CONFIG.profilePrefix + username, {
      name: name,
      contact: f.elements.contact.value.trim(),
      barangay: f.elements.barangay.value.trim()
    });
    renderIdentity();
    $("#accountOk").textContent = "Changes saved.";
  });

  $("#logoutBtn").addEventListener("click", function () {
    try { localStorage.removeItem(CONFIG.sessionKey); } catch (e) {}
    window.location.href = CONFIG.loginUrl;
  });

  $("#avatarBtn").addEventListener("click", function () { location.hash = "#account"; });

  /* ------------------------------------------------------------------
     Router
     ------------------------------------------------------------------ */
  var HERO = {
    home:          { t: 'Your City, <span>Your Home.</span>', s: 'Stay informed. Report concerns. Help improve Las Piñas City.' },
    report:        { t: 'Report an <span>Issue</span>', s: 'Tell us what needs attention. Your report goes to the city for review.' },
    emergency:     { t: 'Emergency <span>Alert</span>', s: 'If someone is in immediate danger, call <a href="tel:911"><strong>911</strong></a> first. Use this form to notify the city as well.' },
    announcements: { t: 'City <span>Announcements</span>', s: 'News, advisories and public notices published by the Las Piñas City Administrator.' },
    status:        { t: 'Report <span>Status</span>', s: 'Track everything you\'ve submitted.' },
    account:       { t: 'My <span>Account</span>', s: 'Keep your details current so the city can reach you.' }
  };
  

  function renderHero(name) {
    var h = HERO[name] || HERO.home;
    $("#heroTitle").innerHTML = h.t;
    $("#heroSub").innerHTML = h.s;
    $("#hero").classList.toggle("hero--compact", name !== "home");
    $("#hero").classList.toggle("hero--danger", name === "emergency");
  }

  var ROUTES = ["home", "report", "emergency", "announcements", "status", "account"];

  function route() {
    var name = location.hash.replace("#", "");
    if (ROUTES.indexOf(name) === -1) name = "home";

    $$(".view").forEach(function (v) { v.hidden = v.dataset.view !== name; });
    $$(".nav a").forEach(function (a) { a.classList.toggle("is-active", a.dataset.route === name); });
    renderHero(name);
    if (name === "report") {
    initIncidentMap("report");
}

if (name === "emergency") {
    initIncidentMap("emergency");
}
    if (name === "home") renderHome();
    if (name === "status") renderStatus();
    if (name === "announcements") renderAnnouncements();
    if (name === "account") fillAccount();
    renderNotifications();

    window.scrollTo(0, 0);
    document.title = (name === "home" ? "My Home" : name.charAt(0).toUpperCase() + name.slice(1)) + " | Las Piñas City";
  }

  window.addEventListener("hashchange", route);
  renderIdentity();
  route();
})();