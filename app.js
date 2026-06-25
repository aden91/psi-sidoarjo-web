document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initialize IndexedDB
  await window.PSIMediaDB.init();

  // 2. Initialize State with LocalStorage persistence
  initState();

  // 3. Initialize Header Clock and Nav Router
  initTime();
  initNavigation();
  initDarkMode();

  // 4. Render all Dynamic Sections based on the loaded State
  renderAllSections();

  // 5. Initialize Interactive Features
  initSobatPanganFeatures();
  initMapFeature();
  initChatbotFeature();
  initVideoFeature();

  // 6. Connect storage change listener for real-time updates from admin.html
  initLocalStorageSyncListener();

  // 7. Load default or stored language translation
  const storedLang = localStorage.getItem("psi_lang") || "id";
  window.changeLanguage(storedLang);
});

// App State Management
let AppState = {
  profil: null,
  visiMisi: null,
  berita: null,
  umkm: null,
  sembakoPrices: null,
  sobatGaya: null,
  sobatKarya: null,
  dpc: null,
  jadwalKegiatan: null,
  videos: null,
  chatbotKnowledge: null
};

function initState() {
  const data = window.PSISidoarjoData;
  if (!data) {
    console.error("Data.js failed to load!");
    return;
  }

  // Load from LocalStorage or initialize with data.js static database
  AppState.profil = getOrSetLocalStorage("psi_profil", data.profil);
  AppState.visiMisi = getOrSetLocalStorage("psi_visiMisi", data.visiMisi);
  AppState.berita = getOrSetLocalStorage("psi_berita", data.berita);
  AppState.umkm = getOrSetLocalStorage("psi_umkm", data.umkm);
  AppState.sembakoPrices = getOrSetLocalStorage("psi_sembakoPrices", data.sembakoPrices);
  AppState.sobatGaya = getOrSetLocalStorage("psi_sobatGaya", data.sobatGaya);
  AppState.sobatKarya = getOrSetLocalStorage("psi_sobatKarya", data.sobatKarya);
  AppState.dpc = getOrSetLocalStorage("psi_dpc", data.dpc);
  // Migrate old DPC data format (percentage coordinate x/y) to new geo coordinates (lat/lng)
  if (AppState.dpc && AppState.dpc.length > 0 && (typeof AppState.dpc[0].lat === "undefined" || typeof AppState.dpc[0].x !== "undefined")) {
    console.log("Migrating old DPC data to geo-coordinates...");
    AppState.dpc = data.dpc;
    localStorage.setItem("psi_dpc", JSON.stringify(data.dpc));
  }
  AppState.jadwalKegiatan = getOrSetLocalStorage("psi_jadwalKegiatan", data.jadwalKegiatan);
  AppState.videos = getOrSetLocalStorage("psi_videos", data.videos);
  AppState.chatbotKnowledge = getOrSetLocalStorage("psi_chatbotKnowledge", data.chatbotKnowledge);
}

function getOrSetLocalStorage(key, defaultVal) {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn(`Failed to parse localStorage key: ${key}, resetting.`, e);
    }
  }
  localStorage.setItem(key, JSON.stringify(defaultVal));
  return defaultVal;
}

function saveState(key, dataObj) {
  AppState[key] = dataObj;
  localStorage.setItem(`psi_${key}`, JSON.stringify(dataObj));
  renderSectionByStateKey(key);
}

// Global Re-render triggers
function renderAllSections() {
  renderProfil();
  renderVisiMisi();
  renderBerita();
  renderUmkm();
  renderSobatGaya();
  renderSobatKarya();
  renderVideos();
  renderSchedule();
}

function renderSectionByStateKey(key) {
  switch (key) {
    case "profil":
      renderProfil();
      break;
    case "berita":
      renderBerita();
      break;
    case "umkm":
      renderUmkm();
      break;
    case "sobatGaya":
      renderSobatGaya();
      break;
    case "sobatKarya":
      renderSobatKarya();
      break;
    case "videos":
      renderVideos();
      break;
    case "jadwalKegiatan":
      renderSchedule();
      break;
    case "dpc":
      initMapFeature();
      break;
    default:
      console.log(`State key ${key} updated, no specific section rendering required.`);
  }
}

// LocalStorage Event Sync (Real-time updates from admin.html)
function initLocalStorageSyncListener() {
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("psi_")) {
      const stateKey = e.key.replace("psi_", "");
      try {
        const newValue = JSON.parse(e.newValue);
        AppState[stateKey] = newValue;
        renderSectionByStateKey(stateKey);
        console.log(`Real-time update received for: ${stateKey}`);
      } catch (err) {
        console.error(`Failed to sync storage update for: ${e.key}`, err);
      }
    }
  });
}

// Helper to resolve IndexedDB local storage links (db://...) to dynamic URLs
async function resolveMediaSrc(mediaUrl, elementOrId, fallback) {
  const el = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
  if (!el) return;

  if (mediaUrl && mediaUrl.startsWith("db://")) {
    const resolvedUrl = await window.PSIMediaDB.getUrl(mediaUrl);
    if (resolvedUrl) {
      el.src = resolvedUrl;
      return;
    }
  }
  el.src = fallback || "";
}

// -------------------------------------------------------------
// CORE INTERFACE FEATURES
// -------------------------------------------------------------

// Time Ticker
function initTime() {
  const timeEl = document.getElementById("current-time");
  const dateEl = document.getElementById("current-date");

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  function update() {
    const now = new Date();
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    
    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;
    
    const dayName = days[now.getDay()];
    const dateNum = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    
    if (dateEl) dateEl.textContent = `${dayName}, ${dateNum} ${monthName} ${year}`;
  }
  
  update();
  setInterval(update, 60000);
}

// SPA Routing
function initNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");
  const sections = document.querySelectorAll(".content-section");
  const pageTitle = document.getElementById("page-title");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const sidebar = document.getElementById("sidebar");

  menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      menuItems.forEach(mi => mi.classList.remove("active"));
      sections.forEach(sec => sec.classList.remove("active"));

      item.classList.add("active");
      const targetId = item.getAttribute("data-target");
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add("active");
        
        const transSpan = item.querySelector("span[data-translate]");
        if (transSpan) {
          pageTitle.textContent = transSpan.textContent.trim();
        } else {
          pageTitle.textContent = item.textContent.trim();
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (window.innerWidth <= 768) {
        sidebar.classList.remove("active");
      }
    });
  });

  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
      if (!sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    }
  });
}

window.navigateToSection = function(targetId) {
  const menuItem = document.querySelector(`.menu-item[data-target="${targetId}"]`);
  if (menuItem) {
    menuItem.click();
  }
};

// -------------------------------------------------------------
// SECTIONS RENDERING LOGIC
// -------------------------------------------------------------

