/**
 * 공통적으로 사용되는 타입 정의
 * 
 * @created     2022-09-25 03:58:05
 * @modified    2022-09-25 03:58:05
 * @author      s3ich4n
 */


import { IGatsbyImageData } from "gatsby-plugin-image"

export type PostFrontmatterType = {
  title: string
  date: string
  description: string
  categories: string[]
  thumbnail: {
    childImageSharp: {
      gatsbyImageData: IGatsbyImageData
    }
    publicURL: string
  }
}

export type PostListItemType = {
  node: {
    id: string
    fields: {
      slug: string
    }
    frontmatter: PostFrontmatterType
  }
}

export type PostPageItemType = {
  node: {
    html: string
    frontmatter: PostFrontmatterType
  }
}
