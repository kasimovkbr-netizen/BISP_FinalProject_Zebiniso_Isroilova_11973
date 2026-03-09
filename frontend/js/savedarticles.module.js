import { db, auth } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let savedArticles = [];

export async function initSavedArticlesModule() {
  const list = document.getElementById("savedArticlesList");
  if (!list) return;

  const user = auth.currentUser;
  if (!user) return;

  list.innerHTML = "<li>Loading...</li>";

  const bookmarkSnap = await getDocs(
    query(
      collection(db, "user_bookmarks"),
      where("userId", "==", user.uid)
    )
  );

  if (bookmarkSnap.empty) {
    list.innerHTML = "<li>No saved articles yet.</li>";
    return;
  }

  savedArticles = [];

  for (const bookmarkDoc of bookmarkSnap.docs) {
    const articleId = bookmarkDoc.data().articleId;

    const articleSnap = await getDocs(
      query(collection(db, "knowledge_base"), where("__name__", "==", articleId))
    );

    if (!articleSnap.empty) {
      savedArticles.push({
        bookmarkId: bookmarkDoc.id,
        id: articleId,
        ...articleSnap.docs[0].data()
      });
    }
  }

  renderSavedArticles();
}

function renderSavedArticles() {
  const list = document.getElementById("savedArticlesList");
  if (!list) return;

  list.innerHTML = savedArticles.map(article => `
  <li class="saved-card card" data-id="${article.id}">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h4 style="margin:0;">${article.title}</h4>
        <p style="margin-top:6px; color:#666;">${article.summary || ""}</p>
      </div>
      <span style="color:#2F80ED;">→</span>
    </div>
  </li>
`).join("");

  document.querySelectorAll(".saved-card").forEach(card => {
    card.addEventListener("click", () => {
      const articleId = card.dataset.id;
      const article = savedArticles.find(a => a.id === articleId);
      if (article) openArticleDetail(article);
    });
  });
}

function openArticleDetail(article) {
  const list = document.getElementById("savedArticlesList");

  list.innerHTML = `
  <div class="saved-detail card" style="padding:25px;">
    <button id="backToSaved" style="margin-bottom:15px;">⬅ Back</button>
    <h2 style="margin-bottom:10px;">${article.title}</h2>
    <p style="color:#555;">${article.summary || ""}</p>

    <div style="margin:20px 0;">
      ${formatContent(article.content)}
    </div>

    <button id="removeBookmark" class="primary">
      ⭐ Remove Bookmark
    </button>
  </div>
`;

  document.getElementById("backToSaved").onclick = () => {
    renderSavedArticles();
  };

  document.getElementById("removeBookmark").onclick = async () => {
    await deleteDoc(doc(db, "user_bookmarks", article.bookmarkId));

    savedArticles = savedArticles.filter(a => a.id !== article.id);

    renderSavedArticles();
  };
}

function formatContent(text) {
  return text
    .split("\n")
    .filter(Boolean)
    .map(line => `<p>${line}</p>`)
    .join("");
}