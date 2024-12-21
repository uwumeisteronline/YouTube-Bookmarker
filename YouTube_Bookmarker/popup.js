
document.addEventListener("DOMContentLoaded", () => {
  const bookmarkButton = document.getElementById("bookmark");
  const bookmarksList = document.getElementById("bookmarks");
  const MAX_BOOKMARKS = 10; // Limit to 10 bookmarks

  function loadBookmarks() {
    chrome.storage.local.get(["ytBookmarks"], (result) => {
      bookmarksList.innerHTML = "";
      const bookmarks = result.ytBookmarks || [];
      bookmarks.forEach((bookmark, index) => {
        const listItem = document.createElement("li");

        // Create image element for the thumbnail
        const thumbnail = document.createElement("img");
        thumbnail.src = bookmark.thumbnail || ""; // Use stored thumbnail or leave blank
        thumbnail.alt = "Thumbnail";
        thumbnail.className = "thumbnail";

        // Create link
        const link = document.createElement("a");
        link.textContent = `${bookmark.title} - ${bookmark.time}`;
        link.href = bookmark.url;
        link.target = "_blank";

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.dataset.index = index;
        deleteButton.addEventListener("click", () => deleteBookmark(index));

        listItem.appendChild(thumbnail);
        listItem.appendChild(link);
        listItem.appendChild(deleteButton);
        bookmarksList.appendChild(listItem);
      });
    });
  }

  function saveBookmark() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const url = new URL(tab.url);

      if (url.hostname !== "www.youtube.com" || !url.searchParams.has("v")) {
        alert("This is not a YouTube video!");
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => {
            const video = document.querySelector("video");
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const thumbnail = canvas.toDataURL("image/png");
            const time = Math.floor(video.currentTime);

            return { thumbnail, time };
          },
        },
        (results) => {
          const { thumbnail, time } = results[0].result;
          const videoId = url.searchParams.get("v");
          const timestampUrl = `${url.origin}${url.pathname}?v=${videoId}&t=${time}s`;
          let title = tab.title;

          // Remove "- YouTube" from title if present
          if (title.endsWith(" - YouTube")) {
            title = title.slice(0, -10);
          }

          chrome.storage.local.get(["ytBookmarks"], (result) => {
            let bookmarks = result.ytBookmarks || [];
            
            // Ensure bookmarks do not exceed the maximum limit
            if (bookmarks.length >= MAX_BOOKMARKS) {
              bookmarks.shift(); // Remove the oldest bookmark
            }
            
            bookmarks.push({
              title,
              time: new Date(time * 1000).toISOString().substr(11, 8),
              url: timestampUrl,
              videoId,
              thumbnail,
            });
            chrome.storage.local.set({ ytBookmarks: bookmarks }, loadBookmarks);
          });
        }
      );
    });
  }

  function deleteBookmark(index) {
    chrome.storage.local.get(["ytBookmarks"], (result) => {
      const bookmarks = result.ytBookmarks || [];
      bookmarks.splice(index, 1);
      chrome.storage.local.set({ ytBookmarks: bookmarks }, loadBookmarks);
    });
  }

  bookmarkButton.addEventListener("click", saveBookmark);
  loadBookmarks();
});
