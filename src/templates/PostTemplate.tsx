/**
 * 게시글에 대한 페이지 템플릿 파일
 *
 * @created     2022-09-25 03:08:05
 * @modified    2022-09-25 03:08:05
 * @author      s3ich4n
 */

import React, { FunctionComponent } from 'react'
import { graphql } from 'gatsby'

import { PostPageItemType } from 'types/PostItem.types'
import MainTemplate from 'components/Common/MainTemplate'

import PostHead from 'components/Post/PostHead'
import PostContent from 'components/Post/PostContent'
import CommentWidget from 'components/Post/CommentWidget'

type PostTemplateProps = {
  data: {
    allMarkdownRemark: {
      edges: PostPageItemType[]
    }
  }
  location: {
    href: string
  }
}

const PostTemplate: FunctionComponent<PostTemplateProps> = function ({
  data: {
    allMarkdownRemark: { edges },
  },
  location: { href },
}) {
  const {
    node: {
      html,
      frontmatter: {
        title,
        date,
        description,
        categories,
        thumbnail: {
          childImageSharp: { gatsbyImageData },
          publicURL,
        },
      },
    },
  } = edges[0]

  return (
    <MainTemplate
      title={title}
      description={description}
      url={href}
      image={publicURL}
    >
      <PostHead
        title={title}
        date={date}
        categories={categories}
        thumbnail={gatsbyImageData}
      />
      <PostContent
        html={html}
      />
      <CommentWidget
      />
    </MainTemplate>
  )
}

export default PostTemplate

export const queryMarkdownDataBySlug = graphql`
  query queryMarkdownDataBySlug($slug: String) {
    allMarkdownRemark(filter: { fields: { slug: { eq: $slug } } }) {
      edges {
        node {
          html
          frontmatter {
            title
            date
            description
            categories
            thumbnail {
              childImageSharp {
                gatsbyImageData
              }
            }
          }
        }
      }
    }
  }
`
