import { supabase } from "./config.js";

// DOM Elements
let currentUser = null;
let allPostsData = []; // Store all posts data

// Check authentication and get user profile
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return null;
    }
    
    currentUser = user;
    
    let userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    document.getElementById('userEmail').textContent = userName;
    
    return user;
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// Create Post Button
document.getElementById('createPostBtn').addEventListener('click', () => {
    document.getElementById('postId').value = '';
    document.getElementById('postTitle').value = '';
    document.getElementById('postCategory').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('postImage').value = '';
    document.getElementById('deletePostBtn').style.display = 'none';
    document.getElementById('modalTitle').textContent = 'Create New Post';
    document.getElementById('submitBtnText').textContent = 'Publish Post';
    document.getElementById('postModal').style.display = 'flex';
});

// Cancel Post
document.getElementById('cancelPostBtn').addEventListener('click', () => {
    document.getElementById('postModal').style.display = 'none';
});

// Delete Post
document.getElementById('deletePostBtn').addEventListener('click', async () => {
    const postId = document.getElementById('postId').value;
    if (!postId || !confirm('Are you sure you want to delete this post?')) return;

    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUser.id);

    if (error) {
        alert('Error deleting post: ' + error.message);
    } else {
        alert('Post deleted successfully!');
        document.getElementById('postModal').style.display = 'none';
        loadPosts();
    }
});

// Handle Post Form Submission
document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitPostBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    const postId = document.getElementById('postId').value;
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value;
    const imageFile = document.getElementById('postImage').files[0];

    let imageUrl = null;

    // Upload image
    if (imageFile) {
        try {
            const fileName = `${currentUser.id}/${Date.now()}_${imageFile.name}`;
            const { error } = await supabase.storage
                .from('post-images')
                .upload(fileName, imageFile);

            if (!error) {
                const { data } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName);
                imageUrl = data.publicUrl;
            }
        } catch (err) {
            console.error(err);
        }
    }

    const postData = {
        user_id: currentUser.id,
        title,
        content,
        category,
        image_url: imageUrl,
        user_name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0]
    };

    let result;
    if (postId) {
        result = await supabase
            .from('posts')
            .update(postData)
            .eq('id', postId)
            .eq('user_id', currentUser.id);
    } else {
        result = await supabase
            .from('posts')
            .insert([postData]);
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    if (result.error) {
        alert('Error saving post: ' + result.error.message);
    } else {
        alert(postId ? 'Post updated!' : 'Post published!');
        document.getElementById('postModal').style.display = 'none';
        loadPosts();
    }
});

// Image Preview
document.getElementById('postImage').addEventListener('change', function() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';

    if (this.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.innerHTML = `<img src="${e.target.result}">`;
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// Truncate text to 4 lines
function truncateText(text, maxLines = 4) {
    const lines = text.split('\n');
    if (lines.length <= maxLines) {
        return text;
    }
    
    const truncatedLines = lines.slice(0, maxLines);
    return truncatedLines.join('\n') + '...';
}

// Load Posts
async function loadPosts(category = 'all') {
    const postsGrid = document.getElementById('postsGrid');

    let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (category !== 'all') query = query.eq('category', category);

    const { data: posts, error } = await query;
    if (error) return console.error(error);

    // Store all posts data globally
    allPostsData = posts;

    postsGrid.innerHTML = '';

    if (posts.length === 0) {
        postsGrid.innerHTML = `
            <div class="no-posts" style="grid-column: 1 / -1;">
                <i class="fas fa-newspaper"></i>
                <h3>No posts yet</h3>
                <p>Be the first to share your thoughts!</p>
            </div>
        `;
        return;
    }

    posts.forEach(post => {
        const isCurrentUser = post.user_id === currentUser?.id;
        const userName = post.user_name || 'User';
        const truncatedContent = truncateText(post.content, 4);
        const isTruncated = post.content.split('\n').length > 4 || post.content.length > 200;

        postsGrid.innerHTML += `
            <div class="post-card" data-post-id="${post.id}">
                ${post.image_url ? `<img src="${post.image_url}" class="post-image">` : ''}
                <div class="post-content">
                    <span class="post-category">${post.category}</span>
                    <h3 class="post-title">${post.title}</h3>
                    <div class="post-text-container">
                        <p class="post-text">${truncatedContent}</p>
                        ${isTruncated ? `
                            <button class="read-more-btn" data-post-id="${post.id}">
                                Read More
                            </button>
                        ` : ''}
                    </div>
                    <div class="post-footer">
                        <div class="post-author">
                            <span class="user-name">@${userName}</span>
                            <span class="post-time">${formatDate(post.created_at)}</span>
                        </div>
                        ${isCurrentUser ? `
                            <div class="post-actions">
                                <button class="btn-edit" data-post-id="${post.id}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    // Add event listeners for Read More buttons
    document.querySelectorAll('.read-more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = btn.dataset.postId;
            showFullPost(postId);
        });
    });

    // Add event listeners for Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = btn.dataset.postId;
            loadPostForEdit(postId);
        });
    });

    // Make entire post card clickable
    document.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on buttons inside
            if (e.target.closest('button')) return;
            
            const postId = card.dataset.postId;
            showFullPost(postId);
        });
    });
}

