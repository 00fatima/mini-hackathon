async function getPosts() {
  const { data, error } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return alert(error.message);

  const { data: { session } } = await supabaseClient.auth.getSession();
  const userId = session.user.id;

  const postsDiv = document.getElementById("posts");
  postsDiv.innerHTML = "";

  data.forEach(post => {
    const isOwner = post.user_id === userId;

    postsDiv.innerHTML += `
      <div class="post-card">
        ${post.image_url ? `<img src="${post.image_url}" class="post-image">` : ""}
        <div class="post-title">${post.title}</div>
        <div class="post-category">${post.category}</div>
        <div class="post-content">${post.content}</div>

        ${isOwner ? `
          <div class="post-actions">
            <button class="post-btn delete-btn" onclick="deletePost('${post.id}')">Delete</button>
          </div>
        ` : ""}
      </div>
    `;
  });
}

async function createPost() {
  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;
  const category = document.getElementById("category").value;
  const imageFile = document.getElementById("image").files[0];

  if (!title || !content || !category) {
    alert("All fields required");
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  let imageUrl = "";

  if (imageFile) {
    const fileName = `${Date.now()}-${imageFile.name}`;

    const { error } = await supabaseClient
      .storage
      .from("post-images")
      .upload(fileName, imageFile);

    if (error) return alert(error.message);

    imageUrl = `${SUPABASE_URL}/storage/v1/object/public/post-images/${fileName}`;
  }

  const { error } = await supabaseClient.from("posts").insert({
    title,
    content,
    category,
    image_url: imageUrl,
    user_id: session.user.id
  });

  if (error) {
    alert(error.message);
  } else {
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
    document.getElementById("category").value = "";
    document.getElementById("image").value = "";
    getPosts();
  }
}

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;

  const { error } = await supabaseClient
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) alert(error.message);
  else getPosts();
}
