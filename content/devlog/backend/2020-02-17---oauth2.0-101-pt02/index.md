---
title: "OAuth 2.0 (2) OAuth 2.0 Provider와 OIDC, 그리고 OAuth 2.0 사용 앱에 대해"
date: "2020-02-17T21:50:00.000Z"
template: "post"
draft: false
slug: "/devlog/backend/2020-02-17-oauth2.0-101-pt02"
category: "devlog"
tags:
  - "backend"
description: ""
socialImage: "./media/.jpg"
---

# OAuth 2.0 provider 학습과정

## Django에는 어떤게 있을까?

1. Django의 [Django OAuth Toolkit](https://django-oauth-toolkit.readthedocs.io/en/latest/) 을 사용하여 개발했다.
2. Django REST Framework(이하 DRE)에 맞게 구현하고 Django의 유저 ID/PW를 기반으로 Authn을 하고, 토큰으로 Authz를 수행하기위해 구상했다.
3. 구현중 다음 문제에 봉착했다
   1. 로그인시 Client ID, Client secert을 가지고 토큰을 요청한다. 이때 아무런 제재없이 두 값을 담는 것은 잠재적인 보안이슈다.
      1. 우리는 클라이언트가 Vue.js같은 웹앱이기 때문에, Client secret 값이 노출될 수 있다.
      2. 이럴 때 PKCE를 도입하여 Client secret 값을 보호하는 것이 필요하다.
         아래의 추후 고려해야할 점에 상세기술한다.
   2. Django OAuth Toolkit의 generate_token() 함수는, Python의 `SystemRandom()` 함수를 통해 30글자를 만들어 리턴한다.
      1. 이를 JWT로 오버라이딩하는데 시간이 걸렸다.
      2. [해당 라이브러리](https://github.com/Humanitec/django-oauth-toolkit-jwt)를 추가하여 전달하는 토큰으로 JWT를 사용하도록 한다.
   3. 또한 OAuth 2.0으로 구현하면, 다른 서비스 (Manager server, API server, API Client, Dashboard 등)들이 모두 수정되어야한다.
4. 따라서 기존 JWT 구현을 그대로 이어가되, _deprecated_ 라이브러리를 _maintained_ 라이브러리로 이전한 후, DRF의 인증 백엔드를 오버라이딩하는 것이 빠르게 구현하는 방법인 것으로 판단했다.

## 다른 부분에 대해 조사한 내용

1. [Authlib](https://github.com/lepture/authlib) 을 가지고 처음부터 구현하는 것은 바퀴를 재발명하는 것 만큼 힘든 짓이다.
2. [Django OIDC Provider](https://github.com/juanifioren/django-oidc-provider) 는 방치되어있어서 아예 Fork하고 새로 구현해야했다.
3. [AWS KMS](https://aws.amazon.com/ko/kms/)가 아닌 [AWS Secrets Master](https://aws.amazon.com/ko/secrets-manager/)를 사용하는 이유는 다음과 같다.

- AWS Secrets Master로 `JWT_SECRET_KEY`나 django의 `SECRET_KEY` 등을 보관할 수 있다.

  - 왜 AWS KMS가 아닌가?

    - KMS 는 데이터 암호화에 쓰이는 암호화 키를 보관한다
      - Customer Master Key(CMK)라 불리는 마스터키로 데이터를 암호화한다.
      - 이 키를 가지고 Plaintext data key, Encrypted data key를 생성한다.
        - Plaintext data key: AWS에 의해 발급되며 암복호화시에 사용된다
        - Encrypted data key: Plaintext data key를 암호화한 키값. 복호화시 plaintext data key를 얻을 때 쓰인다.
    - 지금처럼 `JWT_SECRET_KEY`를 간단하게 저장하기에는 복잡하며, 고도화시 추가하는 것이 옳다고 판단했다.

  - 왜 secrets master인가?

    - k, v형태로 저장되는 secret key들은 AWS의 API를 호출하는 식으로 보관하는 것이 좋다고 판단했다.
    - 참조링크 1: https://sarc.io/index.php/aws/1818-aws-8
    - 참조링크 2: https://aws.amazon.com/ko/secrets-manager/
    - KMS와 함께 쓸 수도 있다.
    - 쓴만큼 금액을 지불한다.
      - 보안 암호당 `$0.40/월`
      - API 호출 `10,000건당 $0.05`

  - 이렇게 적용하면 추가로 해야될 일은 무엇인가?
    - [boto3](https://github.com/boto/boto3) 라이브러리를 MDP에 추가해야 한다
    - AWS API를 호출하기 위한 IAM을 함께 작업해야한다.
      - 이 때 쓸데없는 권한을 주지 않도록 여러번 검토하여 계정을 생성하도록 한다.

## OAuth 2.0 도입 후 개발할 때 고려사항

- OpenID Connect(이하 OIDC)를 커스텀하여 구현하거나, 관련한 라이브러리를 사용하여 OAuth 2.0으로 Authn을 함께 수행하도록 한다.
  - OIDC는 OAuth 2.0에서 Authn을 추가한 확장이다.
  - OAuth 2.0스펙과 크게 다르지 않다. JWT 토큰을 동일하게 사용하되, JWT 토큰의 claim에 어떤 값을 넣을지는 구현하기에 달려있다.
    - claim값은 [OIDC의 core specs](https://openid.net/specs/openid-connect-core-1_0.html#Claims)을 참조하도록 한다.
  - `response_type` 값을 정의하는 것으로 Authn 흐름을 정할 수 있다.

### 보안적 측면

- [PKCE](https://oauth.net/2/pkce/) 를 함께 추가하여(혹은 그러한 코드가 사용할 라이브러리에 있는지 살펴보면서) Authentication을 수행하도록 한다.

  - PKCE를 도입하면, OAuth 2.0 (혹은 이를 추가구현한 OIDC)에서 Client secret 값에 대해 해시 함수를 적용한 Code verifier, 이를 검증할 Code Challenge 과정을 추가하여 Client secret 값을 보호한다.
  - 다음 도식은 PKCE의 논리적인 작동방식이다. 웹앱의 예시코드는 [다음 링크](https://github.com/oktadeveloper/okta-auth-js-pkce-example)를 참조한다.

  ![PKCE explained](../img/MDP-OAuth2.0/04-pkce.png)

- 인증요청시, client_id, client_secret에 대해 3-legged로 사용할 필요가 있다.
  - https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow


# 마무리

이번 글을 통해, 아래 내용들을 살펴볼 수 있었습니다:

1. 

읽어주셔서 감사합니다.

---

- References
  - ..