// 2. Profil
function renderProfil() {
  const sejarahEl = document.getElementById("sejarah-content");
  const pengurusContainer = document.getElementById("pengurus-container");

  if (sejarahEl && AppState.profil) sejarahEl.textContent = AppState.profil.sejarah;

  if (pengurusContainer && AppState.profil) {
    pengurusContainer.innerHTML = AppState.profil.struktur.map((member, idx) => `
      <div class="team-card">
        <img id="usr-pengurus-img-${idx}" src="" alt="${member.nama}">
        <h4>${member.nama}</h4>
        <p>${member.jabatan}</p>
      </div>
    `).join("");

    // Resolve Images
    AppState.profil.struktur.forEach((member, idx) => {
      resolveMediaSrc(member.foto, `usr-pengurus-img-${idx}`, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200');
    });
  }
}

// 3. Visi Misi
function renderVisiMisi() {
  const visiContent = document.getElementById("visi-content");
  const misiContainer = document.getElementById("misi-container");

  if (visiContent && AppState.visiMisi) visiContent.textContent = AppState.visiMisi.visi;

  if (misiContainer && AppState.visiMisi) {
    misiContainer.innerHTML = AppState.visiMisi.misi.map((misiText, index) => `
      <div class="misi-item">
        <div class="misi-number">${index + 1}</div>
        <div class="misi-content">
          <h4>Misi #${index + 1}</h4>
          <p>${misiText}</p>
        </div>
      </div>
    `).join("");
  }
}

// 4. Berita & Comments Engine
function renderBerita(filteredList) {
  const homeContainer = document.getElementById("berita-utama-container");
  const newsContainer = document.getElementById("berita-lengkap-container");

  if (!AppState.berita) return;

  const listToRender = filteredList || AppState.berita;

  if (homeContainer && !filteredList) {
    homeContainer.innerHTML = AppState.berita.slice(0, 3).map((news, idx) => {
      const views = localStorage.getItem(`psi_views_${news.id}`) || 0;
      return `
        <div class="news-card">
          <div class="news-img">
            <img id="usr-news-home-img-${idx}" src="" alt="${news.judul}">
          </div>
          <div class="news-body">
            <div class="news-meta"><i class="fa-regular fa-clock"></i> ${news.tanggal} | <i class="fa-regular fa-eye"></i> ${views} Dilihat</div>
            <h3>${news.judul}</h3>
            <p>${news.ringkasan}</p>
            <div class="news-footer">
              <button class="btn-secondary" onclick="openNewsModal(${news.id})" style="padding: 8px 16px; font-size: 0.8rem;">
                Baca Selengkapnya <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    AppState.berita.slice(0, 3).forEach((news, idx) => {
      resolveMediaSrc(news.gambar, `usr-news-home-img-${idx}`, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600');
    });
  }

  if (newsContainer) {
    if (listToRender.length === 0) {
      newsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px 0;">Tidak ada berita yang cocok dengan kriteria. <a href="#" onclick="event.preventDefault(); renderBerita();" style="color:var(--primary-red); font-weight:700;">Tampilkan Semua Berita</a></div>`;
      return;
    }
    newsContainer.innerHTML = listToRender.map((news, idx) => {
      const views = localStorage.getItem(`psi_views_${news.id}`) || 0;
      return `
        <div class="news-card">
          <div class="news-img">
            <img id="usr-news-all-img-${idx}" src="" alt="${news.judul}">
          </div>
          <div class="news-body">
            <div class="news-meta"><i class="fa-regular fa-clock"></i> ${news.tanggal} | <i class="fa-regular fa-eye"></i> ${views} Dilihat</div>
            <h3>${news.judul}</h3>
            <p>${news.ringkasan}</p>
            <div class="news-footer">
              <button class="btn-secondary" onclick="openNewsModal(${news.id})" style="padding: 8px 16px; font-size: 0.8rem;">
                Baca Selengkapnya <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    listToRender.forEach((news, idx) => {
      resolveMediaSrc(news.gambar, `usr-news-all-img-${idx}`, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600');
    });
  }
}

let activeNewsId = null;
window.openNewsModal = function(newsId) {
  const news = AppState.berita.find(n => n.id === newsId);
  if (!news) return;

  activeNewsId = newsId;

  // Increment views count
  const viewsKey = `psi_views_${newsId}`;
  let currentViews = parseInt(localStorage.getItem(viewsKey) || "0");
  currentViews++;
  localStorage.setItem(viewsKey, currentViews);

  const modal = document.getElementById("news-detail-modal");
  const modalTitle = document.getElementById("news-modal-title");
  const modalImg = document.getElementById("news-modal-img");
  const modalDate = document.getElementById("news-modal-date");
  const modalContent = document.getElementById("news-modal-content");
  const modalViews = document.getElementById("news-modal-views");
  const modalHashtags = document.getElementById("news-modal-hashtags");

  const seoKeyphrase = document.getElementById("news-modal-seo-keyphrase");
  const seoMetadesc = document.getElementById("news-modal-seo-metadesc");
  const seoSharelink = document.getElementById("news-modal-seo-sharelink");

  if (modal) {
    modalTitle.textContent = news.judul;
    resolveMediaSrc(news.gambar, modalImg, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600');
    modalDate.innerHTML = `<i class="fa-regular fa-clock"></i> ${news.tanggal} | DPD PSI Sidoarjo`;
    modalContent.textContent = news.konten;
    
    if (modalViews) {
      modalViews.innerHTML = `<i class="fa-regular fa-eye"></i> ${currentViews} Dilihat`;
    }

    // Render Hashtags
    if (modalHashtags) {
      if (news.hashtags) {
        const tags = news.hashtags.split(",").map(t => t.trim()).filter(t => t.length > 0);
        modalHashtags.innerHTML = tags.map(tag => `<a class="hashtag-chip" onclick="searchByHashtag('${tag}')">${tag}</a>`).join("");
      } else {
        modalHashtags.innerHTML = "";
      }
    }

    // Render SEO Metadata
    if (seoKeyphrase) seoKeyphrase.textContent = news.keyphrase || "-";
    if (seoMetadesc) seoMetadesc.textContent = news.metaDesc || "-";
    if (seoSharelink) {
      const host = window.location.host || "localhost:3000";
      const protocol = window.location.protocol || "http:";
      const shareUrl = `${protocol}//${host}/berita/${news.slug || 'detail-' + news.id}`;
      seoSharelink.textContent = shareUrl;
    }

    // Dynamic Document SEO Update
    document.title = `${news.judul} | DPD PSI Sidoarjo`;
    let metaDescEl = document.querySelector('meta[name="description"]');
    if (!metaDescEl) {
      metaDescEl = document.createElement('meta');
      metaDescEl.name = 'description';
      document.head.appendChild(metaDescEl);
    }
    metaDescEl.content = news.metaDesc || news.ringkasan || "";

    // Load comments
    renderNewsComments(newsId);
    
    modal.classList.add("active");
  }
};

window.closeNewsModal = function() {
  const modal = document.getElementById("news-detail-modal");
  if (modal) modal.classList.remove("active");
  activeNewsId = null;

  // Restore defaults
  document.title = "DPD PSI Sidoarjo - Profesional, Modern & Elegan";
  const metaDescEl = document.querySelector('meta[name="description"]');
  if (metaDescEl) {
    metaDescEl.content = "DPD Partai Solidaritas Indonesia Sidoarjo - Profesional, Modern & Elegan";
  }

  // Re-render news to update views count on card lists
  renderBerita();
};

window.searchByHashtag = function(tag) {
  // Navigate to Berita section
  window.navigateToSection('berita');
  
  // Filter news articles
  const cleanTag = tag.replace('#', '').trim().toLowerCase();
  const filtered = AppState.berita.filter(news => {
    if (!news.hashtags) return false;
    return news.hashtags.toLowerCase().split(',').some(t => t.replace('#', '').trim() === cleanTag);
  });
  
  renderBerita(filtered);
  closeNewsModal();
};

window.copyShareLink = function() {
  const linkText = document.getElementById("news-modal-seo-sharelink");
  if (!linkText) return;

  navigator.clipboard.writeText(linkText.textContent).then(() => {
    alert("Tautan SEO (Slug) berhasil disalin ke clipboard!");
  }).catch(err => {
    console.error("Gagal menyalin tautan: ", err);
  });
};

// News Comments Persistence Handlers
function renderNewsComments(newsId) {
  const commentsList = document.getElementById("news-comments-list");
  if (!commentsList) return;

  const key = `psi_comments_${newsId}`;
  const comments = getOrSetLocalStorage(key, []);

  if (comments.length === 0) {
    commentsList.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 10px 0;">Belum ada komentar. Jadilah yang pertama memberikan apresiasi!</p>`;
    return;
  }

  commentsList.innerHTML = comments.map(c => `
    <div class="comment-bubble">
      <div class="comment-meta">
        <span class="comment-author">${c.author}</span>
        <span class="comment-time">${c.time}</span>
      </div>
      <p class="comment-text">${c.text}</p>
    </div>
  `).join("");
  commentsList.scrollTop = commentsList.scrollHeight;
}

window.submitNewsComment = function(event) {
  event.preventDefault();
  if (!activeNewsId) return;

  const authorInput = document.getElementById("comment-author-name");
  const textInput = document.getElementById("comment-author-text");

  const author = authorInput.value.trim();
  const text = textInput.value.trim();

  if (author === "" || text === "") return;

  const key = `psi_comments_${activeNewsId}`;
  const comments = getOrSetLocalStorage(key, []);

  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} | ${now.getDate()}/${now.getMonth()+1}`;

  const newComment = {
    author: author,
    text: text,
    time: timestamp
  };

  comments.push(newComment);
  localStorage.setItem(key, JSON.stringify(comments));

  // Clear inputs
  textInput.value = "";
  
  // Re-render
  renderNewsComments(activeNewsId);
};

// 5. Video Gallery (Dynamic Dual Players: YouTube vs IndexedDB local video)
function initVideoFeature() {
  const filterTabs = document.querySelectorAll("#video-filter-tabs .filter-btn");
  filterTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      filterTabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const category = btn.getAttribute("data-category");
      if (category === "Semua") {
        renderVideosList(AppState.videos);
      } else {
        const filtered = AppState.videos.filter(v => v.kategori === category);
        renderVideosList(filtered);
      }
    });
  });
}

function renderVideos() {
  renderVideosList(AppState.videos);
}

function renderVideosList(list) {
  const container = document.getElementById("video-gallery-container");
  if (!container || !list) return;

  container.innerHTML = list.map((video, idx) => {
    const isLocalVideo = video.embedUrl && video.embedUrl.startsWith("db://");
    const playerId = `usr-video-player-${idx}`;

    // Render video container dynamically
    let playerHtml = "";
    if (isLocalVideo) {
      playerHtml = `<video id="${playerId}" controls style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"></video>`;
    } else {
      playerHtml = `<iframe src="${video.embedUrl}" title="${video.judul}" allowfullscreen></iframe>`;
    }

    return `
      <div class="video-card">
        <div class="video-player-container">
          ${playerHtml}
        </div>
        <div class="video-body">
          <span class="video-tag">${video.kategori}</span>
          <h3 class="video-title">${video.judul}</h3>
          <p class="video-desc">${video.deskripsi}</p>
        </div>
      </div>
    `;
  }).join("");

  // Resolve IndexedDB local video files asynchronously
  list.forEach((video, idx) => {
    const isLocalVideo = video.embedUrl && video.embedUrl.startsWith("db://");
    if (isLocalVideo) {
      resolveMediaSrc(video.embedUrl, `usr-video-player-${idx}`, "");
    }
  });
}

// 6. UMKM Showcase
function renderUmkm() {
  if (AppState.umkm) renderUmkmList(AppState.umkm);
}

function renderUmkmList(list) {
  const container = document.getElementById("umkm-container");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px 0;">Belum ada produk untuk kategori ini.</div>`;
    return;
  }

  container.innerHTML = list.map((item, idx) => `
    <div class="umkm-card">
      <img id="usr-umkm-img-${idx}" src="" alt="${item.nama}">
      <div class="umkm-info">
        <span class="umkm-tag">${item.kategori}</span>
        <h3 class="umkm-name">${item.nama}</h3>
        <p class="umkm-desc">${item.deskripsi}</p>
        <div class="umkm-meta-row">
          <span class="umkm-price">${item.harga}</span>
          <span class="umkm-loc"><i class="fa-solid fa-location-dot"></i> ${item.alamat}</span>
        </div>
        <a href="https://wa.me/${item.wa}?text=Halo%20saya%20tertarik%20dengan%20produk%20UMKM%20Anda%20di%20Web%20PSI%20Sidoarjo:%20${encodeURIComponent(item.nama)}" target="_blank" class="btn-wa">
          <i class="fa-brands fa-whatsapp"></i> Hubungi Penjual
        </a>
      </div>
    </div>
  `).join("");

  // Resolve Images
  list.forEach((item, idx) => {
    resolveMediaSrc(item.gambar, `usr-umkm-img-${idx}`, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400');
  });
}

