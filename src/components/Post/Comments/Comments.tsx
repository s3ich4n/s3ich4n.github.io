/**
 * 게시글의 Utterances 위젯을 담당하는 컴포넌트
 *
 * @created     2022-09-25 04:23:10
 * @modified    2022-09-25 04:23:10
 * @author      s3ich4n
 */

import React, { createRef, useLayoutEffect } from "react";

const src = "https://utteranc.es/client.js";
const repo = "s3ich4n/s3ich4n.github.io";
const theme = "dark-blue";

const Utterances: React.FC = () => {
  const containerRef = createRef<HTMLDivElement>();

  useLayoutEffect(() => {
    const utterances = document.createElement("script");

    const attributes = {
      src,
      repo,
      theme,
      "issue-term": "pathname",
      label: "post-comments",
      crossOrigin: "anonymous",
      async: "true",
    };

    Object.entries(attributes).forEach(([key, value]) => {
      utterances.setAttribute(key, value);
    });

    containerRef.current!.appendChild(utterances);
  }, [repo]);

  return <div ref={containerRef} />;
};

Utterances.displayName = "Utterances";

export default Utterances;
