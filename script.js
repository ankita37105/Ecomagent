// ===== Mobile menu =====
const mobileToggle = document.querySelector('.mobile-toggle');
const navbar = document.querySelector('.navbar');

if (mobileToggle && navbar) {
    mobileToggle.addEventListener('click', () => {
        navbar.classList.toggle('mobile-open');
    });
}

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        if (navbar) navbar.classList.remove('mobile-open');
    });
});

// ===== FAQ accordion =====
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const item = button.parentElement;
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('active'));
        if (!isActive) item.classList.add('active');
    });
});

// ===== Scroll reveal =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), index * 100);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.feature-card, .model-card, .pricing-card, .faq-item').forEach(el => {
    observer.observe(el);
});

// ===== Navbar scroll =====
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.style.borderBottomColor = window.scrollY > 50
            ? 'var(--border-hover)'
            : 'var(--border)';
    });
}

// ===== Smooth scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') {
            e.preventDefault();
            return;
        }

        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const navHeight = navbar ? navbar.offsetHeight : 0;
            window.scrollTo({
                top: target.offsetTop - navHeight - 20,
                behavior: 'smooth'
            });
        }
    });
});
