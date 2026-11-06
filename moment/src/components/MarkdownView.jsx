import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// raw HTML 은 렌더하지 않습니다(react-markdown 기본값). URL 도 기본 sanitize 를 따릅니다.
function MarkdownView({ content, className = "" }) {
  return (
    <div className={"markdown-body " + className}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener" />
          ),
          img: ({ node, ...props }) => <img {...props} loading="lazy" alt={props.alt || ""} />,
        }}
      >
        {content || ""}
      </Markdown>
    </div>
  );
}

export default MarkdownView;
