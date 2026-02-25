// ===== Supabase Auth =====
const SUPABASE_URL = 'https://zwggawnojtjiaklycfhc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3Z2dhd25vanRqaWFrbHljZmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzU3NDUsImV4cCI6MjA4NzYxMTc0NX0.-pQHomLNGWL7OvQpHL2_7T_NwI4wAzyNYMOknX_YJSE';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authModal = document.getElementById('auth-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const openLoginBtn = document.getElementById('open-login-btn');
const openSignupBtn = document.getElementById('open-signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const navAuthGuest = document.getElementById('nav-auth-guest');
const navAuthUser = document.getElementById('nav-auth-user');
const navUserEmail = document.getElementById('nav-user-email');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const signupSuccess = document.getElementById('signup-success');
const modalTabs = document.querySelectorAll('.modal-tab');

function openModal(tab) {
    authModal.classList.add('open');
    switchTab(tab);
}

function closeModal() {
    authModal.classList.remove('open');
    loginError.textContent = '';
    signupError.textContent = '';
    signupSuccess.textContent = '';
    loginForm.reset();
    signupForm.reset();
}

function switchTab(tab) {
    modalTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    loginForm.style.display = tab === 'login' ? 'block' : 'none';
    signupForm.style.display = tab === 'signup' ? 'block' : 'none';
}

function updateNavForUser(user) {
    if (user) {
        navAuthGuest.style.display = 'none';
        navAuthUser.style.display = 'flex';
        navUserEmail.textContent = user.email;
    } else {
        navAuthGuest.style.display = 'flex';
        navAuthUser.style.display = 'none';
        navUserEmail.textContent = '';
    }
}

// Open modal buttons
openLoginBtn.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });
openSignupBtn.addEventListener('click', (e) => { e.preventDefault(); openModal('signup'); });
modalCloseBtn.addEventListener('click', closeModal);
authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(); });

// Tab switching
modalTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const btn = document.getElementById('login-submit-btn');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
    });

    btn.textContent = 'Log In';
    btn.disabled = false;

    if (error) {
        loginError.textContent = error.message;
    } else {
        closeModal();
    }
});

// Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';
    signupSuccess.textContent = '';
    const btn = document.getElementById('signup-submit-btn');
    btn.textContent = 'Creating account...';
    btn.disabled = true;

    const { error } = await supabase.auth.signUp({
        email: document.getElementById('signup-email').value,
        password: document.getElementById('signup-password').value,
    });

    btn.textContent = 'Create Account';
    btn.disabled = false;

    if (error) {
        signupError.textContent = error.message;
    } else {
        signupSuccess.textContent = 'Account created! Check your email to confirm.';
        signupForm.reset();
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// Auth state listener
supabase.auth.onAuthStateChange((_event, session) => {
    updateNavForUser(session?.user ?? null);
});

// Check session on load
supabase.auth.getSession().then(({ data: { session } }) => {
    updateNavForUser(session?.user ?? null);
});

// ===== Mobile menu toggle
const mobileToggle = document.querySelector('.mobile-toggle');
const navbar = document.querySelector('.navbar');

mobileToggle.addEventListener('click', () => {
    navbar.classList.toggle('mobile-open');
});

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navbar.classList.remove('mobile-open');
    });
});

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const item = button.parentElement;
        const isActive = item.classList.contains('active');

        // Close all
        document.querySelectorAll('.faq-item').forEach(faq => {
            faq.classList.remove('active');
        });

        // Open clicked (if it wasn't already open)
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// Scroll reveal animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            // Stagger the animation
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .model-card, .pricing-card, .faq-item').forEach(el => {
    observer.observe(el);
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.borderBottomColor = 'var(--border-hover)';
    } else {
        navbar.style.borderBottomColor = 'var(--border)';
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const navHeight = navbar.offsetHeight;
            const targetPosition = target.offsetTop - navHeight - 20;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});
