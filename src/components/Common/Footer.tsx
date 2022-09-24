import React, { FunctionComponent } from 'react'
import styled from '@emotion/styled'

const FooterWrapper = styled.footer`
  display: grid;
  place-items: center;
  margin-top: auto;
  padding: 50px 0;
  font-size: 15px;
  text-align: center;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`

const Footer: FunctionComponent = function () {
  return (
    <FooterWrapper>
      보안이슈 때문에 화딱지나서 직접 만들음.
      <br />Developed since 2022 ~
      <br />Powered by Gatsby
    </FooterWrapper>
  )
}

export default Footer
