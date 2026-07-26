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
}



document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
});

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
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

        // fade out
        audioIcon.style.opacity = "0";

        setTimeout(() => {
            isMuted = !isMuted;

            audioIcon.src = isMuted
                ? "assets/icons/Audio-off.png"
                : "assets/icons/Audio.png";

            // fade in
            audioIcon.style.opacity = "1";
        }, 150);
    });
});