function initUmkmFilters() {
  const filterTabs = document.querySelectorAll("#umkm-filter-tabs .filter-btn");
  filterTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      filterTabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const category = btn.getAttribute("data-category");
      if (category === "Semua") {
        renderUmkmList(AppState.umkm);
      } else {
        const filtered = AppState.umkm.filter(item => item.kategori === category);
        renderUmkmList(filtered);
      }
    });
  });
}

window.showUmkmRegisterModal = function() {
  const modal = document.getElementById("umkm-register-modal");
  if (modal) modal.classList.add("active");
};

window.closeUmkmModal = function() {
  const modal = document.getElementById("umkm-register-modal");
  if (modal) modal.classList.remove("active");
};

window.handleUmkmRegister = function(event) {
  event.preventDefault();
  const name = document.getElementById("reg-umkm-name").value;
  const category = document.getElementById("reg-umkm-category").value;
  const desc = document.getElementById("reg-umkm-desc").value;
  const price = document.getElementById("reg-umkm-price").value;
  const address = document.getElementById("reg-umkm-address").value;
  const phone = document.getElementById("reg-umkm-phone").value.replace(/\D/g,'');

  const newUmkm = {
    id: AppState.umkm.length + 1,
    nama: name,
    kategori: category,
    deskripsi: desc,
    harga: price,
    alamat: address,
    gambar: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=400",
    wa: phone.startsWith("0") ? "62" + phone.slice(1) : phone
  };

  AppState.umkm.unshift(newUmkm);
  saveState("umkm", AppState.umkm);

  document.querySelector('#umkm-filter-tabs .filter-btn[data-category="Semua"]').click();
  document.getElementById("umkm-reg-form").reset();
  closeUmkmModal();
  alert("Selamat! Produk UMKM Anda telah berhasil terdaftar secara lokal dan masuk katalog.");
};

// 7. Sobat Pangan Features
let sembakoCart = [];
function initSobatPanganFeatures() {
  const tableBody = document.getElementById("sembako-table-body");
  const calcSelect = document.getElementById("calc-select-food");
  const btnAddItem = document.getElementById("calc-add-item-btn");

  if (tableBody && AppState.sembakoPrices) {
    tableBody.innerHTML = AppState.sembakoPrices.map(item => `
      <tr>
        <td style="font-weight:600;">${item.nama}</td>
        <td class="umkm-price">Rp ${item.harga ? item.harga.toLocaleString("id-ID") : "-"}</td>
        <td><span class="pangan-status ${item.status}">${item.status}</span></td>
      </tr>
    `).join("");
  }

  if (calcSelect && AppState.sembakoPrices) {
    calcSelect.innerHTML = AppState.sembakoPrices.filter(i => i.harga).map((item, idx) => `
      <option value="${idx}">${item.nama} (Rp ${item.harga.toLocaleString("id-ID")}/kg)</option>
    `).join("");
  }

  if (btnAddItem) {
    btnAddItem.addEventListener("click", () => {
      const selectedIndex = calcSelect.value;
      const qty = parseInt(document.getElementById("calc-qty-food").value) || 1;
      
      const pricesFiltered = AppState.sembakoPrices.filter(i => i.harga);
      const itemData = pricesFiltered[selectedIndex];
      if (!itemData) return;

      const existing = sembakoCart.find(item => item.nama === itemData.nama);
      if (existing) {
        existing.qty += qty;
      } else {
        sembakoCart.push({
          nama: itemData.nama,
          harga: itemData.harga,
          qty: qty
        });
      }

      renderCartList();
    });
  }
  
  initUmkmFilters();
}

function renderCartList() {
  const container = document.getElementById("calc-cart-list");
  const totalAmountEl = document.getElementById("calc-total-amount");
  if (!container) return;

  if (sembakoCart.length === 0) {
    container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-secondary); text-align:center;">Keranjang belanja masih kosong.</p>`;
    totalAmountEl.textContent = "Rp 0";
    return;
  }

  let total = 0;
  container.innerHTML = sembakoCart.map((item, idx) => {
    const subtotal = item.harga * item.qty;
    total += subtotal;
    return `
      <div class="calc-list-item">
        <div>
          <strong>${item.nama}</strong> <br>
          <span style="font-size:0.8rem; color:var(--text-muted);">${item.qty} x Rp ${item.harga.toLocaleString("id-ID")}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="umkm-price">Rp ${subtotal.toLocaleString("id-ID")}</span>
          <button onclick="removeFromCart(${idx})"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </div>
    `;
  }).join("");

  totalAmountEl.textContent = `Rp ${total.toLocaleString("id-ID")}`;
}

window.removeFromCart = function(idx) {
  sembakoCart.splice(idx, 1);
  renderCartList();
};

// 8. Sobat Gaya
function renderSobatGaya() {
  const container = document.getElementById("sobat-gaya-container");
  if (!container || !AppState.sobatGaya) return;

  container.innerHTML = AppState.sobatGaya.map((item, idx) => `
    <div class="gaya-card">
      <img id="usr-gaya-img-${idx}" src="" alt="${item.nama}">
      <div class="gaya-info">
        <h3 class="gaya-name">${item.nama}</h3>
        <p class="gaya-desc">${item.deskripsi}</p>
        <div class="gaya-footer">
          <span class="gaya-price">${item.harga}</span>
          <a href="https://wa.me/${item.wa}?text=Halo%20saya%20mau%20order%20Merchandise%20PSI%20Sidoarjo:%20${encodeURIComponent(item.nama)}" target="_blank" class="btn-primary" style="padding: 8px 16px; font-size: 0.8rem;">
            <i class="fa-solid fa-basket-shopping"></i> Order Baju
          </a>
        </div>
      </div>
    </div>
  `).join("");

  // Resolve Images
  AppState.sobatGaya.forEach((item, idx) => {
    resolveMediaSrc(item.gambar, `usr-gaya-img-${idx}`, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400');
  });
}

// 9. Sobat Hukum Application Form Submissions
window.handleLegalFormSubmit = function(event) {
  event.preventDefault();
  const name = document.getElementById("legal-name").value;
  const phone = document.getElementById("legal-phone").value;
  const service = document.getElementById("legal-service").value;
  const desc = document.getElementById("legal-desc").value;

  const waMessage = `Halo LBH DPD PSI Sidoarjo, saya ingin mengajukan permohonan layanan hukum:\n\n*Nama:* ${name}\n*No. HP:* ${phone}\n*Layanan:* ${service}\n*Keterangan:* ${desc}`;
  
  alert("Permohonan Anda berhasil diajukan! Anda akan langsung diarahkan ke nomor advokat koordinasi hukum DPD PSI Sidoarjo.");
  window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(waMessage)}`, "_blank");
  document.getElementById("legal-consultation-form").reset();
};

// 10. Sobat Karya Services
function renderSobatKarya() {
  renderKaryaList(AppState.sobatKarya);
}

function renderKaryaList(list) {
  const container = document.getElementById("sobat-karya-container");
  if (!container || !list) return;

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px 0;">Belum ada jasa untuk kategori ini.</div>`;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="karya-card">
      <div>
        <div class="karya-header">
          <span class="karya-badge">${item.kategori}</span>
          <span class="karya-provider">${item.penyedia}</span>
        </div>
        <h3 class="karya-title">${item.nama}</h3>
        <p class="karya-desc">${item.deskripsi}</p>
      </div>
      <div class="karya-footer">
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Tarif Layanan</span>
          <span class="karya-tarif">${item.tarif}</span>
        </div>
        <a href="https://wa.me/${item.kontak}?text=Halo%20saya%20ingin%20memesan%20jasa%20Anda%20lewat%20katalog%20Sobat%20Karya%20PSI%20Sidoarjo:%20${encodeURIComponent(item.nama)}" target="_blank" class="btn-wa">
          <i class="fa-brands fa-whatsapp"></i> Pesan Jasa
        </a>
      </div>
    </div>
  `).join("");
}

function initSobatKaryaFilters() {
  const filterTabs = document.querySelectorAll("#karya-filter-tabs .filter-btn");
  filterTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      filterTabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const category = btn.getAttribute("data-category");
      if (category === "Semua") {
        renderKaryaList(AppState.sobatKarya);
      } else {
        const filtered = AppState.sobatKarya.filter(item => item.kategori === category);
        renderKaryaList(filtered);
      }
    });
  });
}

window.showKaryaRegisterModal = function() {
  const modal = document.getElementById("karya-register-modal");
  if (modal) modal.classList.add("active");
};

window.closeKaryaModal = function() {
  const modal = document.getElementById("karya-register-modal");
  if (modal) modal.classList.remove("active");
};

window.handleKaryaRegister = function(event) {
  event.preventDefault();
  const name = document.getElementById("reg-karya-name").value;
  const category = document.getElementById("reg-karya-category").value;
  const provider = document.getElementById("reg-karya-provider").value;
  const desc = document.getElementById("reg-karya-desc").value;
  const price = document.getElementById("reg-karya-price").value;
  const phone = document.getElementById("reg-karya-phone").value.replace(/\D/g,'');

  const newKarya = {
    id: AppState.sobatKarya.length + 1,
    nama: name,
    kategori: category,
    penyedia: provider + " (Kader Sidoarjo)",
    deskripsi: desc,
    tarif: price,
    kontak: phone.startsWith("0") ? "62" + phone.slice(1) : phone
  };

  AppState.sobatKarya.unshift(newKarya);
  saveState("sobatKarya", AppState.sobatKarya);

  document.querySelector('#karya-filter-tabs .filter-btn[data-category="Semua"]').click();
  document.getElementById("karya-reg-form").reset();
  closeKaryaModal();
  alert("Jasa Anda berhasil didaftarkan secara lokal di direktori Sobat Karya PSI!");
};

// 11. Interactive Map (Glowing Gajah Pins)
let mainMap = null;
let mainMapMarkers = [];

function initMapFeature() {
  const visualMap = document.getElementById("visual-map-box");
  if (!visualMap || !AppState.dpc) return;

  // Initialize the Leaflet map if it hasn't been created yet
  if (!mainMap) {
    mainMap = L.map('visual-map-box', {
      scrollWheelZoom: false
    }).setView([-7.4726, 112.7138], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mainMap);

    // Because Leaflet might be loaded inside a tab that's not active initially,
    // we need to invalidate size when the DPC menu item is clicked.
    const mapMenuItem = document.querySelector('.menu-item[data-target="peta-dpc"]');
    if (mapMenuItem) {
      mapMenuItem.addEventListener('click', () => {
        setTimeout(() => {
          if (mainMap) {
            mainMap.invalidateSize();
          }
        }, 100);
      });
    }
  }

  // Clear existing markers from the map
  mainMapMarkers.forEach(marker => mainMap.removeLayer(marker));
  mainMapMarkers = [];

  // Add DPC markers
  AppState.dpc.forEach(dpc => {
    if (!dpc.lat || !dpc.lng) return;

    // Create standard glowing PSI logo marker using L.divIcon
    const customIcon = L.divIcon({
      className: 'map-point-leaflet-marker',
      html: `
        <div class="map-point" id="marker-${dpc.id}">
          <img src="assets/logo_gajah.png" alt="Gajah Pin" class="map-pin-icon">
          <div class="map-point-label">${dpc.kecamatan}</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([dpc.lat, dpc.lng], { icon: customIcon }).addTo(mainMap);
    
    // Bind click event to trigger selectDpc
    marker.on('click', () => {
      window.selectDpc(dpc.id);
    });

    mainMapMarkers.push(marker);
  });
}

