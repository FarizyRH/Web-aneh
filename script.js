document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');
    const logoutBtn = document.getElementById('logoutBtn');
    const contentArea = document.getElementById('content-area');

    // Cek di halaman mana kita berada
    const isLoginPage = !!passwordInput;
    const isReaderPage = !!contentArea;

    // Kredensial rahasia
    const SECRET_PASSWORD = 'bukufariz';

    // --- Logika Halaman Login ---
    if (isLoginPage) {
        // Cek kalau sudah login, langsung lempar ke chapter
        if (sessionStorage.getItem('isAuthenticated') === 'true') {
            window.location.href = 'chapters.html';
        }

        const handleLogin = () => {
            const val = passwordInput.value;
            if (val === SECRET_PASSWORD) {
                sessionStorage.setItem('isAuthenticated', 'true');
                window.location.href = 'chapters.html';
            } else {
                errorMsg.classList.add('show');
                passwordInput.value = '';
                setTimeout(() => errorMsg.classList.remove('show'), 3000);
            }
        };

        loginBtn.addEventListener('click', handleLogin);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    // --- Logika Halaman Reader (Chapters) ---
    if (isReaderPage) {
        // Proteksi Halaman
        if (sessionStorage.getItem('isAuthenticated') !== 'true') {
            window.location.href = 'index.html';
        }

        // Tombol Logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('isAuthenticated');
                window.location.href = 'index.html';
            });
        }

        // Fetch dan Render Markdown
        fetch('isi.md')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Gagal mengambil file isi.md (Mungkin karena batasan file lokal)');
                }
                return response.text();
            })
            .then(markdown => {
                // Parsing markdown ke HTML menggunakan Marked.js
                contentArea.innerHTML = marked.parse(markdown);
            })
            .catch(error => {
                contentArea.innerHTML = `
                    <div style="text-align:center; color: #ef4444; font-family: Inter, sans-serif;">
                        <p>Oops, gagal memuat konten.</p>
                        <p style="font-size: 0.9rem; margin-top: 1rem;">Pastikan Anda membuka website ini menggunakan <b>Live Server</b> (di VS Code) atau web server lokal lainnya, karena browser biasanya memblokir akses file lokal (CORS) jika diakses secara langsung.</p>
                        <p style="font-size: 0.8rem; margin-top: 1rem; color: #94a3b8;">Error: ${error.message}</p>
                    </div>`;
            });
    }
});
