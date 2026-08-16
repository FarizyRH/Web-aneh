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
            
            for (const j of jurnalsList) {
                await supabaseClient.from('jurnal').update({ order_index: j.new_order }).eq('id', j.id);
            }
            window.location.reload();
        };

        // Fetch data dari tabel 'jurnal'
        try {
            const { data: jurnals, error } = await supabaseClient
                .from('jurnal')
                .select('*')
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: true }); 

            if (error) throw error;

            if (jurnals.length === 0) {
                contentArea.innerHTML = '<div style="text-align:center; padding: 2rem;">Belum ada jurnal yang ditulis.</div>';
                return;
            }

            contentArea.innerHTML = '';
            jurnals.forEach((jurnal, index) => {
                const article = document.createElement('article');
                article.style.marginBottom = '3rem';

                const title = document.createElement('h2');
                title.textContent = jurnal.judul;
                
                article.appendChild(title);
                
                // Admin Controls
                if (session && session.user.email === ADMIN_EMAIL) {
                    const controls = document.createElement('div');
                    controls.style.display = 'flex';
                    controls.style.gap = '8px';
                    controls.style.marginBottom = '1.5rem';

                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Edit';
                    editBtn.className = 'action-btn';
                    editBtn.onclick = () => window.location.href = `editor.html?id=${jurnal.id}`;

                    const upBtn = document.createElement('button');
                    upBtn.textContent = '↑ Naik';
                    upBtn.className = 'action-btn';
                    upBtn.disabled = index === 0;
                    upBtn.onclick = () => moveJournal(index, -1, jurnals);

                    const downBtn = document.createElement('button');
                    downBtn.textContent = '↓ Turun';
                    downBtn.className = 'action-btn';
                    downBtn.disabled = index === jurnals.length - 1;
                    downBtn.onclick = () => moveJournal(index, 1, jurnals);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Hapus';
                    deleteBtn.className = 'action-btn delete-btn';
                    deleteBtn.style.marginLeft = 'auto';
                    deleteBtn.onclick = () => deleteJournal(jurnal.id);

                    controls.appendChild(editBtn);
                    controls.appendChild(upBtn);
                    controls.appendChild(downBtn);
                    controls.appendChild(deleteBtn);
                    article.appendChild(controls);
                }

                const content = document.createElement('div');
                content.innerHTML = marked.parse(jurnal.konten_markdown);
                
                article.appendChild(content);
                contentArea.appendChild(article);
            });

        } catch (error) {
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
