// @flow strict
import React from 'react';
import { getContactHref } from '../../../utils';
import styles from './Author.module.scss';
import { useSiteMetadata } from '../../../hooks';

const Author = () => {
  const { author } = useSiteMetadata();

  return (
    <div className={styles['author']}>
      Die Grenzen meiner Sprache bedeuten die Grenzen meinen Welt. - Ludwig Wittgenstein
    </div>
  );
};

export default Author;