window.selectDpc = function(dpcId) {
  const dpc = AppState.dpc.find(d => d.id === dpcId);
  if (!dpc) return;

  document.querySelectorAll(".map-point").forEach(pt => pt.classList.remove("active"));
  const marker = document.getElementById(`marker-${dpcId}`);
  if (marker) marker.classList.add("active");

  // Center map on the selected DPC location
  if (mainMap && dpc.lat && dpc.lng) {
    mainMap.setView([dpc.lat, dpc.lng], 13);
  }

  const panel = document.getElementById("dpc-info-panel");
  if (panel) {
    panel.innerHTML = `
      <div class="dpc-detail-card" style="animation: fadeIn 0.3s ease;">
        <h3>DPC PSI Kecamatan ${dpc.kecamatan}</h3>
        <div class="dpc-row">
          <label>Nama Ketua DPC</label>
          <p>${dpc.ketua}</p>
        </div>
        <div class="dpc-row">
          <label>Kantor / Sekretariat DPC</label>
          <p>${dpc.alamat}</p>
        </div>
        <div class="dpc-row" style="margin-bottom: 24px;">
          <label>Kontak WhatsApp</label>
          <p>+${dpc.telp}</p>
        </div>
        <div style="display:flex; gap:12px;">
          <a href="https://wa.me/${dpc.telp}?text=Halo%20Ketua%20DPC%20PSI%20${dpc.kecamatan},%20saya%20ingin%20bertanya..." target="_blank" class="btn-wa" style="flex-grow:1;">
            <i class="fa-brands fa-whatsapp"></i> Hubungi WhatsApp
          </a>
          <button class="btn-secondary" onclick="resetMapPanel()" style="padding:10px 14px;"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    `;
  }
};

window.resetMapPanel = function() {
  document.querySelectorAll(".map-point").forEach(pt => pt.classList.remove("active"));
  
  // Center map back to Sidoarjo Kota
  if (mainMap) {
    mainMap.setView([-7.4726, 112.7138], 11);
  }

  const panel = document.getElementById("dpc-info-panel");
  if (panel) {
    panel.innerHTML = `
      <div class="map-info-placeholder">
        <i class="fa-solid fa-map-location-dot"></i>
        <h3>Informasi DPC Kecamatan</h3>
        <p>Pilih salah satu DPC Kecamatan pada peta untuk memunculkan nama ketua pengurus, nomor kontak WhatsApp, dan alamat kantor DPC.</p>
      </div>
    `;
  }
};

// 12. Jadwal Kegiatan
function renderSchedule() {
  const container = document.getElementById("jadwal-container");
  if (!container || !AppState.jadwalKegiatan) return;

  container.innerHTML = AppState.jadwalKegiatan.map(sched => `
    <div class="schedule-card">
      <div class="schedule-date-box">
        <i class="fa-regular fa-calendar-check"></i>
        <div class="schedule-date">${sched.tanggal}</div>
        <div class="schedule-time">${sched.jam}</div>
      </div>
      <div class="schedule-info">
        <h3>${sched.nama}</h3>
        <div class="schedule-loc"><i class="fa-solid fa-location-dot"></i> ${sched.lokasi}</div>
      </div>
    </div>
  `).join("");
}

// 13. AI Tanya Jawab Chatbot Widget Engine
let chatbotOpened = false;
let chatbotInitialized = false;

function initChatbotFeature() {
  // Bind actions
}

window.toggleChatbot = function() {
  const windowEl = document.getElementById("chatbot-window");
  if (!windowEl) return;

  chatbotOpened = !chatbotOpened;
  if (chatbotOpened) {
    windowEl.classList.add("active");
    if (!chatbotInitialized) {
      appendBotMessage("Halo Bro dan Sist! Saya asisten AI DPD PSI (Partai Super Tbk) Sidoarjo. Ada yang bisa saya bantu hari ini?");
      chatbotInitialized = true;
    }
  } else {
    windowEl.classList.remove("active");
  }
};

