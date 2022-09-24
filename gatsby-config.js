module.exports = {
  siteMetadata: {
    title: `s3ich4n's tech blog`,
    description: `s3ich4n의 기술 블로그`,
    author: `@s3ich4n`,
    siteUrl: `https://blog.s3ich4n.me/`,
  },
  //필요한 라이브러리 설치하기


  //위에서 기술한 모든 라이브러리를 아래의 커맨드를 통해 다운로드 받으면 됩니다.

  //yarn add gatsby-transformer-remark gatsby-remark-images gatsby-remark-prismjs prismjs gatsby-remark-smartypants gatsby-remark-copy-linked-files gatsby-remark-external-links
  //yarn add gatsby-plugin-react-helmet react-helmet (이거 빠져있음ㅋㅋㅋㅋ아)
  //yarn add gatsby-plugin-image gatsby-plugin-sharp gatsby-transformer-sharp (gatsby-image가 deprecated 되어서 삭제함)
  //yarn add query-string
  //yarn add @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
  //yarn add @types/react-helmet
  //yarn add gatsby-plugin-canonical-urls
  //yarn add gatsby-plugin-sitemap
  //yarn add gatsby-plugin-robots-txt
  //yarn add gh-pages --dev

  //하지만 Gatsby에서 해당 라이브러리를 사용하기 위해서는 추가적으로 해줘야 할 설정 작업이 존재합니다.
  plugins: [
    {
      resolve: 'gatsby-plugin-typescript',
      options: {
        isTSX: true,
        allExtensions: true,
      },
    },
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `contents`,
        path: `${__dirname}/contents`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/static`,
      },
    },
    `gatsby-plugin-emotion`,
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-plugin-sharp`,
      options: {
        defaults: {
          formats: ['auto', 'webp'],
          quality: 100,
          placeholder: 'blurred',
        }
      }
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: 'gatsby-remark-smartypants',
            options: {
              dashes: 'oldschool',
            },
          },
          {
            resolve: 'gatsby-remark-prismjs',
            options: {
              classPrefix: 'language-',
            },
          },
          {
            resolve: 'gatsby-remark-images',
            options: {
              maxWidth: 768,
              quality: 100,
              withWebp: true,
            },
          },
          {
            resolve: 'gatsby-remark-copy-linked-files',
            options: {},
          },
          {
            resolve: 'gatsby-remark-external-links',
            options: {
              target: '_blank',
              rel: 'nofollow',
            },
          },
        ],
      },
    },
    {
      resolve: 'gatsby-plugin-canonical-urls',
      options: {
        siteUrl: 'https://blog.s3ich4n.me/',
        stripQueryString: true,
      },
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: 'gatsby-plugin-robots-txt',
      options: {
        policy: [{ userAgent: '*', allow: '/' }],
      },
    },
  ],
}
