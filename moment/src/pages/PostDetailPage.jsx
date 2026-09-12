import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { supabase } from "../lib/supabase";
import { fetchPost } from "../api/posts";
import { fetchComments, addComment } from "../api/comments";

function PostDetailPage({ user }) {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    async function load() {
      const [postData, commentData] = await Promise.all([
        fetchPost(id),
        fetchComments(id),
      ]);
      setPost(postData);
      setComments(commentData);
    }
    load();

    // 이 글의 댓글만 실시간 구독
    const channel = supabase
      .channel(`comments-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${id}`,
        },
        async () => setComments(await fetchComments(id))
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await addComment({ postId: id, content: text, user });
    setText(""); // 입력칸만 비우면, 목록은 구독이 갱신해 준다
  }

  if (!post) return <p className="loading">불러오는 중…</p>;

  return (
    <div className="detail">
      <Link to="/" className="back">← 피드로 돌아가기</Link>

      <article className="card">
        <div className="card-head">
          <strong>{post.username}</strong>
        </div>
        <p className="card-body">{post.content}</p>
        {post.image_url && (
          <img className="card-image" src={post.image_url} alt="첨부 사진" />
        )}
      </article>

      <section className="comments">
        <h3>댓글 {comments.length}</h3>
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <strong>{c.username}</strong> {c.content}
          </div>
        ))}

        {user && (
          <form onSubmit={handleSubmit} className="comment-form">
            <input
              placeholder="댓글을 입력하세요"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit">등록</button>
          </form>
        )}
      </section>
    </div>
  );
}

export default PostDetailPage;
