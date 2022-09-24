/**
 * 게시글의 Utterances 위젯을 담당하는 컴포넌트
 *
 * @created     2022-09-25 04:23:10
 * @modified    2022-09-25 04:23:10
 * @author      s3ich4n
 */


import React, { createRef, FunctionComponent, useEffect } from 'react'
import styled from '@emotion/styled'

const src = 'https://utteranc.es/client.js'
const repo = 's3ich4n/s3ich4n.github.io'

type UtterancesAttributesType = {
  src: string
  repo: string
  'issue-term': string
  label: string
  theme: string
  crossorigin: string
  async: string
}

const UtterancesWrapper = styled.div`
  @media (max-width: 768px) {
    padding: 0 20px;
  }
`

/**
 * useEffect Hook을 통해 컴포넌트 마운트 시에 빈 스크립트 태그를 생성해주고,
 * 필요한 속성들을 setAttribute 메서드로 추가해주었습니다.
 * 
 * 그리고 필요한 속성이 추가된 스크립트 태그를
 * appendChild 메서드를 통해 빈 div 태그 내에 추가해주었습니다.
 * 
 * React에서는 이런 방식으로 스크립트 태그를 삽입할 수 있습니다.
 */
const CommentWidget: FunctionComponent = function () {
  const element = createRef<HTMLDivElement>()

  useEffect(() => {
    if (element.current === null) return

    const utterances: HTMLScriptElement = document.createElement('script')

    const attributes: UtterancesAttributesType = {
      src,
      repo,
      'issue-term': 'pathname',
      label: 'Comment',
      theme: `github-light`,
      crossorigin: 'anonymous',
      async: 'true',
    }

    Object.entries(attributes).forEach(([key, value]) => {
      utterances.setAttribute(key, value)
    })

    element.current.appendChild(utterances)
  }, [])

  return <UtterancesWrapper ref={element} />
}

export default CommentWidget