function appendBotMessage(text) {
  const container = document.getElementById("chatbot-messages-container");
  if (!container) return;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble bot";
  bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function appendUserMessage(text) {
  const container = document.getElementById("chatbot-messages-container");
  if (!container) return;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble user";
  bubble.textContent = text;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

window.handleChatbotKeyPress = function(event) {
  if (event.key === "Enter") {
    submitChatbotMessage();
  }
};

window.sendQuickReply = function(chipText) {
  appendUserMessage(chipText);
  processBotAnswer(chipText);
};

window.submitChatbotMessage = function() {
  const input = document.getElementById("chatbot-text-input");
  if (!input) return;

  const text = input.value.trim();
  if (text === "") return;

  appendUserMessage(text);
  input.value = "";
  processBotAnswer(text);
};

function processBotAnswer(userQuery) {
  const container = document.getElementById("chatbot-messages-container");
  if (!container) return;

  const typingBubble = document.createElement("div");
  typingBubble.className = "chat-bubble bot typing-indicator";
  typingBubble.textContent = "Ketik...";
  container.appendChild(typingBubble);
  container.scrollTop = container.scrollHeight;

  const cleanQuery = userQuery.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
  let bestResponse = null;

  for (let info of AppState.chatbotKnowledge) {
    const hasKeyword = info.keywords.some(kw => cleanQuery.includes(kw));
    if (hasKeyword) {
      bestResponse = info.response;
      break;
    }
  }

  if (!bestResponse) {
    bestResponse = "Maaf Bro/Sist, saya belum memahami pertanyaan Anda. Coba tanyakan seputar 'daftar anggota', 'visi misi', 'harga sembako', 'bantuan hukum', 'showcase umkm', 'jasa sobat karya', atau 'galeri video'!";
  }

  setTimeout(() => {
    if (typingBubble.parentNode) {
      typingBubble.parentNode.removeChild(typingBubble);
    }
    appendBotMessage(bestResponse);
  }, 750);
}

// Global exports
window.showUmkmRegisterModal = showUmkmRegisterModal;
window.closeUmkmModal = closeUmkmModal;
window.handleUmkmRegister = handleUmkmRegister;
window.closeNewsModal = closeNewsModal;
window.initSobatKaryaFilters = initSobatKaryaFilters;

// 14. MULTILINGUAL DICTIONARY & HANDLERS (Revision 8)
const UI_TRANSLATIONS = {
  id: {
    menu_home: "Beranda",
    menu_profile: "Profil DPD",
    menu_visi: "Visi & Misi",
    menu_news: "Berita Kegiatan",
    menu_video: "Galeri Video",
    menu_umkm: "UMKM Sidoarjo",
    menu_pangan: "Sobat Pangan",
    menu_gaya: "Sobat Gaya",
    menu_hukum: "Sobat Hukum",
    menu_karya: "Sobat Karya",
    menu_map: "Peta DPC",
    menu_schedule: "Jadwal Kegiatan",
    hero_tag: "DPD PSI Kabupaten Sidoarjo",
    hero_title: "Ayo Rek! Bareng-Bareng Bangun Sidoarjo Lebih Maju & Transparan",
    hero_desc: "Wadah politik alternatif anak muda, perempuan, dan seluruh warga Sidoarjo yang anti-korupsi dan menjunjung tinggi toleransi.",
    hero_btn_umkm: "Jelajahi UMKM Sidoarjo",
    hero_btn_hukum: "Konsultasi Hukum Gratis",
    stat_label_dpc: "DPC Kecamatan",
    stat_label_umkm: "UMKM Binaan",
    stat_label_kegiatan: "Kegiatan Bulan Ini",
    stat_label_kader: "Sobat PSI Sidoarjo",
    section_title_berita_utama: "Berita Utama",
    section_desc_berita_utama: "Kegiatan dan aksi nyata PSI Sidoarjo di tengah masyarakat.",
    section_title_sejarah: "Sejarah Singkat DPD",
    section_desc_sejarah: "Mengenal perjuangan PSI di Kabupaten Sidoarjo.",
    section_title_pengurus: "Struktur Kepengurusan DPD",
    section_desc_pengurus: "Bro dan Sist pengurus DPD PSI Kabupaten Sidoarjo.",
    visi_title: "Visi Perjuangan",
    section_title_misi: "Misi Kami",
    section_desc_misi: "Arah perjuangan nyata Partai Solidaritas Indonesia.",
    section_title_berita: "Kabar Solidaritas",
    section_desc_berita: "Berita lengkap aksi nyata PSI Sidoarjo.",
    section_title_video: "Rekap Video Kegiatan",
    section_desc_video: "Dokumentasi aksi sosial dan konsolidasi DPD serta DPC PSI se-Sidoarjo.",
    filter_all: "Semua",
    filter_video_dpd: "DPD Kabupaten",
    filter_video_dpc: "DPC Kecamatan",
    section_title_umkm: "Katalog UMKM Sidoarjo",
    section_desc_umkm: "Mendukung ekonomi kreatif lokal di Sidoarjo.",
    btn_register_umkm: "Daftarkan UMKM Anda",
    filter_umkm_food: "Kuliner & Makanan",
    filter_umkm_fashion: "Fashion & Pakaian",
    filter_umkm_craft: "Kerajinan Tangan",
    section_title_sembako: "Pantau Harga Sembako Sidoarjo",
    section_desc_sembako: "Update harga komoditas pangan pokok rata-rata di pasar Sidoarjo hari ini.",
    table_header_commodity: "Komoditas Pangan",
    table_header_price: "Harga Eceran (Rp)",
    table_header_change: "Perubahan",
    section_title_calc: "Kalkulator Belanja Pintar",
    section_desc_calc: "Hitung estimasi pengeluaran bulanan sembako keluarga Anda.",
    calc_label_select: "Pilih Bahan Pokok",
    calc_btn_add: "Tambah ke Keranjang",
    calc_result_title: "Total Estimasi Belanja",
    calc_note: "*Harga di atas adalah estimasi rata-rata pasar rakyat Sidoarjo.",
    section_title_gaya: "Gaya Solidaritas",
    section_desc_gaya: "Pilihan Baju, Jaket, dan Fashion Keren Resmi PSI Sidoarjo.",
    section_title_hukum_form: "Pengajuan Layanan Hukum",
    section_desc_hukum_form: "Konsultasi Hukum Gratis, Pendampingan Hukum & Legalitas UMKM Sidoarjo.",
    form_label_name: "Nama Lengkap",
    form_placeholder_name: "Masukkan nama lengkap Anda",
    form_label_phone: "No. WhatsApp",
    form_placeholder_phone: "Contoh: 081234567890",
    form_label_service: "Jenis Layanan",
    opt_service_consult: "Konsultasi Hukum Gratis",
    opt_service_assist: "Pendampingan Hukum Perkara",
    opt_service_umkm: "Pengurusan Legalitas UMKM (NIB/Halal)",
    form_label_desc: "Deskripsi Kasus / Kebutuhan",
    form_placeholder_desc: "Jelaskan secara singkat permasalahan hukum atau kebutuhan izin legalitas UMKM Anda...",
    form_btn_submit_hukum: "Ajukan Bantuan Hukum",
    section_title_hukum_steps: "Alur Pendampingan Hukum",
    section_desc_hukum_steps: "Bagaimana LBH DPD PSI Sidoarjo mengawal permohonan Anda.",
    step1_title: "Pemberkasan Masuk",
    step1_desc: "Form konsultasi dikirim oleh warga Sidoarjo melalui website.",
    step2_title: "Analisa Hukum oleh Tim LBH",
    step2_desc: "Kasus dianalisis secara objektif oleh Advokat & Kader Hukum PSI.",
    step3_title: "Tindak Lanjut & Pendampingan",
    step3_desc: "Warga dihubungi via WhatsApp untuk penyusunan berkas & pendampingan gratis.",
    section_title_karya: "Jasa Sobat Karya",
    section_desc_karya: "Pesan jasa berkualitas langsung dari kader & simpatisan PSI Sidoarjo.",
    btn_register_karya: "Daftarkan Jasa Anda",
    filter_karya_design: "Jasa Desain",
    filter_karya_service: "Jasa Service",
    filter_karya_other: "Jasa Lainnya",
    section_title_map: "Sebaran Pengurus DPC Sidoarjo",
    section_desc_map: "Klik logo Gajah bersinar di peta untuk melihat detail DPC Kecamatan.",
    dpc_placeholder_title: "Informasi DPC Kecamatan",
    dpc_placeholder_desc: "Pilih salah satu DPC Kecamatan pada peta untuk memunculkan nama ketua pengurus, nomor kontak WhatsApp, dan alamat kantor DPC.",
    section_title_jadwal: "Jadwal & Agenda PSI Sidoarjo",
    section_desc_jadwal: "Ikuti rangkaian kegiatan sosial dan kemasyarakatan dari kami.",
    footer_title: "DPD PSI Kabupaten Sidoarjo",
    footer_copyright: "© 2026 DPD PSI Sidoarjo. Hak Cipta Dilindungi.",
    slide_news_tag: "Aksi Nyata & Berita DPD",
    slide_news_title: "Ayo Rek! Bareng-Bareng Bangun Sidoarjo Lebih Maju & Transparan",
    slide_news_desc: "Pantau terus berita kegiatan dan perjuangan politik LBH serta kader DPD/DPC PSI Kabupaten Sidoarjo secara nyata.",
    slide_news_btn: "Baca Berita Terbaru",
    slide_video_tag: "Dokumentasi Aksi Sosial",
    slide_video_title: "Tonton Aksi Solidaritas Kami Melalui Galeri Video",
    slide_video_desc: "Saksikan rekap video kegiatan sosial, bakti masyarakat, dan konsolidasi pengurus di wilayah Kabupaten Sidoarjo.",
    slide_video_btn: "Tonton Galeri Video",
    slide_umkm_tag: "Ekonomi Kreatif Sidoarjo",
    slide_umkm_title: "Dukung Produk Unggulan Lokal & UMKM Sidoarjo",
    slide_umkm_desc: "Temukan produk kuliner, fashion, dan kerajinan tangan berkualitas hasil karya UMKM binaan DPD PSI Sidoarjo.",
    slide_umkm_btn: "Jelajahi Produk UMKM",
    slide_schedule_tag: "Agenda Solidaritas",
    slide_schedule_title: "Ikuti Jadwal & Agenda Kegiatan Sosial Kami",
    slide_schedule_desc: "Jangan lewatkan kesempatan berpartisipasi langsung dalam baksos, layanan kesehatan gratis, dan forum publik PSI Sidoarjo.",
    slide_schedule_btn: "Lihat Jadwal Kegiatan"
  },
  en: {
    menu_home: "Home",
    menu_profile: "DPD Profile",
    menu_visi: "Vision & Mission",
    menu_news: "Activity News",
    menu_video: "Video Gallery",
    menu_umkm: "Sidoarjo MSMEs",
    menu_pangan: "Food Buddies",
    menu_gaya: "Fashion Buddies",
    menu_hukum: "Legal Buddies",
    menu_karya: "Service Buddies",
    menu_map: "DPC Map",
    menu_schedule: "Activity Schedule",
    hero_tag: "DPD PSI Sidoarjo Regency",
    hero_title: "Let's Go! Together Building a More Progressive & Transparent Sidoarjo",
    hero_desc: "An alternative political platform for youth, women, and all Sidoarjo citizens who are anti-corruption and uphold tolerance.",
    hero_btn_umkm: "Explore Sidoarjo MSMEs",
    hero_btn_hukum: "Free Legal Consultation",
    stat_label_dpc: "District DPC",
    stat_label_umkm: "Guided MSMEs",
    stat_label_kegiatan: "Activities This Month",
    stat_label_kader: "Sidoarjo PSI Friends",
    section_title_berita_utama: "Featured News",
    section_desc_berita_utama: "PSI Sidoarjo's activities and real actions in the community.",
    section_title_sejarah: "DPD Brief History",
    section_desc_sejarah: "Understanding the struggle of PSI in Sidoarjo Regency.",
    section_title_pengurus: "DPD Management Structure",
    section_desc_pengurus: "Brothers and Sisters managing DPD PSI Sidoarjo Regency.",
    visi_title: "Vision of Struggle",
    section_title_misi: "Our Mission",
    section_desc_misi: "The real direction of the Indonesian Solidarity Party's struggle.",
    section_title_berita: "Solidarity News",
    section_desc_berita: "Complete news of PSI Sidoarjo's real action.",
    section_title_video: "Activity Video Recap",
    section_desc_video: "Documentation of social action and consolidation of DPD and DPC PSI across Sidoarjo.",
    filter_all: "All",
    filter_video_dpd: "Regency DPD",
    filter_video_dpc: "District DPC",
    section_title_umkm: "Sidoarjo MSME Catalog",
    section_desc_umkm: "Supporting local creative economy in Sidoarjo.",
    btn_register_umkm: "Register Your MSME",
    filter_umkm_food: "Culinary & Food",
    filter_umkm_fashion: "Fashion & Clothing",
    filter_umkm_craft: "Handicrafts",
    section_title_sembako: "Monitor Sidoarjo Staple Prices",
    section_desc_sembako: "Today's average price updates of basic food commodities in Sidoarjo markets.",
    table_header_commodity: "Food Commodity",
    table_header_price: "Retail Price (Rp)",
    table_header_change: "Change",
    section_title_calc: "Smart Shopping Calculator",
    section_desc_calc: "Calculate the estimated monthly staple food budget for your family.",
    calc_label_select: "Select Staple Commodity",
    calc_btn_add: "Add to Cart",
    calc_result_title: "Total Estimated Budget",
    calc_note: "*Prices above are average estimates from Sidoarjo traditional markets.",
    section_title_gaya: "Solidarity Style",
    section_desc_gaya: "Cool Official Clothing, Jackets, and Fashion Choices of PSI Sidoarjo.",
    section_title_hukum_form: "Legal Service Submission",
    section_desc_hukum_form: "Free Legal Consultation, Legal Assistance & Sidoarjo MSME Legalization.",
    form_label_name: "Full Name",
    form_placeholder_name: "Enter your full name",
    form_label_phone: "WhatsApp Number",
    form_placeholder_phone: "Example: 081234567890",
    form_label_service: "Service Type",
    opt_service_consult: "Free Legal Consultation",
    opt_service_assist: "Legal Case Assistance",
    opt_service_umkm: "MSME Legalization (NIB/Halal)",
    form_label_desc: "Case Description / Need",
    form_placeholder_desc: "Explain briefly your legal issues or MSME license legalization needs...",
    form_btn_submit_hukum: "Submit Legal Request",
    section_title_hukum_steps: "Legal Assistance Flow",
    section_desc_hukum_steps: "How the LBH of DPD PSI Sidoarjo handles your application.",
    step1_title: "Application Received",
    step1_desc: "Consultation form is submitted by Sidoarjo citizens through the website.",
    step2_title: "Legal Analysis by LBH Team",
    step2_desc: "The case is objectively analyzed by Advocates & PSI Legal Cadres.",
    step3_title: "Follow-Up & Assistance",
    step3_desc: "Citizens are contacted via WhatsApp for document preparation & free assistance.",
    section_title_karya: "Sobat Karya Services",
    section_desc_karya: "Order quality services directly from PSI Sidoarjo cadres & sympathizers.",
    btn_register_karya: "Register Your Service",
    filter_karya_design: "Design Services",
    filter_karya_service: "Repair Services",
    filter_karya_other: "Other Services",
    section_title_map: "Sidoarjo DPC Administrators Distribution",
    section_desc_map: "Click the glowing Gajah logo on the map to see District DPC details.",
    dpc_placeholder_title: "District DPC Information",
    dpc_placeholder_desc: "Select a District DPC on the map to display the head's name, WhatsApp contact, and DPC office address.",
    section_title_jadwal: "PSI Sidoarjo Schedule & Agenda",
    section_desc_jadwal: "Follow our series of social and community activities.",
    footer_title: "DPD PSI Sidoarjo Regency",
    footer_copyright: "© 2026 DPD PSI Sidoarjo. All Rights Reserved.",
    slide_news_tag: "Real Action & DPD News",
    slide_news_title: "Let's Go! Together Building a More Progressive & Transparent Sidoarjo",
    slide_news_desc: "Keep monitoring activity news and political struggles of LBH and PSI Sidoarjo cadres.",
    slide_news_btn: "Read Latest News",
    slide_video_tag: "Social Action Documentation",
    slide_video_title: "Watch Our Solidarity Actions in the Video Gallery",
    slide_video_desc: "Watch video recaps of social activities, community services, and consolidation of administrators in Sidoarjo.",
    slide_video_btn: "Watch Video Gallery",
    slide_umkm_tag: "Sidoarjo Creative Economy",
    slide_umkm_title: "Support Local Featured Products & Sidoarjo MSMEs",
    slide_umkm_desc: "Discover quality culinary, fashion, and handicraft products made by MSMEs guided by DPD PSI Sidoarjo.",
    slide_umkm_btn: "Explore MSME Products",
    slide_schedule_tag: "Solidarity Agenda",
    slide_schedule_title: "Follow Our Schedule & Agenda of Social Activities",
    slide_schedule_desc: "Do not miss the opportunity to participate directly in social services, free healthcare, and PSI Sidoarjo public forums.",
    slide_schedule_btn: "View Activity Schedule"
  },
  ja: {
    menu_home: "ホーム",
    menu_profile: "DPDプロファイル",
    menu_visi: "ビジョン＆ミッション",
    menu_news: "活動ニュース",
    menu_video: "動画ギャラリー",
    menu_umkm: "シドアルジョ中小企業",
    menu_pangan: "フードバディ",
    menu_gaya: "ファッションバディ",
    menu_hukum: "リーガルバディ",
    menu_karya: "サービスバディ",
    menu_map: "DPCマップ",
    menu_schedule: "活動スケジュール",
    hero_tag: "DPD PSI シドアルジョ県",
    hero_title: "さあ行こう！一緒により進歩的で透明なシドアルジョを築こう",
    hero_desc: "反汚職を掲げ、寛容さを重んじる若者、女性、そしてすべてのシドアルジョ市民のための代替政治プラットフォーム。",
    hero_btn_umkm: "シドアルジョの中小企業を探索する",
    hero_btn_hukum: "無料法律相談",
    stat_label_dpc: "地区DPC",
    stat_label_umkm: "支援された中小企業",
    stat_label_kegiatan: "今月の活動",
    stat_label_kader: "シドアルジョPSIフレンズ",
    section_title_berita_utama: "主要ニュース",
    section_desc_berita_utama: "地域社会におけるPSIシドアルジョの活動 and 実際の行動。",
    section_title_sejarah: "DPD略歴",
    section_desc_sejarah: "シドアルジョ県におけるPSIの闘いについて知る。",
    section_title_pengurus: "DPD役員構成",
    section_desc_pengurus: "シドアルジョ県DPD PSIの役員一同。",
    visi_title: "闘争のビジョン",
    section_title_misi: "私たちの使命",
    section_desc_misi: "インドネシア連帯党の闘いの確かな方向性。",
    section_title_berita: "連帯のニュース",
    section_desc_berita: "PSIシドアルジョの実際の行動に関する完全なニュース。",
    section_title_video: "活動動画まとめ",
    section_desc_video: "シドアルジョ県内のDPDおよびDPC PSIの社会貢献活動と結束の記録。",
    filter_all: "すべて",
    filter_video_dpd: "県DPD",
    filter_video_dpc: "地区DPC",
    section_title_umkm: "シドアルジョ中小企業カタログ",
    section_desc_umkm: "シドアルジョのローカルな創造的経済を支援します。",
    btn_register_umkm: "中小企業を登録する",
    filter_umkm_food: "グルメ＆食品",
    filter_umkm_fashion: "ファッション＆衣料品",
    filter_umkm_craft: "手工芸品",
    section_title_sembako: "シドアルジョ食料品価格監視",
    section_desc_sembako: "シドアルジョ市場における本日の主要食料品の平均価格更新情報。",
    table_header_commodity: "食料品名",
    table_header_price: "小売価格 (Rp)",
    table_header_change: "変動",
    section_title_calc: "スマート買い物計算機",
    section_desc_calc: "家族の月々の主食予算の見積もりを計算します。",
    calc_label_select: "食料品を選択",
    calc_btn_add: "買い物かごに入れる",
    calc_result_title: "合計予算見積もり",
    calc_note: "*上記の価格はシドアルジョの伝統的市場の平均見積もりです。",
    section_title_gaya: "連帯スタイル",
    section_desc_gaya: "PSIシドアルジョ公式のおしゃれな衣類、ジャケット、ファッションの選択肢。",
    section_title_hukum_form: "法律サービス申請",
    section_desc_hukum_form: "無料法律相談、法的支援、およびシドアルジョ中小企業の公認手続き。",
    form_label_name: "氏名",
    form_placeholder_name: "フルネームを入力してください",
    form_label_phone: "WhatsApp番号",
    form_placeholder_phone: "例: 081234567890",
    form_label_service: "サービスの種類",
    opt_service_consult: "無料法律相談",
    opt_service_assist: "訴訟手続き支援",
    opt_service_umkm: "中小企業の公認 (NIB/ハラール認証)",
    form_label_desc: "相談内容 / 必要事項",
    form_placeholder_desc: "法的な問題や中小企业ライセンスの公認に関するご要望を簡潔に説明してください...",
    form_btn_submit_hukum: "法律相談を申請する",
    section_title_hukum_steps: "法的支援の流れ",
    section_desc_hukum_steps: "DPD PSIシドアルジョのLBHがあなたの申請を処理する方法。",
    step1_title: "申請書類の受理",
    step1_desc: "相談フォームは、シドアルジョの市民からウェブサイトを通じて送信されます。",
    step2_title: "LBHチームによる法的分析",
    step2_desc: "弁護士とPSIリーガル幹部によって事例が客観的に分析されます。",
    step3_title: "フォローアップ＆支援",
    step3_desc: "書類作成と無料支援のために、市民にはWhatsAppで連絡が届きます。",
    section_title_karya: "ソバット・カルヤのサービス",
    section_desc_karya: "PSIシドアルジョの幹部や支持者から高品質のサービスを直接注文します。",
    btn_register_karya: "サービスを登録する",
    filter_karya_design: "デザインサービス",
    filter_karya_service: "修理サービス",
    filter_karya_other: "その他のサービス",
    section_title_map: "シドアルジョDPC幹部分布図",
    section_desc_map: "地図上の光る象のロゴをクリックして、地区DPCの詳細を確認します。",
    dpc_placeholder_title: "地区DPC情報",
    dpc_placeholder_desc: "地図上の地区DPCを選択して、代表者名、WhatsAppの連絡先、およびDPC事務所の住所を表示します。",
    section_title_jadwal: "PSIシドアルジョの活動スケジュール＆予定",
    section_desc_jadwal: "私たちの一連の社会・地域活動をフォローしてください。",
    footer_title: "DPD PSI シドアルジョ県",
    footer_copyright: "© 2026 DPD PSI Sidoarjo. 無断転載を禁じます。",
    slide_news_tag: "実際の活動＆DPDニュース",
    slide_news_title: "さあ行こう！一緒により進歩的で透明なシドアルジョを築こう",
    slide_news_desc: "シドアルジョ県のLBHおよびPSI幹部の活動ニュースと政治的闘争を監視し続けます。",
    slide_news_btn: "最新ニュースを読む",
    slide_video_tag: "社会活動 of 記録",
    slide_video_title: "動画ギャラリーで私たちの連帯活動を見る",
    slide_video_desc: "シドアルジョにおける社会活動、地域奉仕、役員集会の動画まとめをご覧ください。",
    slide_video_btn: "動画ギャラリーを見る",
    slide_umkm_tag: "シドアルジョの創造的経済",
    slide_umkm_title: "地元の特産品とシドアルジョの中小企業を支援する",
    slide_umkm_desc: "DPD PSIシドアルジョが支援する中小企業が作る高品質なグルメ、ファッション、手工芸品をご覧ください。",
    slide_umkm_btn: "中小企業製品を探索する",
    slide_schedule_tag: "連帯の予定",
    slide_schedule_title: "私たちの社会活動のスケジュールと予定をフォローしてください",
    slide_schedule_desc: "社会奉仕活動、無料医療サービス、PSIシドアルジョの公開フォーラムに直接参加する機会をお見逃しなく。",
    slide_schedule_btn: "活動スケジュールを見る"
  },
  zh: {
    menu_home: "首页",
    menu_profile: "DPD 简介",
    menu_visi: "愿景与使命",
    menu_news: "活动新闻",
    menu_video: "视频画廊",
    menu_umkm: "泗水中小企业",
    menu_pangan: "粮食伙伴",
    menu_gaya: "时尚伙伴",
    menu_hukum: "法律伙伴",
    menu_karya: "服务伙伴",
    menu_map: "DPC 地图",
    menu_schedule: "活动日程",
    hero_tag: "DPD PSI 泗水县",
    hero_title: "加油！共同建设更加进步和透明的泗水",
    hero_desc: "为反对腐败、坚持宽容的青年、女性以及所有泗水市民提供的替代性政治平台。",
    hero_btn_umkm: "探索泗水中小企业",
    hero_btn_hukum: "免费法律咨询",
    stat_label_dpc: "区级 DPC",
    stat_label_umkm: "受指导中小企业",
    stat_label_kegiatan: "本月活动",
    stat_label_kader: "泗水 PSI 之友",
    section_title_berita_utama: "主要新闻",
    section_desc_berita_utama: "PSI 泗水在社区中的活动和实际行动。",
    section_title_sejarah: "DPD 简史",
    section_desc_sejarah: "了解 PSI 在泗水县的奋斗历程。",
    section_title_pengurus: "DPD 组织结构",
    section_desc_pengurus: "泗水县 DPD PSI 的全体管理干部。",
    visi_title: "奋斗愿景",
    section_title_misi: "我们的使命",
    section_desc_misi: "印度尼西亚团结党奋斗的明确方向。",
    section_title_berita: "团结新闻",
    section_desc_berita: "有关 PSI 泗水实际行动的完整新闻。",
    section_title_video: "活动视频集锦",
    section_desc_video: "泗水县内 DPD 和 DPC PSI 社会公益活动与团结的记录。",
    filter_all: "全部",
    filter_video_dpd: "县级 DPD",
    filter_video_dpc: "区级 DPC",
    section_title_umkm: "泗水中小企业名录",
    section_desc_umkm: "支持泗水本地的创意经济。",
    btn_register_umkm: "注册您的中小企业",
    filter_umkm_food: "美食与餐饮",
    filter_umkm_fashion: "时尚与服装",
    filter_umkm_craft: "手工艺品",
    section_title_sembako: "泗水粮油价格监控",
    section_desc_sembako: "今日泗水市场主要粮油副食品平均零售价格更新。",
    table_header_commodity: "粮油商品",
    table_header_price: "零售价格 (Rp)",
    table_header_change: "变动",
    section_title_calc: "智能购物计算器",
    section_desc_calc: "估算您家庭每月粮油食品的预算。",
    calc_label_select: "选择粮油商品",
    calc_btn_add: "加入购物车",
    calc_result_title: "总预估预算",
    calc_note: "*以上价格为泗水传统市场的平均预估价。",
    section_title_gaya: "团结风格",
    section_desc_gaya: "PSI 泗水官方时尚服装、夹克和配饰选择。",
    section_title_hukum_form: "法律服务申请",
    section_desc_hukum_form: "免费法律咨询、法律援助及泗水中小企业合规化登记。",
    form_label_name: "姓名",
    form_placeholder_name: "请输入您的全名",
    form_label_phone: "WhatsApp 号码",
    form_placeholder_phone: "例如: 081234567890",
    form_label_service: "服务类型",
    opt_service_consult: "免费法律咨询",
    opt_service_assist: "法律诉讼援助",
    opt_service_umkm: "中小企业合规化 (NIB/清真认证)",
    form_label_desc: "咨询内容 / 需求",
    form_placeholder_desc: "简要说明您的法律问题或中小企业执照的登记需求...",
    form_btn_submit_hukum: "提交法律申请",
    section_title_hukum_steps: "法律援助流程",
    section_desc_hukum_steps: "DPD PSI 泗水县的 LBH 如何处理您的申请。",
    step1_title: "申请受理",
    step1_desc: "泗水市民通过网站提交法律咨询申请表。",
    step2_title: "LBH 团队法律分析",
    step2_desc: "律师与 PSI 法律骨干对案例进行客观分析。",
    step3_title: "跟进与援助",
    step3_desc: "我们将通过 WhatsApp 联系市民，免费协助准备文件。",
    section_title_karya: "粮食伙伴服务",
    section_desc_karya: "直接从 PSI 泗水的骨干和支持者那里订购高质量服务。",
    btn_register_karya: "登记您的服务",
    filter_karya_design: "设计服务",
    filter_karya_service: "维修服务",
    filter_karya_other: "其他服务",
    section_title_map: "泗水 DPC 骨干分布图",
    section_desc_map: "点击地图上的发光大象图标，查看区级 DPC 的详细信息。",
    dpc_placeholder_title: "区级 DPC 信息",
    dpc_placeholder_desc: "在地图上选择区级 DPC，以显示负责人姓名、WhatsApp 联系方式和 DPC 办公室地址。",
    section_title_jadwal: "PSI 泗水活动日程与日程安排",
    section_desc_jadwal: "关注我们的一系列社会和社区活动。",
    footer_title: "DPD PSI 泗水县",
    footer_copyright: "© 2026 DPD PSI Sidoarjo. 版权所有。",
    slide_news_tag: "实际行动与 DPD 新闻",
    slide_news_title: "加油！共同建设更加进步和透明的泗水",
    slide_news_desc: "持续关注泗水县 LBH 以及 PSI 干部的活动新闻和政治斗争。",
    slide_news_btn: "阅读最新新闻",
    slide_video_tag: "社会活动记录",
    slide_video_title: "在视频画廊观看我们的团结行动",
    slide_video_desc: "观看泗水社会活动、社区服务和干部集会的视频回顾。",
    slide_video_btn: "观看视频画廊",
    slide_umkm_tag: "泗水创意经济",
    slide_umkm_title: "支持本地特色产品和泗水中小企业",
    slide_umkm_desc: "发现由 DPD PSI 泗水指导的中小企业生产的高质量美食、时尚和手工艺品。",
    slide_umkm_btn: "探索中小企业产品",
    slide_schedule_tag: "团结议程",
    slide_schedule_title: "关注我们的社会活动日程和议程",
    slide_schedule_desc: "不要错过直接参与社会服务、免费医疗和 PSI 泗水公开论坛的机会。",
    slide_schedule_btn: "查看活动日程"
  },
  ar: {
    menu_home: "الرئيسية",
    menu_profile: "ملف DPD",
    menu_visi: "الرؤية والرسالة",
    menu_news: "أخبار الأنشطة",
    menu_video: "معرض الفيديو",
    menu_umkm: "الشركات الصغيرة بسيدوارجو",
    menu_pangan: "أصدقاء الغذاء",
    menu_gaya: "أصدقاء الموضة",
    menu_hukum: "أصدقاء القانون",
    menu_karya: "أصدقاء الخدمة",
    menu_map: "خريطة DPC",
    menu_schedule: "جدول الأنشطة",
    hero_tag: "DPD PSI لمنطقة سيدوارجو",
    hero_title: "هيا بنا! معاً نبني سيدوارجو أكثر تقدماً وشفافية",
    hero_desc: "منصة سياسية بديلة للشباب والنساء وجميع مواطني سيدوارجو الذين يناهضون الفساد ويؤيدون التسامح.",
    hero_btn_umkm: "استكشف الشركات الصغيرة بسيدوارجو",
    hero_btn_hukum: "استشارة قانونية مجانية",
    stat_label_dpc: "DPC للمنطقة",
    stat_label_umkm: "الشركات الصغيرة الموجهة",
    stat_label_kegiatan: "أنشطة هذا الشهر",
    stat_label_kader: "أصدقاء PSI بسيدوارجو",
    section_title_berita_utama: "أخبار مميزة",
    section_desc_berita_utama: "أنشطة PSI سيدوارجو وإجراءاتها الفعلية في المجتمع.",
    section_title_sejarah: "نبذة تاريخية عن DPD",
    section_desc_sejarah: "فهم كفاح حزب التضامن الإندونيسي في منطقة سيدوارجو.",
    section_title_pengurus: "الهيكل الإداري لـ DPD",
    section_desc_pengurus: "الأخوة والأخوات الذين يديرون DPD PSI بمنطقة سيدوارجو.",
    visi_title: "رؤية الكفاح",
    section_title_misi: "مهمتنا",
    section_desc_misi: "الاتجاه الفعلي لكفاح حزب التضامن الإندونيسي.",
    section_title_berita: "أخبار التضامن",
    section_desc_berita: "أخبار كاملة عن العمل الفعلي لـ PSI سيدوارجو.",
    section_title_video: "ملخص فيديو الأنشطة",
    section_desc_video: "توثيق العمل الاجتماعي وتوطيد DPD وDPC PSI في جميع أنحاء سيدوارجو.",
    filter_all: "الكل",
    filter_video_dpd: "DPD للمنطقة",
    filter_video_dpc: "DPC للمقاطعة",
    section_title_umkm: "كتالوج الشركات الصغيرة بسيدوارجو",
    section_desc_umkm: "دعم الاقتصاد الإبداعي المحلي في سيدوارجو.",
    btn_register_umkm: "سجل شركتك الصغيرة",
    filter_umkm_food: "الطهي والغذاء",
    filter_umkm_fashion: "الموضة والملابس",
    filter_umkm_craft: "الحرف اليدوية",
    section_title_sembako: "مراقبة أسعار المواد الغذائية بسيدوارجو",
    section_desc_sembako: "تحديثات أسعار السلع الغذائية الأساسية اليوم في أسواق سيدوارجو.",
    table_header_commodity: "السلعة الغذائية",
    table_header_price: "سعر التجزئة (Rp)",
    table_header_change: "التغيير",
    section_title_calc: "حاسبة التسوق الذكية",
    section_desc_calc: "احسب الميزانية الشهرية المقدرة للمواد الغذائية الأساسية لعائلتك.",
    calc_label_select: "اختر السلعة الأساسية",
    calc_btn_add: "أضف إلى السلة",
    calc_result_title: "إجمالي الميزانية المقدرة",
    calc_note: "*الأسعار المذكورة أعلاه هي تقديرات متوسطة من أسواق سيدوارجو التقليدية.",
    section_title_gaya: "أسلوب التضامن",
    section_desc_gaya: "خيارات الملابس الرسمية الرائعة والسترات والموضة من PSI سيدوارجو.",
    section_title_hukum_form: "تقديم طلب الخدمة القانونية",
    section_desc_hukum_form: "استشارة قانونية مجانية، ومساعدة قانونية وتقنين الشركات الصغيرة بسيدوارجو.",
    form_label_name: "الاسم الكامل",
    form_placeholder_name: "أدخل اسمك الكامل",
    form_label_phone: "رقم الواتساب",
    form_placeholder_phone: "مثال: 081234567890",
    form_label_service: "نوع الخدمة",
    opt_service_consult: "استشارة قانونية مجانية",
    opt_service_assist: "مساعدة في القضايا القانونية",
    opt_service_umkm: "تقنين الشركات الصغيرة (NIB/شهادة الحلال)",
    form_label_desc: "وصف القضية / الحاجة",
    form_placeholder_desc: "اشرح باختصار مشاكلك القانونية أو احتياجات ترخيص الشركات الصغيرة...",
    form_btn_submit_hukum: "تقديم الطلب القانوني",
    section_title_hukum_steps: "مسار المساعدة القانونية",
    section_desc_hukum_steps: "كيف تتعامل LBH التابعة لـ DPD PSI سيدوارجو مع طلبك.",
    step1_title: "استلام الطلب",
    step1_desc: "يتم تقديم نموذج الاستشارة من قبل مواطني سيدوارجو عبر الموقع الإلكتروني.",
    step2_title: "التحليل القانوني من قبل فريق LBH",
    step2_desc: "يتم تحليل القضية بموضوعية من قبل المحامين وكوادر القانون التابعين لـ PSI.",
    step3_title: "المتابعة والمساعدة",
    step3_desc: "يتم الاتصال بالمواطنين عبر الواتساب لإعداد المستندات والمساعدة المجانية.",
    section_title_karya: "خدمات أصدقاء الخدمة",
    section_desc_karya: "اطلب خدمات عالية الجودة مباشرة من كوادر ومؤيدي PSI سيدوارجو.",
    btn_register_karya: "سجل خدمتك",
    filter_karya_design: "خدمات التصميم",
    filter_karya_service: "خدمات الإصلاح",
    filter_karya_other: "خدمات أخرى",
    section_title_map: "توزيع مسؤولي DPC في سيدوارجو",
    section_desc_map: "انقر فوق شعار الفيل المتوهج على الخريطة لرؤية تفاصيل DPC للمنطقة.",
    dpc_placeholder_title: "معلومات DPC للمنطقة",
    dpc_placeholder_desc: "حدد DPC مقاطعة على الخريطة لعرض اسم الرئيس، وجهة اتصال الواتساب، وعنوان مكتب DPC.",
    section_title_jadwal: "جدول أعمال وأنشطة PSI سيدوارجو",
    section_desc_jadwal: "تابع سلسلة أنشطتنا الاجتماعية والمجتمعية.",
    footer_title: "DPD PSI لمنطقة سيدوارجو",
    footer_copyright: "© 2026 DPD PSI Sidoarjo. كل الحقوق محفوظة.",
    slide_news_tag: "العمل الفعلي وأخبار DPD",
    slide_news_title: "هيا بنا! معاً نبني سيدوارجو أكثر تقدماً وشفافية",
    slide_news_desc: "تابع باستمرار أخبار أنشطة وكفاح LBH وكوادر PSI بمنطقة سيدوارجو.",
    slide_news_btn: "اقرأ آخر الأخبار",
    slide_video_tag: "توثيق العمل الاجتماعي",
    slide_video_title: "شاهد أعمال التضامن الخاصة بنا في معرض الفيديو",
    slide_video_desc: "شاهد ملخصات الفيديو للأنشطة الاجتماعية والخدمات المجتمعية وتوطيد الإدارة في سيدوارجو.",
    slide_video_btn: "شاهد معرض الفيديو",
    slide_umkm_tag: "الاقتصاد الإبداعي بسيدوارجو",
    slide_umkm_title: "دعم المنتجات المحلية والشركات الصغيرة بسيدوارجو",
    slide_umkm_desc: "اكتشف منتجات الطهي والموضة والحرف اليدوية عالية الجودة التي تصنعها الشركات الصغيرة الموجهة بواسطة DPD PSI سيدوارجو.",
    slide_umkm_btn: "استكشف منتجات الشركات الصغيرة",
    slide_schedule_tag: "جدول أعمال التضامن",
    slide_schedule_title: "تابع جدول أعمال وأنشطة العمل الاجتماعي الخاصة بنا",
    slide_schedule_desc: "لا تفوت فرصة المشاركة المباشرة في الخدمات الاجتماعية والرعاية الصحية المجانية والمنتديات العامة لـ PSI سيدوارجو.",
    slide_schedule_btn: "عرض جدول الأنشطة"
  }
};

window.changeLanguage = function(lang) {
  localStorage.setItem("psi_lang", lang);
  document.documentElement.dir = (lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.lang = lang;
  
  const select = document.getElementById("lang-select");
  if (select) select.value = lang;

  document.querySelectorAll("[data-translate]").forEach(el => {
    const key = el.getAttribute("data-translate");
    if (UI_TRANSLATIONS[lang] && UI_TRANSLATIONS[lang][key]) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = UI_TRANSLATIONS[lang][key];
      } else {
        el.textContent = UI_TRANSLATIONS[lang][key];
      }
    }
  });

  // Dynamic header page title updates
  const activeMenu = document.querySelector(".menu-item.active span[data-translate]");
  const pageTitle = document.getElementById("page-title");
  if (pageTitle && activeMenu) {
    const key = activeMenu.getAttribute("data-translate");
    if (UI_TRANSLATIONS[lang] && UI_TRANSLATIONS[lang][key]) {
      pageTitle.textContent = UI_TRANSLATIONS[lang][key];
    }
  }

  // Re-render UI components dependent on state labels
  renderAllSections();
  if (mainMap) {
    initMapFeature();
  }
};

function initDarkMode() {
  const toggleBtn = document.getElementById("dark-mode-toggle");
  if (!toggleBtn) return;

  const currentMode = localStorage.getItem("psi_theme") || "light";
  if (currentMode === "dark") {
    document.body.classList.add("dark-mode");
    toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.remove("dark-mode");
    toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  toggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("psi_theme", isDark ? "dark" : "light");
    toggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });
}