// Show full post modal
function showFullPost(postId) {
    const post = allPostsData.find(p => p.id === postId);
    if (!post) return;

    const fullPostModal = document.createElement('div');
    fullPostModal.className = 'modal';
    fullPostModal.id = 'fullPostModal';
    fullPostModal.style.display = 'flex';
    
    const userName = post.user_name || 'User';
    
    fullPostModal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #00e6e6; margin: 0;">${post.title}</h2>
                <button onclick="document.getElementById('fullPostModal').remove()" 
                        style="background: none; border: none; color: #00e6e6; font-size: 24px; cursor: pointer;">
                    ×
                </button>
            </div>
            
            ${post.image_url ? `
                <img src="${post.image_url}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 10px; margin-bottom: 20px; border: 2px solid #00e6e6;">
            ` : ''}
            
            <div style="margin-bottom: 20px; display: flex; gap: 15px; align-items: center;">
                <span class="post-category" style="display: inline-block;">${post.category}</span>
                <span style="color: #00e6e6; font-weight: 600;">@${userName}</span>
                <span style="color: #aaa;">${formatDate(post.created_at)}</span>
            </div>
            
            <div class="full-post-content" style="
                padding: 20px;
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
                border: 1px solid rgba(0,230,230,0.3);
                max-height: 400px;
                overflow-y: auto;
                line-height: 1.6;
                color: #ddd;
                white-space: pre-wrap;
            ">
                ${post.content}
            </div>
        </div>
    `;
    
    document.body.appendChild(fullPostModal);
    
    // Close modal when clicking outside
    fullPostModal.addEventListener('click', (e) => {
        if (e.target === fullPostModal) {
            fullPostModal.remove();
        }
    });
}

// Date format
function formatDate(dateString) {
    const diff = Date.now() - new Date(dateString);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

// Load post for edit
async function loadPostForEdit(postId) {
    const { data: post } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (!post) return;

    document.getElementById('postId').value = post.id;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postCategory').value = post.category;
    document.getElementById('postContent').value = post.content;
    document.getElementById('imagePreview').innerHTML = post.image_url
        ? `<img src="${post.image_url}">`
        : '';

    document.getElementById('modalTitle').textContent = 'Edit Post';
    document.getElementById('submitBtnText').textContent = 'Update Post';
    document.getElementById('deletePostBtn').style.display = 'block';
    document.getElementById('postModal').style.display = 'flex';
}

// Category navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.dataset.category;
        
        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Load posts for category
        loadPosts(category);
    });
});

// Init
(async function init() {
    await checkAuth();
    loadPosts();

    supabase
        .channel('posts-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts)
        .subscribe();
})();