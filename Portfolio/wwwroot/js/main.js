function initCarousel(wrapper) {
    const track = wrapper.querySelector('.project-grid');
    const prevBtn = wrapper.querySelector('.proj-arrow.prev');
    const nextBtn = wrapper.querySelector('.proj-arrow.next');
    if (!track) return null;

    let isDown = false;
    let dragged = false;
    let startX = 0;
    let startScroll = 0;
    let pressedCard = null;

    const maxScroll = () => track.scrollWidth - track.clientWidth;

    const updateArrows = () => {
        const max = maxScroll();
        prevBtn?.classList.toggle('disabled', track.scrollLeft <= 1);
        nextBtn?.classList.toggle('disabled', track.scrollLeft >= max - 1);
    };

    const scrollByCard = (dir) => {
        const card = track.querySelector('.project-card:not(.hidden)');
        const cardWidth = card ? card.getBoundingClientRect().width : track.clientWidth;
        const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0');
        track.scrollBy({ left: dir * (cardWidth + gap), behavior: 'smooth' });
    };

    prevBtn?.addEventListener('click', () => scrollByCard(-1));
    nextBtn?.addEventListener('click', () => scrollByCard(1));

    track.addEventListener('scroll', () => requestAnimationFrame(updateArrows));
    window.addEventListener('resize', () => requestAnimationFrame(updateArrows));

    track.addEventListener('pointerdown', (e) => {
        isDown = true;
        dragged = false;
        startX = e.clientX;
        startScroll = track.scrollLeft;
        pressedCard = e.target.closest('.project-card');
        track.classList.add('dragging');
        track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        const delta = e.clientX - startX;
        if (Math.abs(delta) > 4) dragged = true;
        track.scrollLeft = startScroll - delta;
    });

    const endDrag = (e) => {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('dragging');
        updateArrows();
        if (e && track.hasPointerCapture(e.pointerId)) {
            track.releasePointerCapture(e.pointerId);
        }
    };

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    track.addEventListener('click', (e) => {
        const card = pressedCard;
        pressedCard = null;

        if (dragged) {
            e.preventDefault();
            e.stopPropagation();
            dragged = false;
            return;
        }

        if (card) {
            e.preventDefault();
            e.stopPropagation();
            selectProjectCard(card);
        }
    }, true);

    updateArrows();

    return {
        recalc() {
            requestAnimationFrame(updateArrows);
        },
        refresh() {
            track.scrollTo({ left: 0, behavior: 'auto' });
            requestAnimationFrame(updateArrows);
        }
    };
}

const carousels = [...document.querySelectorAll('.project-grid-wrapper')]
    .map(initCarousel)
    .filter(Boolean);

function initDragScroll(track) {
    if (!track) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    track.addEventListener('pointerdown', (e) => {
        isDown = true;
        startX = e.clientX;
        startScroll = track.scrollLeft;
        track.classList.add('dragging');
        track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        track.scrollLeft = startScroll - (e.clientX - startX);
    });

    const endDrag = (e) => {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('dragging');
        if (e && track.hasPointerCapture(e.pointerId)) {
            track.releasePointerCapture(e.pointerId);
        }
    };

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
}

document.querySelectorAll('.skill-bubbles').forEach(initDragScroll);

function initFeaturedSlider(wrapper) {
    const slides = [...wrapper.querySelectorAll('.featured-slide')];
    const dots = [...wrapper.querySelectorAll('.featured-dot')];
    const prevBtn = wrapper.querySelector('.featured-arrow.prev');
    const nextBtn = wrapper.querySelector('.featured-arrow.next');

    let index = 0;
    let timer = null;

    const show = (i) => {
        if (!slides.length) return;
        index = (i + slides.length) % slides.length;
        slides.forEach((s, n) => s.classList.toggle('active', n === index));
        dots.forEach((d, n) => d.classList.toggle('active', n === index));
    };

    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
    };
    const start = () => {
        stop();
        if (slides.length > 1) timer = setInterval(() => show(index + 1), 4000);
    };

    prevBtn?.addEventListener('click', () => { show(index - 1); start(); });
    nextBtn?.addEventListener('click', () => { show(index + 1); start(); });
    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => { show(i); start(); });
    });

    wrapper.addEventListener('mouseenter', stop);
    wrapper.addEventListener('mouseleave', start);

    start();

    return { stop };
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

