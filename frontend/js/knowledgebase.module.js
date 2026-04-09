import { supabase } from "./supabase.js";

let currentCategory = "";
let currentArticles = [];
let rootClickHandler = null;
let realtimeChannel = null;

export function initKnowledgeBaseModule() {
  const homeView = document.getElementById("kbHomeView");
  const listView = document.getElementById("kbListView");
  const detailView = document.getElementById("kbDetailView");

  if (!homeView || !listView || !detailView) return;

  attachDelegatedListeners();
  showHomeView();
}

export function destroyKnowledgeBaseModule() {
  const page = document.querySelector(".knowledge-page");
  if (page && rootClickHandler) {
    page.removeEventListener("click", rootClickHandler);
  }

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  rootClickHandler = null;
  currentCategory = "";
  currentArticles = [];
}

function attachDelegatedListeners() {
  const page = document.querySelector(".knowledge-page");
  if (!page) return;

  if (rootClickHandler) {
    page.removeEventListener("click", rootClickHandler);
  }

  rootClickHandler = async (e) => {
    const categoryBtn = e.target.closest(".kb-category-card");
    const articleBtn = e.target.closest(".kb-article-card");
    const backHomeBtn = e.target.closest("#kbBackToHome");
    const backListBtn = e.target.closest("#kbBackToList");

    if (categoryBtn) {
      const category = categoryBtn.dataset.category;
      if (!category) return;
      currentCategory = category;
      await loadArticlesByCategory(category);
      return;
    }

    if (articleBtn) {
      const articleId = articleBtn.dataset.id;
      const article = currentArticles.find((a) => a.id === articleId);
      if (article) await renderArticleDetail(article);
      return;
    }

    if (backHomeBtn) {
      showHomeView();
      return;
    }

    if (backListBtn) {
      showListView();
    }
  };

  page.addEventListener("click", rootClickHandler);
}

async function loadArticlesByCategory(category) {
  const listContainer = document.getElementById("kbArticlesList");
  const title = document.getElementById("kbCategoryTitle");

  if (!listContainer || !title) return;

  listContainer.innerHTML = `<p>Loading...</p>`;
  title.textContent = getCategoryTitle(category);

  try {
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("*")
      .eq("category", category);

    if (error) throw error;

    currentArticles = data || [];

    // Subscribe to realtime changes for this category
    subscribeToKnowledgeBase(category);

    renderArticlesList();
    showListView();
  } catch (error) {
    console.error("Knowledge Base load error:", error);
    listContainer.innerHTML = `
      <p class="kb-empty">
        Could not load articles. Please try again later.
      </p>
    `;
    showListView();
  }
}

function subscribeToKnowledgeBase(category) {
  // Remove any existing channel before creating a new one
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabase
    .channel("knowledge_base_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "knowledge_base",
        filter: `category=eq.${category}`,
      },
      () => {
        // Re-load articles on any change
        loadArticlesByCategory(category);
      },
    )
    .subscribe();
}

function renderArticlesList() {
  const listContainer = document.getElementById("kbArticlesList");
  if (!listContainer) return;

  if (currentArticles.length === 0) {
    listContainer.innerHTML = `
      <p class="kb-empty">No articles found in this category yet.</p>
    `;
    return;
  }

  listContainer.innerHTML = currentArticles
    .map(
      (article) => `
    <button class="kb-article-card" data-id="${article.id}" type="button">
      <h4>${escapeHtml(article.title)}</h4>
      <p>${escapeHtml(article.summary || "")}</p>
    </button>
  `,
    )
    .join("");
}

async function renderArticleDetail(article) {
  const title = document.getElementById("kbDetailTitle");
  const summary = document.getElementById("kbDetailSummary");
  const warning = document.getElementById("kbDetailWarning");
  const content = document.getElementById("kbDetailContent");

  if (!title || !summary || !warning || !content) return;

  title.textContent = article.title || "";
  summary.textContent = article.summary || "";

  if (article.warning) {
    warning.textContent = article.warning;
    warning.classList.remove("hidden");
  } else {
    warning.textContent = "";
    warning.classList.add("hidden");
  }

  // Bookmark button qo'shamiz
  let bookmarkBtn = document.getElementById("kbBookmarkBtn");

  if (!bookmarkBtn) {
    bookmarkBtn = document.createElement("button");
    bookmarkBtn.id = "kbBookmarkBtn";
    bookmarkBtn.className = "kb-bookmark-btn";

    // title elementdan keyin qo'shamiz
    title.insertAdjacentElement("afterend", bookmarkBtn);
  }

  // Avval bookmark qilinganmi tekshiramiz
  const existingBookmarkId = await isBookmarked(article.id);

  bookmarkBtn.textContent = existingBookmarkId
    ? "⭐ Remove Bookmark"
    : "⭐ Save Article";

  bookmarkBtn.onclick = async () => {
    const saved = await toggleBookmark(article.id);
    bookmarkBtn.textContent = saved ? "⭐ Remove Bookmark" : "⭐ Save Article";
  };

  content.innerHTML = formatContent(article.content || "");
  showDetailView();
}

function showHomeView() {
  toggleViews("home");
}

function showListView() {
  toggleViews("list");
}

function showDetailView() {
  toggleViews("detail");
}

function toggleViews(view) {
  const homeView = document.getElementById("kbHomeView");
  const listView = document.getElementById("kbListView");
  const detailView = document.getElementById("kbDetailView");

  if (!homeView || !listView || !detailView) return;

  homeView.classList.toggle("hidden", view !== "home");
  listView.classList.toggle("hidden", view !== "list");
  detailView.classList.toggle("hidden", view !== "detail");
}

function getCategoryTitle(category) {
  if (category === "harmful") return "Harmful Medicines";
  if (category === "immunity") return "Immunity Tips";
  if (category === "vaccines") return "Vaccines Info";
  if (category === "herbal") return "Natural Herbal Beverages";
  if (category === "nutrition") return "Child Nutrition Tips";
  if (category === "sleep") return "Sleep & Development";
  return "Knowledge Base";
}

function formatContent(text) {
  return escapeHtml(text)
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function isBookmarked(articleId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("saved_articles")
    .select("id")
    .eq("user_id", userId)
    .eq("article_id", articleId)
    .single();

  if (error || !data) return null;
  return data.id;
}

async function toggleBookmark(articleId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;

  const userId = session.user.id;
  const bookmarkId = await isBookmarked(articleId);

  if (bookmarkId) {
    await supabase.from("saved_articles").delete().eq("id", bookmarkId);
    return false;
  } else {
    await supabase
      .from("saved_articles")
      .insert({ user_id: userId, article_id: articleId });
    return true;
  }
}
