function initCarousel(wrapper) {
    const track = wrapper.querySelector('.project-grid');
    const prevBtn = wrapper.querySelector('.proj-arrow.prev');
    const nextBtn = wrapper.querySelector('.proj-arrow.next');
    if (!track) return null;

    let isDown = false;
    let dragged = false;
    let startX = 0;
    let startScroll = 0;

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
        track.classList.add('dragging');
        track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        const delta = e.clientX - startX;
        if (Math.abs(delta) > 4) dragged = true;
        track.scrollLeft = startScroll - delta;
    });

    const endDrag = () => {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('dragging');
        updateArrows();
    };

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    track.addEventListener('click', (e) => {
        if (dragged) {
            e.preventDefault();
            e.stopPropagation();
            dragged = false;
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
}

document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
});

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
            btn.textContent = '✓';
            setTimeout(() => btn.textContent = '⧉', 1200);
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