function renderFeaturedSlider(container, images, title) {
    const safeTitle = escapeHtml(title || '');
    let html = '';

    if (images.length > 1) {
        html += '<button type="button" class="featured-arrow prev" aria-label="Previous image">'
            + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '</button>';
    }

    html += '<div class="featured-slides">';
    if (images.length > 0) {
        html += images.map((src, i) => `<img class="featured-slide${i === 0 ? ' active' : ''}" src="${escapeHtml(src)}" alt="${safeTitle}" />`).join('');
    } else {
        html += '<span class="featured-img-fallback">'
            + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="10" r="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M4 17l5-5 3 3 3-3 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '</span>';
    }
    html += '</div>';

    if (images.length > 1) {
        html += '<button type="button" class="featured-arrow next" aria-label="Next image">'
            + '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '</button>';
        html += '<div class="featured-slider-dots">'
            + images.map((_, i) => `<button type="button" class="featured-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Show image ${i + 1}"></button>`).join('')
            + '</div>';
    }

    container.innerHTML = html;
}

let featuredSliderCtl = null;

document.querySelectorAll('#featuredSlider').forEach(el => {
    featuredSliderCtl = initFeaturedSlider(el);
});

let featuredLink = document.getElementById('featuredDemoBtn')?.dataset.link || '';
let featuredSourceLink = document.getElementById('featuredSourceBtn')?.dataset.link || '';

function setFeaturedProject(data) {
    const titleEl = document.getElementById('featuredTitle');
    const descEl = document.getElementById('featuredDesc');
    const tagsEl = document.getElementById('featuredTags');
    const sliderEl = document.getElementById('featuredSlider');
    const demoBtn = document.getElementById('featuredDemoBtn');
    const sourceBtn = document.getElementById('featuredSourceBtn');
    if (!titleEl || !descEl || !tagsEl || !sliderEl) return;

    titleEl.textContent = data.title || '';
    descEl.textContent = data.description || '';

    const tags = data.tags || [];
    tagsEl.innerHTML = tags.map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('');
    tagsEl.style.display = tags.length ? '' : 'none';

    featuredLink = data.link || '';
    if (demoBtn) demoBtn.style.display = featuredLink ? '' : 'none';

    featuredSourceLink = data.sourceLink || '';
    if (sourceBtn) sourceBtn.style.display = featuredSourceLink ? '' : 'none';

    featuredSliderCtl?.stop();
    renderFeaturedSlider(sliderEl, data.images || [], data.title);
    featuredSliderCtl = initFeaturedSlider(sliderEl);
}

document.getElementById('featuredDemoBtn')?.addEventListener('click', () => {
    if (featuredLink) window.open(featuredLink, '_blank', 'noopener');
});

document.getElementById('featuredSourceBtn')?.addEventListener('click', () => {
    if (featuredSourceLink) window.open(featuredSourceLink, '_blank', 'noopener');
});

function selectProjectCard(card) {
    if (!card) return;
    const raw = card.dataset.project;
    if (!raw) return;

    let data;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        return;
    }

    setFeaturedProject(data);
    document.querySelectorAll('.project-card').forEach(c => c.classList.remove('active-featured'));
    card.classList.add('active-featured');
}

document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
        e.preventDefault();
        selectProjectCard(card);
    });
});

function navigate(page) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.section').forEach(el => {
        el.classList.toggle('active', el.id === page);
    });
    const active = document.querySelector('.section.active');
    const titleEl = document.getElementById("pageTitle");

    if (active && titleEl) {
        titleEl.innerText = active.dataset.title || "";
    }
    if (active) active.scrollTop = 0;

    carousels.forEach(c => c.recalc());

    try {
        localStorage.setItem('activePage', page);
    } catch (e) { }
}

document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
});

(() => {
    let savedPage = null;
    try {
        savedPage = localStorage.getItem('activePage');
    } catch (e) { }

    if (savedPage && document.getElementById(savedPage)) {
        navigate(savedPage);
    }
})();

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.dataset.filter || 'All';
        document.querySelectorAll('.project-card').forEach(card => {
            const categories = (card.dataset.category || '').split(',').map(c => c.trim());
            const show = filter === 'All' || categories.includes(filter);
            card.classList.toggle('hidden', !show);
        });

        carousels.forEach(c => c.refresh());
    });
});

document.querySelectorAll('.contact-copy').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.previousElementSibling.querySelector('.ci-val').textContent;
        navigator.clipboard.writeText(val).then(() => {
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1200);
        });
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const audioIcon = document.getElementById("audio");
    let isMuted = false;

    audioIcon.addEventListener("click", () => {
        isMuted = !isMuted;
        audioIcon.classList.toggle("muted", isMuted);
    });
});
