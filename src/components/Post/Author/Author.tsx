import React from "react";

import { useSiteMetadata } from "@/hooks";
import { getContactHref } from "@/utils";

import * as styles from "./Author.module.scss";

const Author = () => {
  const { author, subtitle } = useSiteMetadata();

  return (
    <div className={styles.author}>
      <p className={subtitle}>{subtitle}</p>
      <p className={styles.bio}>
        {author.bio}
        <a
          className={styles.twitter}
          href={getContactHref("twitter", author.contacts.twitter)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <strong>{author.name}</strong> on Twitter
        </a>
      </p>
    </div>
  );
};

export default Author;
