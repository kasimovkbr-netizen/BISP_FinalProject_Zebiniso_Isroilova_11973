import { db, auth } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let savedArticles = [];

export async function initSavedArticlesModule() {
  const grid = document.getElementById("savedArticlesGrid");
  if (!grid) return;

  const user = auth.currentUser;
  if (!user) return;

  grid.innerHTML = `<div class="saved-article-card"><p>Loading...</p></div>`;

  const bookmarkSnap = await getDocs(
    query(collection(db, "user_bookmarks"), where("userId", "==", user.uid)),
  );

  if (bookmarkSnap.empty) {
    renderSavedArticles([]);
    return;
  }

  savedArticles = [];

  for (const bookmarkDoc of bookmarkSnap.docs) {
    const articleId = bookmarkDoc.data().articleId;

    const articleSnap = await getDocs(
      query(
        collection(db, "knowledge_base"),
        where("__name__", "==", articleId),
      ),
    );

    if (!articleSnap.empty) {
      savedArticles.push({
        bookmarkId: bookmarkDoc.id,
        id: articleId,
        ...articleSnap.docs[0].data(),
      });
    }
  }

  renderSavedArticles(savedArticles);
}

export function renderSavedArticles(articles) {
  const grid = document.getElementById("savedArticlesGrid");
  if (!grid) return;

  if (!articles || articles.length === 0) {
    grid.innerHTML = `
      <div class="saved-article-card saved-articles-empty">
        <p>No saved articles yet. Browse the Knowledge Base to save articles.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = articles
    .map(
      (article) => `
    <div class="saved-article-card" data-id="${article.id}">
      <h3>${article.title || ""}</h3>
      <p class="card-summary">${article.summary || ""}</p>
      <div class="card-footer">
        <span class="article-badge ${getCategoryBadgeClass(article.category)}">${article.category || ""}</span>
        <button class="read-article-btn" data-id="${article.id}">Read →</button>
      </div>
    </div>
  `,
    )
    .join("");

  grid.querySelectorAll(".read-article-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const articleId = btn.dataset.id;
      const article = savedArticles.find((a) => a.id === articleId);
      if (article) openArticleDetail(article);
    });
  });
}

export function getCategoryBadgeClass(category) {
  const map = {
    harmful: "badge-harmful",
    immunity: "badge-immunity",
    vaccines: "badge-vaccines",
    herbal: "badge-herbal",
    nutrition: "badge-nutrition",
    sleep: "badge-sleep",
  };
  return map[category] || "";
}

function openArticleDetail(article) {
  const existing = document.getElementById("savedArticleModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "savedArticleModal";
  modal.className = "pm-modal";
  modal.innerHTML = `
    <div class="pm-modal-box">
      <h3>${article.title || ""}</h3>
      <p class="kb-summary">${article.summary || ""}</p>
      <div class="kb-content">${article.content || ""}</div>
      <button id="closeSavedArticleModal">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
  document
    .getElementById("closeSavedArticleModal")
    .addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}
