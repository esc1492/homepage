import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// raw HTML 은 렌더하지 않습니다(react-markdown 기본값). URL 도 기본 sanitize 를 따릅니다.
// remarkBreaks: 마크다운 기본값에서는 한 번 누른 엔터가 공백으로 접힙니다(soft break).
// 글쓰기에서 엔터로 줄을 바꾸는 사람이 대부분이므로 한 번의 개행을 <br> 로 렌더합니다.
function MarkdownView({ content, className = "" }) {
  return (
    <div className={"markdown-body " + className}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
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
