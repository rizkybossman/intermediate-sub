export const StoryCard = (story) => {
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

  card.innerHTML = `
    <img src="${story.photoUrl}" 
         alt="Story image by ${story.name}" 
         class="story-image"
         loading="lazy"
         width="300"
         height="200">
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

  // Add this to the StoryCard component
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