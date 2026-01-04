import { supabase } from "./config.js";

// DOM Elements
let currentUser = null;

// Check authentication and get user profile
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return null;
    }
    
    currentUser = user;
    
    // Get user's name from metadata or email
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

    // Upload image if exists
    if (imageFile) {
        try {
            const fileName = ${currentUser.id}/${Date.now()}_${imageFile.name};
            const { data, error } = await supabase.storage
                .from('post-images')
                .upload(fileName, imageFile);
            
            if (!error) {
                const { data: urlData } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
            }
        } catch (error) {
            console.error('Image upload error:', error);
        }
    }

    // Prepare post data
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
        // Update existing post
        result = await supabase
            .from('posts')
            .update(postData)
            .eq('id', postId)
            .eq('user_id', currentUser.id);
    } else {
        // Create new post
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
document.getElementById('postImage').addEventListener('change', function(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    if (this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// Load and Display Posts - NO LOADER VERSION
async function loadPosts(category = 'all') {
    const postsGrid = document.getElementById('postsGrid');
    
    // Show empty state immediately
    postsGrid.innerHTML = `
        <div class="no-posts" id="emptyState">
            <i class="fas fa-newspaper fa-3x"></i>
            <h3>Loading posts...</h3>
        </div>
    `;

    let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (category !== 'all') {
        query = query.eq('category', category);
    }

    const { data: posts, error } = await query;

    if (error) {
        postsGrid.innerHTML = '<div class="error">Error loading posts. Please refresh.</div>';
        console.error('Error:', error);
        return;
    }

    if (posts.length === 0) {
        postsGrid.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-newspaper fa-3x"></i>
                <h3>No posts yet</h3>
                <p>Be the first to create a post!</p>
                <button id="createFirstPost" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Create Your First Post
                </button>
            </div>
        `;
        
        // Add event listener for the create button
        document.getElementById('createFirstPost')?.addEventListener('click', () => {
            document.getElementById('createPostBtn').click();
        });
        
        return;
    }

    postsGrid.innerHTML = '';
    posts.forEach(post => {
        const isCurrentUser = currentUser && post.user_id === currentUser.id;
        
        // Get the actual username from post data or current user
        const userName = post.user_name || 
                        (post.user_id === currentUser?.id ? 
                         (currentUser.user_metadata?.name || currentUser.email?.split('@')[0]) : 
                         'User');
        
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        postCard.innerHTML = `
            ${post.image_url ? `
                <img src="${post.image_url}" alt="${post.title}" class="post-image">
            ` : ''}
            <div class="post-content">
                <span class="post-category">${post.category}</span>
                <h3 class="post-title">${post.title}</h3>
                <p class="post-text">${post.content}</p>
                <div class="post-footer">
                    <span class="post-author">
                        <i class="fas fa-user"></i> 
                        ${userName}
                        ${isCurrentUser ? ' (You)' : ''}
                    </span>
                    <span class="post-time">
                        <i class="far fa-clock"></i> 
                        ${formatDate(post.created_at)}
                    </span>
                    <div class="post-actions">
                        ${isCurrentUser ? `
                            <button class="btn btn-secondary edit-post" data-id="${post.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        postsGrid.appendChild(postCard);
    });

    // Add edit event listeners
    document.querySelectorAll('.edit-post').forEach(button => {
        button.addEventListener('click', async (e) => {
            const postId = e.target.closest('button').dataset.id;
            await loadPostForEdit(postId);
        });
    });
}

// Format date function
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
        return ${diffMins}m ago;
    } else if (diffHours < 24) {
        return ${diffHours}h ago;
    } else if (diffDays < 7) {
        return ${diffDays}d ago;
    } else {
        return date.toLocaleDateString();
    }
}

// Load post for editing
async function loadPostForEdit(postId) {
    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (!error && post) {
        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postCategory').value = post.category;
        document.getElementById('postContent').value = post.content;
        
        const preview = document.getElementById('imagePreview');
        if (post.image_url) {
            preview.innerHTML = <img src="${post.image_url}" alt="Current image">;
        } else {
            preview.innerHTML = '';
        }

        document.getElementById('modalTitle').textContent = 'Edit Post';
        document.getElementById('submitBtnText').textContent = 'Update Post';
        document.getElementById('deletePostBtn').style.display = 'block';
        document.getElementById('postModal').style.display = 'flex';
    }
}

// Setup category filtering
function setupCategoryFilter() {
    const categories = ['all', 'Technology', 'Lifestyle', 'Food', 'Travel', 'Education'];
    const container = document.getElementById('categoryTabs');
    
    categories.forEach(category => {
        const tab = document.createElement('div');
        tab.className = category-tab ${category === 'all' ? 'active' : ''};
        tab.textContent = category === 'all' ? 'All Posts' : category;
        tab.dataset.category = category;
        
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadPosts(category);
        });
        
        container.appendChild(tab);
    });

    // Also handle nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            loadPosts(category);
        });
    });
}

// Initialize
async function init() {
    await checkAuth();
    setupCategoryFilter();
    loadPosts();

    // Setup real-time updates
    supabase
        .channel('posts-channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'posts' }, 
            () => {
                loadPosts();
            }
        )
        .subscribe();
}

// Start the app
init();