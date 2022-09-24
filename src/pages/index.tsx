import React, { FunctionComponent, useMemo } from 'react'
import { graphql } from 'gatsby'
import { IGatsbyImageData } from 'gatsby-plugin-image'
import queryString, { ParsedQuery } from 'query-string'

import CategoryList, { CategoryListProps } from 'components/Main/CategoryList'
import Introduction from 'components/Main/Introduction'
import PostList from 'components/Main/PostList'
import MainTemplate from 'components/Common/MainTemplate'

import { PostListItemType } from 'types/PostItem.types'

type IndexPageProps = {
  location: {
    search: string
  }
  data: {
    site: {
      siteMetadata: {
        title: string
        description: string
        siteUrl: string
      }
    }
    allMarkdownRemark: {
      edges: PostListItemType[]
    }
    file: {
      childImageSharp: {
        gatsbyImageData: IGatsbyImageData
      }
      publicURL: string
    }
  }
}

const IndexPage: FunctionComponent<IndexPageProps> = function ({
  location: { search },
  data: {
    site: {
      siteMetadata: { title, description, siteUrl },
    },
    allMarkdownRemark: { edges },
    file: {
      childImageSharp: { gatsbyImageData },
      publicURL,
    },
  },
}) {
  const parsed: ParsedQuery<string> = queryString.parse(search)
  const selectedCategory: string =
    typeof parsed.category !== 'string' || !parsed.category
      ? 'all'
      : parsed.category

  /**
   * edges 배열로 reduce 메서드를 호출하며
   * 카테고리 목록을 만드는 함수와 이름이 All이고 값이 0인 프로퍼티가 존재하는 객체를
   * 디폴트값으로 넘겨주었습니다.
   *
   * 파라미터로 넘긴 함수에서는 edges 배열의 각 요소 내에 있는 카테고리 값을 추출해내고,
   * 반복문을 통해 객체에 값을 추가해주었습니다.
   *
   * 코드 자체는 어렵지 않으니 코드를 꼼꼼하게 읽어보고 오시는 것도 좋을 것 같습니다.
   * 그리고, 카테고리 목록은 처음 생성 후 바뀌는 경우가 존재하지 않기 때문에
   * useMemo 함수를 통해 감싸줌으로써 불필요하게 재연산되지 않도록 구현했습니다.
   */
  const categoryList = useMemo(
    () =>
      edges.reduce(
        (
          list: CategoryListProps['categoryList'],
          {
            node: {
              frontmatter: { categories },
            },
          }: PostListItemType,
        ) => {
          categories.forEach(categories => {
            if (list[categories] === undefined) list[categories] = 1;
            else list[categories]++;
          });

          list['all']++;

          return list;
        },
        { all: 0 }
      ),
    [],
  )
  return (
    <MainTemplate
      title={title}
      description={description}
      url={siteUrl}
      image={publicURL}
    >
      <Introduction profileImage={gatsbyImageData} />
      <CategoryList
        selectedCategory={selectedCategory}
        categoryList={categoryList}
      />
      <PostList
        selectedCategory={selectedCategory}
        posts={edges}
      />
    </MainTemplate>
  )
}

export default IndexPage

export const getPostList = graphql`
  query getPostList {
    site {
      siteMetadata {
        title
        description
        siteUrl
      }
    }
    allMarkdownRemark(
      sort: { order: DESC, fields: [frontmatter___date, frontmatter___title] }
    ) {
      edges {
        node {
          id
          fields {
            slug
          }
          frontmatter {
            title
            date(formatString: "YYYY-MM-DD")
            categories
            description
            thumbnail {
              childImageSharp {
                gatsbyImageData(width: 768, height: 400)
              }
            }
          }
        }
      }
    }
    file(name: { eq: "profile-image"}) {
      childImageSharp {
        gatsbyImageData(width: 120, height: 120)
      }
      publicURL
    }
  }
`
