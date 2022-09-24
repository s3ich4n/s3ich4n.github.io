/**
 * 게시글 리스트를 표시해주는 컴포넌트
 *
 * @created     2022-09-25 03:42:13
 * @modified    2022-09-25 03:42:13
 * @author      s3ich4n
 */


import React, { FunctionComponent, useMemo } from 'react'
import styled from '@emotion/styled'

import PostItem from 'components/Main/PostItem'
import { PostListItemType } from 'types/PostItem.types'

type PostListProps = {
  selectedCategory: string
  posts: PostListItemType[]
}

const PostListWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 20px;
  width: 768px;
  margin: 0 auto;
  padding: 50px 0 100px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    width: 100%;
    padding: 50px 20px;
  }
`

const PostList: FunctionComponent<PostListProps> = function ({
  selectedCategory,
  posts,
}) {
  /**
   * 여기에서는 Props로 받은 selectedCategory 값을 가지고 있는
   * 포스트 아이템만 필터링하는 기능을 구현해야 하는데,
   * 이를 위해 filter 메서드를 사용하겠습니다.
   */
  const postListData = useMemo(
    () =>
      posts.filter(({ node: { frontmatter: { categories } } }: PostListItemType) =>
        selectedCategory !== 'all'
          ? categories.includes(selectedCategory)
          : true,
      ),
    [selectedCategory],
  )

  return (
    <PostListWrapper>
      {postListData.map(
        ({
          node: {
            id,
            fields: { slug },
            frontmatter
          },
        }: PostListItemType) => (
          <PostItem {...frontmatter} link={slug} key={id} />
        ))}
    </PostListWrapper>
  )
}

export default PostList
