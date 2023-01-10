---
title: "HTTP의 인증에 대해 (2) 인증으로 JWT를 쓰는게 맞나?"
date: "2022-05-05T22:52:00.000Z"
template: "post"
draft: false
slug: "/devlog/backend/2022-10-05-considering-http-authn-pt02"
category: "devlog"
tags:
  - "backend"
description: "JWT의 사용방안과, 세션 쿠키처럼 사용하는 JWT 토큰 사용방식이 과연 타당한 쓰임새인지 살펴봅시다."
socialImage: "./media/domado.jpg"
---

이 시리즈에서는 HTTP의 인증(Authentication) 중 일부에 대해 다룹니다.

이번 글에서는 JWT가 인증에서는 어떻게 쓰이며 인가에서는 어떻게 쓰이는지, JWT를 제대로 이해하고 사용하기 위한 방안에 대해 살펴보겠습니다.

# 목차

- [HTTP의 인증에 대해 (1)](https://blog.s3ich4n.me/devlog/backend/2022-10-05-considering-http-authn-pt01)
- HTTP의 인증에 대해 (2)

# JWT의 사용방안

JWT는 일반적으로 인증, 인가에 필요한 정보를 담는 도구로써 사용됩니다.

- 인증서버와 다른 서비스 서버를 각각 분리하여 운용할 수 있습니다(Single sign-on)
  - OAuth 2.0 **인가** 용 Bearer Token으로, OpenID Connect(이하 OIDC) **인증** 의 Bearer Token으로 쓰일 수 있습니다.
    - OAuth 2.0의 Authorization Code Grant 플로우 중 Access Token과 Refresh Token을 리턴하는 시접에서 이 토큰들을 JWT로 전달할 수 있습니다.
      - 이 토큰에는 **인가 정보**를 담는 것이 목표입니다. 그런 이유로 이 토큰을 사용하여 **인증으로 오용하지 않아야**합니다. [관련 링크](https://oauth.net/articles/authentication/)를 반드시 일독하시길 권장합니다.
      - 다시말해, OAuth 2.0으로는 권한부여에 집중해야 한다는 의미가 되겠습니다. (상기 관련링크를 누르면 _OAuth 2.0 is not an authentication protocol._ 이란 말이 바로 나오는군요...)
    - OIDC는 OAuth 2.0을 통해 만들어진 **인증** 레이어 입니다.
      - 유저 인증을 위한 값으로 `id_token` 이 추가되었으며, 이 값이 JWT 형식입니다.
      - OIDC 의 인증, 인가 시점에서의 다양한 response 대해서는 [이 글](https://darutk.medium.com/diagrams-of-all-the-openid-connect-flows-6968e3990660)을 읽어보시면 좋습니다.
- OAuth 2.0과 OIDC의 차이점 및 오용방지를 위한 정보에 대해서는 [이 링크](https://gruuuuu.github.io/security/ssofriends/)에 정말 자세히 설명되어 있습니다.

간략히 정리하자면 인증과 인가의 요소로서 JWT 토큰을 전달하여 사용할 수 있습니다. 이런 탓에, 상호간 신뢰할 수 있는 서비스들 간 데이터를 주고받는 식의 시나리오에서는 매우 유용하게 쓰일 수 있지만, 잘못쓰기 매우 쉽다는 단점이 있습니다.

## 기존 설명들하고 좀 다른데요?

사실 그래서 준비했습니다. JWT를 도입하고자 연구할 때, 흔히 맞닥뜨리는 여러 실수들(pitfalls)에 대해 바로잡고, JWT를 보다 상황에 맞도록 쓸 수 있게 논의하려고 합니다.

# JWT에 대한 오해를 바로잡읍시다

아래와 같은 세션으로 나누어 작성하고자 합니다

1. 문서 전반에 사용될 개념정리
1. JWT에 대한 오해 바로잡기
1. JWT를 오해함으로 인해 발생하는 문제

## 개념정리

아래에 걸쳐 사용할 개념정리를 하고 갑시다

### 개념정리 (1) 쿠키 vs. JWT를 비교하는게 맞냐?

세션을 담는 쿠키와 JWT는 비교대상이 아닙니다. 완전 다르기 때문에 둘을 비교하는 것은 의미가 없습니다. 세션과 JWT, 그리고 쿠키와 LocalStorage를 비교하는 것이 의미있습니다.

### 개념정리 (2)

- stateless JWT: 세션 데이터가 담긴 JWT 토큰. 인코딩하면 바로 토큰 되는 케이스.
- stateful JWT: 세션을 가리키는 레퍼런스나 ID가 담긴 JWT 토큰. 세션 자체는 서버에 있음 (얘는 암호학적으로 사인되어있어요)
- session token/cookie: 통상의 세션 ID. 여느 웹 프레임워크에 있는 그것을 의미합니다. (얘는 평문이에요)
- LocalStorage
  - 자바스크립트 API입니다.
  - 유저가 브라우저에 자바스크립트만 접근가능한 값을 저장할 수 있게 합니다.
  - 세션 스토리지라고 부르기도 합니다.
  - 쿠키를 사용해 세션 데이터를 저장하는 것의 대체제로 많이 인식되지요.

## JWT에 대한 오해

인터넷에 흔히 JWT로 로그인하는 방식을 구현하는 게시글은 아래와 같이 작성되어 있습니다.

1. credential 정보를 가지고 로그인한다.
1. credential 정보가 유효한지 확인하고 JWT 토큰을 생성한다
1. JWT를 담고 리턴한다.
1. 브라우저는 JWT를 LocalStorage에 저장한다.
1. 위에 저장한 토큰을 꺼내와서 다음 요청에 사용한다.

이거 지난 장에서 살펴보던 쿠키와 세션을 이용한 인증방식과 매우 유사하네요 그리고 이러한 방식으로 JWT를 사용했을 때 생기는 함정이(pitfall) 있습니다.

### 훨씬 유연하다?

세션 쿠키를 사용하더라도 똑같이 커스텀 필드를 넣을 수 있습니다. Private Claim names를 쓰는 것 처럼요.

### 스케일-아웃이 쉽다?

- 외부 DB가 별도로 필요없긴 합니다. 이미 정보를 담고있으니까요. 하지만,
  stateful JWT에는 적용하기 어렵습니다. 세션 자체가 서버에 있으니, 여전히 DB 호출을 해야합니다.
- 로그인해서 받아오는 stateful 세션을 쓴다고 해도 스케일-아웃이 가능합니다.
  - 매번 세션 검증을 해야하는 속도를 올리려면? → 캐시를 둡니다.
  - 여러 서버, 여러 클러스터에 대해서도 적용하려면? → sticky session이나 dedicated session storage 확보와 스토리지 클러스터링 등을 통해 얻을 수 있습니다.

### 쓰기 쉽다?

- 글쎄요. 앞단 뒷단 모두 JWT 토큰을 가공하고 사용하는 것, 세션 스토리지에 접근하거나 세션을 관리하고 주는 것 모두 필요합니다.
- JWT 외부 라이브러리를 쓰는 것 만큼, 이미 오랜기간동안 수많은 웹 프레임워크에서 증명되었고 장고에서도 [쓰기 쉽게 구현](https://docs.djangoproject.com/en/4.1/topics/http/sessions/#using-sessions-in-views) 되어있습니다.

### 만료기간을 정해줄 수 있다?

- 세션도 충분히 가능합니다. 위에 첨부한 링크에서 [`set_expiry(value)` 함수](https://docs.djangoproject.com/en/4.1/topics/http/sessions/#django.contrib.sessions.backends.base.SessionBase.set_expiry) 가 정확히 그 역할을 합니다.
  - 세션 관련 [변수들](https://docs.djangoproject.com/en/4.1/ref/settings/#sessions)도 눈여겨 봐야겠죠.

### 보안이 강화되어있다?

- 아니오, 암호화된 서명을 한다고 해서 보안이 강화되는 것은 아닙니다.

- 먼저, HTTPS 통신으로 메시지 자체를 못 보게 하는 것이 우선입니다.
- 쿠키에 제한을 걸어 자바스크립트 코드가 함부로 사용하지 못하게 하는 것이 방법입니다.
- `CSRF`를 웹 프레임워크 수준에서 방어하고, 프론트엔드 파트에 `XSS`를 방어하도록 하는 로직을 작성하도록 요청하는 것이 그 다음입니다.

## JWT를 오해하면 이런 문제가 생깁니다!

### 용량이 훨씬 커진다

- JWT는 기본적으로 크기가 큽니다. 커스텀 필드를 조금 넣었다 하면, 세션보다 훨씬 커집니다.
- 세션이 단순히 32bit의 문자열이라면, JWT는 못해도 그 10배 이상입니다.

### 로그아웃 기능이 사실상 "없다"

- 만료기간 전까지는 사실상 로그아웃 기능이 없다고 봐야합니다. 그리하여 이를 관리하기 위해 revocation list(일종의 만료 세션 리스트)를 따로 관리하면 될텐데, 그러면 기존의 세션 관리와 다를게 없지요. 게다가 용량이 훨씬 큰 토큰이 bandwidth를 잡아먹습니다.

- 그리하여 이런 해결책 또한 제기되었습니다[1]:
  1. 특정 로그아웃 콜을 받으면, 만료기간 전에 revoke 시킨 토큰의 글로벌 리스트를 갖고있습니다.
  1. 로그인 관련 서버가 매븐 해당 리스트에 대해 요청/응답 하지 않고 각 비즈니스 서버에 pub/sub 메커니즘을 통해서 즉각 처리하도록 합니다.

### JWT 스펙 오용(abuse)으로 인한 보안 취약점

- 설정이 잘못되면 아무나 JWT 토큰을 생성할 수 있고, 유저가 다른 유저인 척 하는게 가능합니다.
- Auth0에는 [JWT Validation bypass](https://insomniasec.com/blog/auth0-jwt-validation-bypass) 과 같이, 권한을 무시하고 요청할 수 있는 버그가 있었습니다.
- 그 외에도 [JWT의 각종 취약점](https://infosecwriteups.com/attacks-on-json-web-token-jwt-278a49a1ad2e)에 대한 글을 소개드립니다.

## 정리해보면?

- JWT는 일회용 인증 토큰(single-use authorization token) 으로 쓰는 편이 좋겠습니다.
- JWT 스펙을 살펴보면 다음과 같은 글귀가 나옵니다.

> JSON Web Token (JWT) is a compact, URL-safe means of representing claims to be transferred between two parties.
> (두 당사자 간에 전송되는 클레임을 나타내는 간결한 URL 안전 수단입니다.)
>
> [...] enabling the claims to be digitally signed or integrity protected with a Message Authentication Code (MAC) and/or encrypted.
> (디지털 서명하거나 MAC(메시지 인증 코드) 또는 암호화된 무결성 보호를 가능하게 합니다.)

- 다시말해 "claim"은 마치 명령처럼, 이것 할 수 있다던데 하는 일회성 식별표 정도로 인식하면 될 것 입니다. 그리고 암호화된 서명도 함께요.
- 그런 의미로 제가 참고한 모든 글들을 공통적으로 살펴보면, 세션과 JWT 토큰을 병행해서 쓰거나 각각 용도에 맞게 쓰는 것이 좋겠습니다.
- 제 생각에는 유저 간의 로그인은 세션으로 처리하고, 목표에 따라 잘 분리 된 API 서버간의 통신에서 JWT를 활용하는 것이 어떨까 싶습니다. 예를 들면 다음과 같겠습니다:
  1. 서버-서버 간 JWT를 담고 필요한 요청-응답을 수행해야 한다면 이는 충분히 말이되는 내용이다.
  1. 예를들어 SPA(Single-page Application) 에서 이것저것 많은 API를 호출해야 하고, 그 권한을 토큰을 통해 관리한다면 훨씬 효율적일 것으로 보입니다.

그 정도로 큰 서비스에 대해 다루게 될 때를 위해, 다음번엔 OAuth 2.0과 OIDC 및 [Fedarated identity](https://en.wikipedia.org/wiki/Federated_identity)와 같은 키워드를 알아보는 글을 작성해보겠습니다.

# 마무리

이번 글을 통해, 아래 내용들을 살펴볼 수 있었습니다:

1. JWT를 세션 쿠키처럼 사용하면 아래와 같은 문제가 생깁니다
   1. 오해를 살 수 있는 오판을 하게 됩니다
   1. JWT를 잘못 사용함으로
1. 남들이 쓴다고, 눈에 바로 보이는 장점이 있다고 이해없이 기술을 사용하지 맙시다. 보안과 기능의 장단점과 잠재적 문제사항을 모두 알고 있어야 합니다.'보일러플레이트' 및 템플릿에서 제외하고 기본 선택으로 만들지 마십시오.
1. 기술을 잘못 쓰지 않도록, 많은 케이스를 배워둡시다. 역시 필요에 따라 기술을 택해야겠습니다. 이제야 외국 사람들이 이런 케이스에 대해 논할때면 YMMV(Your mileage may vary)를 왜 달고사는지 어렴풋이 알겠습니다..

읽어주셔서 감사합니다.

---

- References
  - [1] [sidenotes 항목](https://evertpot.com/jwt-is-a-bad-default/) 참조
  - [2] [링크참조](https://developer.okta.com/blog/2017/08/17/why-jwts-suck-as-session-tokens)
  - [3] [링크참조](http://cryto.net/~joepie91/blog/2016/06/13/stop-using-jwt-for-sessions/)
  - [4] [링크참조](https://redis.com/blog/json-web-tokens-jwt-are-dangerous-for-user-sessions/)
  - [5] [링크참조](https://www.youtube.com/watch?v=GdJ0wFi1Jyo)
