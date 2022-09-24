/**
 * 게시글의 헤더 전체를 감싸는 컴포넌트
 *
 * @created     2022-09-25 03:42:13
 * @modified    2022-09-25 03:42:13
 * @author      s3ich4n
 */

import React, { FunctionComponent } from 'react'
import styled from '@emotion/styled'
import { GatsbyImage, IGatsbyImageData } from 'gatsby-plugin-image'
import PostHeadInfo, { PostHeadInfoProps } from 'components/Post/PostHeadInfo'

type GatsbyImgProps = {
  image: IGatsbyImageData
  alt: string
  className?: string
}

type PostHeadProps = PostHeadInfoProps & {
  thumbnail: IGatsbyImageData
}

const PostHeadWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 400px;

  @media (max-width: 768px) {
    height: 300px;
  }
`

/**
 * 여기서 BackgroundImage 컴포넌트를 확인해보면,
 * styled(GatsbyImage) 과 같이 넘기지 않고
 * 함수 내부에서 props를 받아 스타일과 함께 GatsbyImage 컴포넌트에 넘겨주도록 구현했습니다.
 * 
 * 인라인으로 정의된 스타일을 컴포넌트 스타일과 같이 작성해주고,
 * 윗 문장과 같이 간단하게 구현할 수 있었을 것 같은데 그렇게 구현하지 않은 이유는 무엇일까요?
 * 
 * 바로 gatsby-plugin-image 라이브러리에서 제공해주는 GatsbyImage 컴포넌트에는
 * 기본적으로 적용되어있는 인라인 스타일이 존재하는데,
 * 인라인 스타일은 !important 속성이 없으면 스타일 적용 순위에서 밀리기 때문입니다.
 * 
 * 하지만 !important 속성은 가능한 사용하지 말아야 하는 속성이기 때문에
 * 위의 코드와 같이 직접 인라인으로 포지션 스타일을 넘겨주었습니다.
 */
const BackgroundImage = styled((props: GatsbyImgProps) => (
  <GatsbyImage {...props} style={{ position: 'absolute' }} />
))`
  z-index: -1;
  width: 100%;
  height: 400px;
  object-fit: cover;
  filter: brightness(0.25);

  @media (max-width: 768px) {
    height: 300px;
  }
`

const PostHead: FunctionComponent<PostHeadProps> = function ({
  title,
  date,
  categories,
  thumbnail,
}) {
  return (
    <PostHeadWrapper>
      <BackgroundImage
        image={thumbnail}
        alt="thumbnail"
      />
      <PostHeadInfo
        title={title}
        date={date}
        categories={categories}
      />
    </PostHeadWrapper>
  )
}

export default PostHead
