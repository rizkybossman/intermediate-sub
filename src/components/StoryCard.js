import { showNotification } from "../utils/notification.js";

export const StoryCard = (story, storyModel) => {
  const card = document.createElement("article");
  card.className = "story-card";
  card.setAttribute('data-story-id', story.id);
  card.setAttribute('role', 'article');
  card.setAttribute('aria-label', `Story by ${story.name}`);

  const formattedDate = new Date(story.createdAt).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const maxLength = 100;
  let shortDescription = story.description;
  if (story.description.length > maxLength) {
    shortDescription = story.description.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }


  const bookmarkButtonHTML = `
    <button class="bookmark-button" aria-label="Bookmark this story">
      <svg class="bookmark-icon" viewBox="0 0 24 24" width="24" height="24">
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>
  `;

  card.innerHTML = `
    <div class="story-image-container">
      <img src="${story.photoUrl}" 
           alt="Story image by ${story.name}" 
           class="story-image"
           loading="lazy"
           width="300"
           height="200">
      ${bookmarkButtonHTML}
    </div>
    <div class="story-content">
      <h3 class="story-title">${story.name}</h3>
      <p class="story-description">${shortDescription}</p>
      <time datetime="${new Date(story.createdAt).toISOString()}" 
            class="story-date">
        ${formattedDate}
      </time>
      <a href="#/stories/${story.id}" 
         class="read-more" 
         aria-label="Read more about ${story.name}"
         title="Read full story">
        Read more
      </a>
    </div>
  `;


  const bookmarkButton = card.querySelector('.bookmark-button');
  const bookmarkIcon = card.querySelector('.bookmark-icon path');


  const updateBookmarkState = async () => {
    try {
      const { success, bookmarked } = await storyModel.checkIfBookmarked(story.id);
      if (success) {
        bookmarkButton.classList.toggle('bookmarked', bookmarked);
        bookmarkButton.setAttribute('aria-label', 
          bookmarked ? 'Remove bookmark' : 'Add bookmark');
        bookmarkIcon.style.fill = bookmarked ? 'currentColor' : 'none';
        bookmarkIcon.style.stroke = 'currentColor';
      }
    } catch (error) {
      console.error('Failed to check bookmark state:', error);
    }
  };


  bookmarkButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const { success, message } = await storyModel.toggleBookmark(story.id);
      if (success) {
        await updateBookmarkState();
        showNotification(message, { type: 'success', autoClose: 2000 });
      } else {
        showNotification(message || 'Failed to update bookmark', { type: 'error' });
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      showNotification('Failed to update bookmark', { type: 'error' });
    }
  });


  bookmarkButton.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      bookmarkButton.click();
    }
  });


  updateBookmarkState();


  card.addEventListener('focus', () => {
    card.classList.add('focus-visible');
  });

  card.addEventListener('blur', () => {
    card.classList.remove('focus-visible');
  });

  const readMoreLink = card.querySelector('.read-more');
  readMoreLink.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.location.hash = `#/stories/${story.id}`;
    }
  });

  return card;
};