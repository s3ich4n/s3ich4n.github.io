const path = require('path');
const { createFilePath } = require('gatsby-source-filesystem');

// Setup Import Alias
exports.onCreateWebpackConfig = ({ getConfig, actions }) => {
  const output = getConfig().output || {};

  actions.setWebpackConfig({
    output,
    resolve: {
      alias: {
        components: path.resolve(__dirname, 'src/components'),
        utils: path.resolve(__dirname, 'src/utils'),
        hooks: path.resolve(__dirname, 'src/hooks'),
      },
    },
  });
};

// 모든 포스트에 slug 값을 추가
exports.onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `MarkdownRemark`) {
    const slug = createFilePath({ node, getNode });

    createNodeField({ node, name: 'slug', value: slug });
  }
};

/**
 * 마크다운 데이터로부터 포스트 페이지를 생성
 * 
 * 
 * path 라이브러리를 통해 템플릿 컴포넌트를 불러온 후, 
 * slug 데이터를 통해 페이지를 생성해주는 함수인 generatePostPage 함수를 작성해주었습니다.
 * 
 * 해당 함수에서는 Gatsby API인 createPage 함수가 사용되었는데, pageOptions 객체의 형식으로 인자를 받습니다.
 * 경로는 slug 데이터를 그대로 넘겨주었고,
 * 해당 페이지에서 사용할 컴포넌트로 위에서 불러온 템플릿 컴포넌트를 전달해주었습니다.
 * 
 * 마지막으로 context라는 이름으로 slug를 넣어주었는데,
 * 이 데이터는 템플릿 컴포넌트에서 Props로 받을 수 있을 뿐 아니라
 * 해당 컴포넌트에서 사용할 GraphQL Query의 파라미터로도 받을 수 있기 때문에
 * 이 데이터를 통해 Slug에 맞는 마크다운 데이터를 불러올 것입니다.
 * 
 * 그리고 Query를 통해 불러온 데이터 모두
 * 위에서 정의한 페이지 생성 함수를 통해 게시글 페이지를 생성해주었습니다.
 */
exports.createPages = async ({ actions, graphql, reporter }) => {
  const { createPage } = actions;

  // 페이지를 뿌려주기 위해 마크다운 파일을 모두 가져움
  const queryAllMarkdownData = await graphql(
    `
      {
        allMarkdownRemark(
          sort: {
            order: DESC
            fields: [frontmatter___date, frontmatter___title]
          }
        ) {
          edges {
            node {
              fields {
                slug
              }
            }
          }
        }
      }
    `
  );

  // GraphQL 쿼리 에러 처리로직
  if (queryAllMarkdownData.errors) {
    reporter.panicOnBuild(`[exports.createPages] ERROR while running query`)
    return;
  }

  // 포스트 템플릿 컴포넌트를 가져옴
  const PostTemplateComponent = path.resolve(
    __dirname,
    'src/templates/PostTemplate.tsx',
  );

  // 페이지 생성 로직
  const generatePostPage = ({
    node: {
      fields: { slug },
    },
  }) => {
    const pageOptions = {
      path: slug,
      component: PostTemplateComponent,
      context: { slug },
    };

    createPage(pageOptions);
  };

  // 포스트 페이지를 생성하고 쿼리에 필요한 slug props를 전달함
  queryAllMarkdownData.data.allMarkdownRemark.edges.forEach(generatePostPage);
};
