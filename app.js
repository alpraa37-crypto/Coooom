import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBCJETdj6xlMQ07_GogGU7YkrxivUCaLF8",
    authDomain: "ggni-cec3b.firebaseapp.com",
    projectId: "ggni-cec3b",
    storageBucket: "ggni-cec3b.appspot.com",
    messagingSenderId: "990604244114",
    appId: "1:990604244114:web:9310948c26ecb3037b224b",
    measurementId: "G-L862VHWGXV"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();
const storage = getStorage();
const db = getFirestore();

// DOM Elements
const loginDiv = document.getElementById('loginDiv');
const dashboard = document.getElementById('dashboard');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const emailLoginBtn = document.getElementById('emailLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginMsg = document.getElementById('loginMsg');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const fileDesc = document.getElementById('fileDesc');
const uploadMsg = document.getElementById('uploadMsg');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const fileListDiv = document.getElementById('fileList');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const totalFiles = document.getElementById('totalFiles');
const totalSize = document.getElementById('totalSize');
const uploadCount = document.getElementById('uploadCount');

// Show dashboard if user logged in
auth.onAuthStateChanged(user => {
    if (user) {
        loginDiv.style.display = 'none';
        dashboard.style.display = 'block';
        
        // تحديث معلومات المستخدم
        updateUserInfo(user);
        loadFiles();
    } else {
        loginDiv.style.display = 'block';
        dashboard.style.display = 'none';
    }
});

// Google Login
googleLoginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .catch(err => { 
            showMessage(loginMsg, err.message, 'danger');
        });
});

// Email Login
emailLoginBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showMessage(loginMsg, 'يرجى إدخال البريد الإلكتروني وكلمة المرور', 'danger');
        return;
    }
    
    signInWithEmailAndPassword(auth, email, password)
        .catch(err => { 
            showMessage(loginMsg, err.message, 'danger');
        });
});

// Logout
logoutBtn.addEventListener('click', () => { 
    signOut(auth); 
});

// Upload file
uploadBtn.addEventListener('click', async () => {
    if (fileInput.files.length === 0) { 
        showMessage(uploadMsg, 'يرجى اختيار ملف أولاً', 'danger');
        return;
    }
    
    const file = fileInput.files[0];
    const desc = fileDesc.value;

    // إظهار شريط التقدم
    uploadProgress.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    
    const storageRef = ref(storage, 'files/' + Date.now() + '-' + file.name);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = `${Math.round(progress)}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }, 
        (error) => { 
            showMessage(uploadMsg, error.message, 'danger');
            uploadProgress.style.display = 'none';
        },
        async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, 'files'), {
                name: file.name,
                url: url,
                description: desc,
                date: new Date().toLocaleString('ar-SA'),
                size: file.size,
                type: file.type,
                userId: auth.currentUser.uid
            });
            
            showMessage(uploadMsg, 'تم رفع الملف بنجاح!', 'success');
            uploadProgress.style.display = 'none';
            
            fileInput.value = '';
            fileDesc.value = '';
            loadFiles();
            
            // إخفاء الرسالة بعد 3 ثوانٍ
            setTimeout(() => {
                uploadMsg.style.display = 'none';
            }, 3000);
        }
    );
});

// Load files
async function loadFiles() {
    fileListDiv.innerHTML = '';
    const querySnapshot = await getDocs(collection(db, 'files'));
    
    // تحديث الإحصائيات
    let fileCount = 0;
    let totalStorage = 0;
    
    if (querySnapshot.empty) {
        fileListDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>لا توجد ملفات مرفوعة بعد</h3>
                <p>ابدأ برفع أول ملف لك باستخدام الأداة أعلاه</p>
            </div>
        `;
    } else {
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            fileCount++;
            if (data.size) totalStorage += data.size;
            
            const fileIcon = getFileIcon(data.name, data.type);
            
            const div = document.createElement('div');
            div.className = 'file-item fade-in';
            div.innerHTML = `
                <div class="file-info">
                    <div class="file-name">
                        <div class="file-icon ${fileIcon.class}">
                            <i class="${fileIcon.icon}"></i>
                        </div>
                        ${data.name}
                    </div>
                    <div class="file-desc">${data.description || 'لا يوجد وصف'}</div>
                    <div class="file-meta">
                        <span><i class="far fa-calendar-alt"></i> ${data.date}</span>
                        ${data.size ? `<span><i class="fas fa-weight-hanging"></i> ${formatFileSize(data.size)}</span>` : ''}
                    </div>
                </div>
                <div class="file-actions">
                    <a href="${data.url}" target="_blank" class="file-link">
                        <i class="fas fa-download"></i> تحميل
                    </a>
                    <button class="btn btn-danger" onclick="deleteFile('${docSnap.id}', '${data.name}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            `;
            fileListDiv.appendChild(div);
        });
    }
    
    // تحديث الإحصائيات
    updateStats(fileCount, totalStorage);
}

// Delete file
async function deleteFile(id, name) {
    if (confirm('هل أنت متأكد من حذف هذا الملف؟')) {
        const fileRef = ref(storage, 'files/' + name);
        await deleteObject(fileRef).catch(err => console.log(err));
        await deleteDoc(doc(db, 'files', id));
        loadFiles();
    }
}

// تنسيق حجم الملف
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// عرض رسائل للمستخدم
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    
    if (type === 'danger') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// الحصول على أيقونة الملف المناسبة
function getFileIcon(filename, fileType) {
    const ext = filename.split('.').pop().toLowerCase();
    
    if (fileType && fileType.startsWith('image/')) {
        return { class: 'file-img', icon: 'fas fa-image' };
    } else if (ext === 'pdf') {
        return { class: 'file-pdf', icon: 'fas fa-file-pdf' };
    } else if (['doc', 'docx'].includes(ext)) {
        return { class: 'file-doc', icon: 'fas fa-file-word' };
    } else if (['xls', 'xlsx'].includes(ext)) {
        return { class: 'file-xls', icon: 'fas fa-file-excel' };
    } else if (['zip', 'rar', '7z'].includes(ext)) {
        return { class: 'file-zip', icon: 'fas fa-file-archive' };
    } else {
        return { class: 'file-default', icon: 'fas fa-file' };
    }
}

// تحديث معلومات المستخدم
function updateUserInfo(user) {
    if (user.displayName) {
        userName.textContent = user.displayName;
        userAvatar.textContent = user.displayName.charAt(0).toUpperCase();
    } else {
        userName.textContent = user.email.split('@')[0];
        userAvatar.textContent = user.email.charAt(0).toUpperCase();
    }
    userEmail.textContent = user.email;
}

// تحديث الإحصائيات
function updateStats(fileCount, totalStorage) {
    totalFiles.textContent = fileCount;
    totalSize.textContent = formatFileSize(totalStorage);
    uploadCount.textContent = fileCount;
}

// جعل الدوال متاحة عالمياً للاستخدام في الأحداث
window.deleteFile = deleteFile;
