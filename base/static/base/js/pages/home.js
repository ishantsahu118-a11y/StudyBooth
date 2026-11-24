// StudyLimitless - Home Page JavaScript
// Stat counter animation, smooth scroll

document.addEventListener('DOMContentLoaded', function() {
    // Animate stats on scroll
    const statItems = document.querySelectorAll('.stat-value[data-target]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const targetValue = parseFloat(target.dataset.target);
                const suffix = target.textContent.includes('%') ? '%' : '';
                animateValue(target, 0, targetValue, 2000, suffix);
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    statItems.forEach(item => observer.observe(item));

    function animateValue(element, start, end, duration, suffix) {
        const startTime = performance.now();
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * eased);
            element.textContent = current + suffix;
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});