const mobileToggle = document.querySelector('.mobile-toggle');
const navbar = document.querySelector('.navbar');

if (mobileToggle && navbar) {
    mobileToggle.addEventListener('click', () => {
        navbar.classList.toggle('mobile-open');
    });
}

document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
        if (navbar) navbar.classList.remove('mobile-open');
    });
});

document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        const wasActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach((faq) => faq.classList.remove('active'));
        if (!wasActive) item.classList.add('active');
    });
});

const revealItems = document.querySelectorAll('.reveal, .pricing-card');
if (revealItems.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((item) => observer.observe(item));
}

if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.style.borderBottomColor = window.scrollY > 36 ? 'var(--border-hover)' : 'var(--border)';
    });
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') {
            event.preventDefault();
            return;
        }

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        const navHeight = navbar ? navbar.offsetHeight : 0;
        window.scrollTo({
            top: target.offsetTop - navHeight - 16,
            behavior: 'smooth'
        });
    });
});

const config = window.ECOM_SUPABASE_CONFIG || {};
const canAuth = !!window.supabase?.createClient && !!config.url && !!config.anonKey;
let supabaseClient = null;

if (canAuth) {
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
}

async function redirectForPlanActivation() {
    if (!supabaseClient) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        window.location.href = session?.user ? 'dashboard.html' : 'login.html';
    } catch {
        window.location.href = 'login.html';
    }
}

document.querySelectorAll('.activate-plan').forEach((button) => {
    button.addEventListener('click', redirectForPlanActivation);
});
