// ===== Supabase Auth =====
const supabaseConfig = window.ECOM_SUPABASE_CONFIG || {};
const SUPABASE_URL = supabaseConfig.url;
const SUPABASE_ANON_KEY = supabaseConfig.anonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert('Missing Supabase config. Please update supabase-config.js');
    throw new Error('Supabase config missing');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Auth UI elements =====
const authModal     = document.getElementById('auth-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const openLoginBtn  = document.getElementById('open-login-btn');
const openSignupBtn = document.getElementById('open-signup-btn');
const logoutBtn     = document.getElementById('logout-btn');
const navAuthGuest  = document.getElementById('nav-auth-guest');
const navAuthUser   = document.getElementById('nav-auth-user');
const navUserEmail  = document.getElementById('nav-user-email');
const loginForm     = document.getElementById('login-form');
const signupForm    = document.getElementById('signup-form');
const loginError    = document.getElementById('login-error');
const signupError   = document.getElementById('signup-error');
const signupSuccess = document.getElementById('signup-success');
const modalTabs     = document.querySelectorAll('.modal-tab');

function openModal(tab) {
    authModal.classList.add('open');
    switchTab(tab);
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    authModal.classList.remove('open');
    document.body.style.overflow = '';
    loginError.textContent = '';
    signupError.textContent = '';
    signupSuccess.textContent = '';
    loginForm.reset();
    signupForm.reset();
}

function switchTab(tab) {
    modalTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    loginForm.style.display  = tab === 'login'  ? 'block' : 'none';
    signupForm.style.display = tab === 'signup' ? 'block' : 'none';
}

function updateNavForUser(user) {
    if (user) {
        navAuthGuest.style.display = 'none';
        navAuthUser.style.display  = 'flex';
        navUserEmail.textContent   = user.email;
    } else {
        navAuthGuest.style.display = 'flex';
        navAuthUser.style.display  = 'none';
        navUserEmail.textContent   = '';
    }
}

// Open modal — use IDs directly, not anchor href matching
openLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal('login');
});

openSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal('signup');
});

modalCloseBtn.addEventListener('click', closeModal);

authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
});

// Tab switching
modalTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// Login submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    signupError.textContent = '';
    signupSuccess.textContent = '';
    const btn = document.getElementById('login-submit-btn');
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: document.getElementById('login-email').value.trim(),
            password: document.getElementById('login-password').value,
        });

        if (error) {
            loginError.textContent = error.message;
            return;
        }

        window.location.href = 'dashboard.html';
    } catch (error) {
        loginError.textContent = error?.message || 'Unable to sign in right now. Please try again.';
    } finally {
        btn.textContent = 'Log In';
        btn.disabled = false;
    }
});

// Signup submit
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent   = '';
    signupSuccess.textContent = '';
    const btn = document.getElementById('signup-submit-btn');
    btn.textContent = 'Creating account...';
    btn.disabled = true;
    const password = document.getElementById('signup-password').value;

    if (password.length < 6) {
        signupError.textContent = 'Password must be at least 6 characters.';
        btn.textContent = 'Create Account';
        btn.disabled = false;
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: document.getElementById('signup-email').value.trim(),
            password,
        });

        if (error) {
            signupError.textContent = error.message;
            return;
        }

        if (data?.session) {
            window.location.href = 'dashboard.html';
            return;
        }

        signupSuccess.textContent = 'Account created! Check your email to confirm, then log in.';
        signupForm.reset();
        switchTab('login');
    } catch (error) {
        signupError.textContent = error?.message || 'Unable to create account right now. Please try again.';
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    updateNavForUser(null);
});

// Auth state
supabase.auth.onAuthStateChange((event, session) => {
    updateNavForUser(session?.user ?? null);

    if (event === 'SIGNED_IN' && session?.user) {
        window.location.href = 'dashboard.html';
    }
});

// Session on load
supabase.auth.getSession().then(({ data: { session } }) => {
    updateNavForUser(session?.user ?? null);

    if (session?.user) {
        window.location.href = 'dashboard.html';
    }
});

// Hook pricing/hero "Get Started" buttons to open signup modal
document.querySelectorAll('a.btn').forEach(btn => {
    const text = btn.textContent.trim();
    if (text === 'Get Started' || text === 'Start Building' || text === 'Get Started Now') {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal('signup');
        });
    }
});

// ===== Mobile menu =====
const mobileToggle = document.querySelector('.mobile-toggle');
const navbar = document.querySelector('.navbar');

mobileToggle.addEventListener('click', () => {
    navbar.classList.toggle('mobile-open');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navbar.classList.remove('mobile-open');
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
window.addEventListener('scroll', () => {
    navbar.style.borderBottomColor = window.scrollY > 50
        ? 'var(--border-hover)'
        : 'var(--border)';
});

// ===== Smooth scroll (skip modal-trigger buttons) =====
const MODAL_BTN_IDS = ['open-login-btn', 'open-signup-btn'];

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    // Skip buttons that open the modal
    if (MODAL_BTN_IDS.includes(anchor.id)) return;

    anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') { e.preventDefault(); return; }

        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const navHeight = navbar.offsetHeight;
            window.scrollTo({
                top: target.offsetTop - navHeight - 20,
                behavior: 'smooth'
            });
        }
    });
});