// -------------------------------------------------------------
// HERO SLIDER CONTROLS (Revision 9 Carousel Update)
// -------------------------------------------------------------
let currentHeroSlide = 0;
const totalHeroSlides = 4;
let heroAutoPlayInterval = null;

window.showHeroSlide = function(index) {
  currentHeroSlide = (index + totalHeroSlides) % totalHeroSlides;
  const slider = document.getElementById("hero-slider");
  const dots = document.querySelectorAll(".hero-slider-dots .dot");
  
  if (slider) {
    const translation = -currentHeroSlide * 25; // 25% for each of the 4 slides (total width 400%)
    slider.style.transform = `translateX(${translation}%)`;
  }
  
  dots.forEach((dot, idx) => {
    if (idx === currentHeroSlide) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
};

window.nextHeroSlide = function() {
  showHeroSlide(currentHeroSlide + 1);
};

window.prevHeroSlide = function() {
  showHeroSlide(currentHeroSlide - 1);
};

window.setHeroSlide = function(index) {
  showHeroSlide(index);
  resetHeroAutoplay();
};

function resetHeroAutoplay() {
  if (heroAutoPlayInterval) {
    clearInterval(heroAutoPlayInterval);
  }
  heroAutoPlayInterval = setInterval(nextHeroSlide, 5000);
}

// Start autoplay in the background
heroAutoPlayInterval = setInterval(nextHeroSlide, 5000);

