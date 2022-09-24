/**
 * 404 페이지
 *
 * @created     2022-09-25 03:51:13
 * @modified    2022-09-25 03:51:13
 * @author      s3ich4n
 */


import React, { FunctionComponent } from 'react'
import styled from '@emotion/styled'
import { Link } from 'gatsby'

import GlobalStyle from 'components/Common/GlobalStyle'


const NotFoundPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
`

const NotFoundText = styled.div`
  font-size: 150px;
  font-weight: 800;

  @media (max-width: 768px) {
    font-size: 100px;
  }
`

const NotFoundDescription = styled.div`
  font-size: 25px;
  text-align: center;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`

const GoToMainButton = styled(Link)`
  margin-top: 30px;
  font-size: 20px;
  text-decoration: underline;

  &:hover {
    text-decoration: underline;
  }
`

const NotFoundPage: FunctionComponent = function () {
  return (
    <NotFoundPageWrapper>
      <GlobalStyle />
      <NotFoundText>404</NotFoundText>
      <NotFoundDescription>
        요청하신 게시글이 존재하지 않습니다. <br />
      </NotFoundDescription>
      <GoToMainButton to="/">메인 페이지로</GoToMainButton>
    </NotFoundPageWrapper>
  )
}

export default NotFoundPage
