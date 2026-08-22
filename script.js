// GANTI KEDUA NILAI INI DENGAN MILIK ANDA DARI DASHBOARD SUPABASE
const supabaseUrl = 'https://vsrtyvayfjvouaswhhrn.supabase.co';
const supabaseKey = 'sb_publishable_4yp5J8oqkdj_KPv_Il_moQ_TEfWNuBR';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    // Ganti ini dengan email yang Anda daftarkan di Supabase
    const ADMIN_EMAIL = 'farizyrh@gmail.com';
    const GUEST_EMAIL = 'tamu@buku.com'; // Email akun tamu Anda

    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');
    const logoutBtn = document.getElementById('logoutBtn');
    const contentArea = document.getElementById('content-area');
    
    // Elemen Editor
    const titleInput = document.getElementById('titleInput');
    const contentInput = document.getElementById('contentInput');
    const saveBtn = document.getElementById('saveBtn');
    const editorErrorMsg = document.getElementById('editorErrorMsg');
    const backBtn = document.getElementById('backBtn');

    // Cek di halaman mana kita berada
    const isLoginPage = !!passwordInput;
    const isReaderPage = !!contentArea;
    const isEditorPage = !!titleInput;

    // Cek status sesi (apakah user sudah login?)
    const { data: { session } } = await supabaseClient.auth.getSession();

    // --- Proteksi Halaman ---
    if (isLoginPage && session) {
        window.location.href = 'chapters.html';
        return;
    }
    if ((isReaderPage || isEditorPage) && !session) {
        window.location.href = 'index.html';
        return;
    }
    
    // Proteksi Ekstra: Jika Tamu mencoba masuk ke halaman editor, tendang!
    if (isEditorPage && session && session.user.email !== ADMIN_EMAIL) {
        window.location.href = 'chapters.html';
        return;
    }

    // --- Logika Halaman Login ---
    if (isLoginPage) {
        const handleLogin = async () => {
            const password = passwordInput.value;

            if (!password) return;

            loginBtn.textContent = 'Memuat...';
            loginBtn.disabled = true;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: ADMIN_EMAIL,
                password: password,
            });

            if (error) {
                // Coba login sebagai Tamu
                const { error: guestError } = await supabaseClient.auth.signInWithPassword({
                    email: GUEST_EMAIL,
                    password: password,
                });
                
                if (guestError) {
                    errorMsg.textContent = 'Kata sandi salah.';
                    errorMsg.classList.add('show');
                    setTimeout(() => errorMsg.classList.remove('show'), 3000);

                    loginBtn.textContent = 'Buka';
                    loginBtn.disabled = false;
                } else {
                    window.location.href = 'chapters.html';
                }
            } else {
                window.location.href = 'chapters.html';
            }
        };

        loginBtn.addEventListener('click', handleLogin);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    // --- Logika Halaman Reader (Chapters) ---
    if (isReaderPage) {
        // Sembunyikan tombol Tulis Baru jika bukan Admin
        const newJournalBtn = document.getElementById('newJournalBtn');
        if (newJournalBtn && session && session.user.email !== ADMIN_EMAIL) {
            newJournalBtn.style.display = 'none';
        }

        // Tombol Logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'index.html';
            });
        }
        
        // Mobile Sidebar Toggle
        const sidebar = document.getElementById('sidebar');
        const openSidebarBtn = document.getElementById('openSidebarBtn');
        const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        
        if (openSidebarBtn && sidebar) {
            openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
        }
        if (toggleSidebarBtn && sidebar) {
            toggleSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
        }

        const deleteJournal = async (id) => {
            if (!confirm('Yakin ingin menghapus bab ini?')) return;
            const { error } = await supabaseClient.from('jurnal').delete().eq('id', id);
            if (error) alert('Gagal menghapus: ' + error.message);
            else window.location.reload();
        };

        const moveJournal = async (currentIndex, dir, jurnalsList) => {
            const targetIndex = currentIndex + dir;
            if (targetIndex < 0 || targetIndex >= jurnalsList.length) return;
            
            contentArea.innerHTML = '<p class="loading">Menyimpan urutan...</p>';
            
            for (let i = 0; i < jurnalsList.length; i++) {
                jurnalsList[i].new_order = i * 10;
            }
            
            const temp = jurnalsList[currentIndex].new_order;
            jurnalsList[currentIndex].new_order = jurnalsList[targetIndex].new_order;
            jurnalsList[targetIndex].new_order = temp;
            
            let hasError = false;
            let errorMsg = '';
            for (const j of jurnalsList) {
                const { error } = await supabaseClient.from('jurnal').update({ order_index: j.new_order }).eq('id', j.id);
                if (error) {
                    hasError = true;
                    errorMsg = error.message;
                }
            }
            
            if (hasError) {
                alert('Gagal menyimpan urutan: ' + errorMsg + '\n\nPastikan Anda sudah:\n1. Membuat kolom "order_index" (tipe integer) di tabel jurnal.\n2. Menambahkan RLS Policy untuk operasi UPDATE.');
            }
            window.location.reload();
        };

        // UI Elements
        const chapterListEl = document.getElementById('chapter-list');
        const chapterNav = document.getElementById('chapter-navigation');
        const prevBtn = document.getElementById('prevChapterBtn');
        const nextBtn = document.getElementById('nextChapterBtn');
        
        let allJurnals = [];
        let currentChapterIndex = 0;

        const renderChapterContent = (index) => {
            if (allJurnals.length === 0) return;
            
            currentChapterIndex = index;
            const jurnal = allJurnals[index];
            
            // Render text
            contentArea.innerHTML = '';
            const article = document.createElement('article');
            const title = document.createElement('h2');
            title.textContent = jurnal.judul;
            article.appendChild(title);
            
            const content = document.createElement('div');
            content.innerHTML = marked.parse(jurnal.konten_markdown);
            article.appendChild(content);
            contentArea.appendChild(article);
            
            // Update Navigation Buttons
            chapterNav.style.display = 'flex';
            prevBtn.disabled = currentChapterIndex === 0;
            nextBtn.disabled = currentChapterIndex === allJurnals.length - 1;
            
            // Scroll to top of content
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Update active state in sidebar
            document.querySelectorAll('.chapter-item').forEach((item, idx) => {
                if (idx === currentChapterIndex) item.classList.add('active');
                else item.classList.remove('active');
            });
            
            // Auto-close sidebar on mobile after clicking
            if (window.innerWidth <= 992) {
                sidebar.classList.remove('open');
            }
        };

        // Prev & Next Events
        prevBtn.addEventListener('click', () => {
            if (currentChapterIndex > 0) renderChapterContent(currentChapterIndex - 1);
        });
        nextBtn.addEventListener('click', () => {
            if (currentChapterIndex < allJurnals.length - 1) renderChapterContent(currentChapterIndex + 1);
        });

        // Fetch data dari tabel 'jurnal'
        try {
            const { data: jurnals, error } = await supabaseClient
                .from('jurnal')
                .select('*')
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: true }); 

            if (error) throw error;
            allJurnals = jurnals || [];

            if (allJurnals.length === 0) {
                chapterListEl.innerHTML = '<p style="text-align:center; color: #9ca3af; font-size: 0.9rem;">Belum ada bab.</p>';
                contentArea.innerHTML = '<div style="text-align:center; padding: 2rem;">Belum ada jurnal yang ditulis.</div>';
                return;
            }

            chapterListEl.innerHTML = '';
            allJurnals.forEach((jurnal, index) => {
                const item = document.createElement('div');
                item.className = 'chapter-item';
                
                const titleBtn = document.createElement('button');
                titleBtn.className = 'chapter-title-btn';
                titleBtn.textContent = jurnal.judul;
                titleBtn.onclick = () => renderChapterContent(index);
                item.appendChild(titleBtn);
                
                // Admin Controls in Sidebar
                if (session && session.user.email === ADMIN_EMAIL) {
                    const controls = document.createElement('div');
                    controls.className = 'chapter-admin-controls';

                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Edit';
                    editBtn.className = 'action-btn';
                    editBtn.onclick = () => window.location.href = `editor.html?id=${jurnal.id}`;

                    const upBtn = document.createElement('button');
                    upBtn.textContent = '↑ Naik';
                    upBtn.className = 'action-btn';
                    upBtn.disabled = index === 0;
                    upBtn.onclick = () => moveJournal(index, -1, allJurnals);

                    const downBtn = document.createElement('button');
                    downBtn.textContent = '↓ Turun';
                    downBtn.className = 'action-btn';
                    downBtn.disabled = index === allJurnals.length - 1;
                    downBtn.onclick = () => moveJournal(index, 1, allJurnals);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Hapus';
                    deleteBtn.className = 'action-btn delete-btn';
                    deleteBtn.onclick = () => deleteJournal(jurnal.id);

                    controls.appendChild(upBtn);
                    controls.appendChild(downBtn);
                    controls.appendChild(editBtn);
                    controls.appendChild(deleteBtn);
                    item.appendChild(controls);
                }
                
                chapterListEl.appendChild(item);
            });
            
            // Render first chapter by default
            renderChapterContent(0);

        } catch (error) {
            chapterListEl.innerHTML = '<p style="color: #ef4444; font-size: 0.8rem;">Gagal memuat daftar isi.</p>';
            contentArea.innerHTML = `
                <div style="text-align:center; color: #ef4444; font-family: Inter, sans-serif;">
                    <p>Oops, gagal memuat konten dari database.</p>
                    <p style="font-size: 0.8rem; margin-top: 1rem; color: #94a3b8;">Error: ${error.message}</p>
                </div>`;
        }
    }

    // --- Logika Halaman Editor ---
    if (isEditorPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('id');

        if (editId) {
            document.querySelector('h2').textContent = 'Edit Jurnal';
            saveBtn.textContent = 'Memuat data...';
            saveBtn.disabled = true;
            
            supabaseClient.from('jurnal').select('*').eq('id', editId).single().then(({ data: existing, error }) => {
                if (existing) {
                    titleInput.value = existing.judul;
                    contentInput.value = existing.konten_markdown;
                }
                saveBtn.textContent = 'Simpan Jurnal';
                saveBtn.disabled = false;
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'chapters.html';
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const judul = titleInput.value.trim();
                const konten = contentInput.value.trim();

                if (!judul || !konten) {
                    editorErrorMsg.textContent = 'Judul dan konten tidak boleh kosong!';
                    return;
                }

                saveBtn.textContent = 'Menyimpan...';
                saveBtn.disabled = true;
                editorErrorMsg.textContent = '';

                let error;
                if (editId) {
                    const res = await supabaseClient.from('jurnal').update({ judul: judul, konten_markdown: konten }).eq('id', editId);
                    error = res.error;
                } else {
                    const res = await supabaseClient.from('jurnal').insert([{ judul: judul, konten_markdown: konten }]);
                    error = res.error;
                }

                if (error) {
                    editorErrorMsg.textContent = error.message;
                    saveBtn.textContent = 'Simpan Jurnal';
                    saveBtn.disabled = false;
                } else {
                    window.location.href = 'chapters.html';
                }
            });
        }
    }
});
