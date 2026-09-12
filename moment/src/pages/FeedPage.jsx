import { useState, useEffect } from "react";
import { Link } from "react-router";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import NewPostForm from "../components/NewPostForm";
import { fetchPosts, createPost, deletePost, uploadImage } from "../api/posts";
import { fetchLikeCounts } from "../api/likes";

function FeedPage({ user }) {
  const [posts, setPosts] = useState([]);
  const [likeCounts, setLikeCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [postData, counts] = await Promise.all([
          fetchPosts(),
          fetchLikeCounts(),
        ]);
        setPosts(postData);
        setLikeCounts(counts);
      } catch (e) {
        console.error("불러오기 실패:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();

    // 좋아요 테이블 변화를 실시간 구독
    const channel = supabase
      .channel("likes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        async () => {
          const counts = await fetchLikeCounts();
          setLikeCounts(counts);
        }
      )
      .subscribe();

    // 정리: 페이지를 떠날 때 구독 해제
    return () => supabase.removeChannel(channel);
  }, []);

  async function handleAdd(content, file) {
    let imageUrl = null;
    if (file) {
      imageUrl = await uploadImage(file, user.id); // 사진 먼저 업로드
    }
    const newPost = await createPost({ content, imageUrl, user });
    setPosts([newPost, ...posts]); // 화면 맨 위에 바로 반영
  }

  async function handleDelete(id) {
    await deletePost(id);
    setPosts(posts.filter((p) => p.id !== id)); // 화면에서도 제거
  }

  return (
    <>
      <NewPostForm onAdd={handleAdd} />
      <main>
        {loading ? (
          <p className="loading">불러오는 중…</p>
        ) : posts.length === 0 ? (
          <p className="empty">아직 글이 없어요. 첫 글을 남겨보세요!</p>
        ) : (
          posts.map((post) => (
            <Link key={post.id} to={`/posts/${post.id}`} className="card-link">
              <PostCard
                post={post}
                user={user}
                count={likeCounts[post.id] ?? 0}
                onDelete={handleDelete}
              />
            </Link>
          ))
        )}
      </main>
    </>
  );
}

export default FeedPage;
